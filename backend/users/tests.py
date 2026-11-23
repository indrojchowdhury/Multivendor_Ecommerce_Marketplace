from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import User

PASSWORD = "StrongPass123!"


class AuthApiTests(APITestCase):
    def setUp(self):
        cache.clear()

        self.register_url = reverse("register")
        self.login_url = reverse("login")
        self.refresh_url = reverse("token-refresh")
        self.logout_url = reverse("logout")
        self.me_url = reverse("me")
        self.change_password_url = reverse("change-password")

        self.payload = {
            "full_name": "Test User",
            "email": "test@example.com",
            "password": PASSWORD,
        }

    def register(self, **overrides):
        payload = {**self.payload, **overrides}
        return self.client.post(self.register_url, payload, format="json")

    def login(self, email="test@example.com", password=PASSWORD):
        return self.client.post(
            self.login_url, {"email": email, "password": password}, format="json"
        )

    def authenticate(self):
        self.register()
        access = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_register_creates_customer_and_returns_tokens(self):
        response = self.register()

        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "customer")
        self.assertEqual(response.data["user"]["company_name"], "")
        self.assertTrue(User.objects.filter(email="test@example.com").exists())

    def test_register_allows_seller_role(self):
        response = self.register(role="seller", company_name="Test Store")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["role"], "seller")
        self.assertFalse(response.data["user"]["seller_approved"])
        self.assertEqual(response.data["user"]["company_name"], "Test Store")

    def test_pending_seller_cannot_use_seller_api(self):
        response = self.register(role="seller", company_name="Test Store")
        seller = User.objects.get(email="test@example.com")
        self.client.force_authenticate(user=seller)

        dashboard = self.client.get(reverse("seller-dashboard"))

        self.assertEqual(response.status_code, 201)
        self.assertEqual(dashboard.status_code, 403)
        self.assertIn("awaiting admin approval", dashboard.data["detail"])

    def test_admin_can_approve_seller_and_manage_customer_account(self):
        seller = User.objects.create_user(
            email="seller@example.com",
            password=PASSWORD,
            full_name="Seller",
            company_name="Seller Store",
            role=User.Role.SELLER,
            seller_approved=False,
        )
        customer = User.objects.create_user(
            email="customer@example.com",
            password=PASSWORD,
            full_name="Customer",
        )
        admin = User.objects.create_user(
            email="admin@example.com",
            password=PASSWORD,
            full_name="Admin",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=admin)

        dashboard = self.client.get(reverse("admin-dashboard"))
        approval = self.client.patch(
            reverse("admin-user-detail", args=[seller.id]),
            {"seller_approved": True},
            format="json",
        )
        disable = self.client.patch(
            reverse("admin-user-detail", args=[customer.id]),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data["pendingSellers"], 1)
        self.assertEqual(approval.status_code, 200)
        self.assertTrue(approval.data["seller_approved"])
        self.assertEqual(disable.status_code, 200)
        self.assertFalse(disable.data["is_active"])

    def test_non_admin_cannot_access_admin_dashboard(self):
        self.authenticate()

        response = self.client.get(reverse("admin-dashboard"))

        self.assertEqual(response.status_code, 403)

    def test_seller_registration_requires_company_name(self):
        response = self.register(role="seller")

        self.assertEqual(response.status_code, 400)
        self.assertIn("company_name", response.data)

    def test_register_rejects_admin_role(self):
        response = self.register(role="admin")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email="test@example.com").exists())

    def test_register_rejects_duplicate_email_case_insensitively(self):
        self.register()
        response = self.register(email="TEST@example.com")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_register_rejects_weak_password(self):
        response = self.register(password="weak")

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_login_with_email_is_case_insensitive(self):
        self.register()
        response = self.login(email="TEST@EXAMPLE.COM")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "test@example.com")

    def test_seller_and_admin_can_sign_in(self):
        seller = self.register(role="seller", company_name="Test Store")
        self.assertEqual(seller.status_code, 201)
        seller_login = self.login()
        self.assertEqual(seller_login.status_code, 200)
        self.assertEqual(seller_login.data["user"]["role"], "seller")

        User.objects.create_superuser(
            email="admin@example.com",
            password=PASSWORD,
            full_name="Admin",
        )
        admin_login = self.login(email="admin@example.com")
        self.assertEqual(admin_login.status_code, 200)
        self.assertEqual(admin_login.data["user"]["role"], "admin")

    def test_login_with_wrong_password_fails(self):
        self.register()
        response = self.login(password="wrong-password")

        self.assertEqual(response.status_code, 401)

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 401)

    def test_me_returns_profile_and_only_allows_name_changes(self):
        self.authenticate()

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "test@example.com")

        response = self.client.patch(
            self.me_url,
            {
                "full_name": "New Name",
                "role": "admin",
                "email": "other@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "New Name")
        self.assertEqual(response.data["role"], "customer")
        self.assertEqual(response.data["email"], "test@example.com")

    def test_seller_can_update_store_shipping_and_safe_payout_settings(self):
        seller = User.objects.create_user(
            email="seller@example.com",
            password=PASSWORD,
            full_name="Seller",
            company_name="Seller Store",
            role=User.Role.SELLER,
        )
        self.client.force_authenticate(user=seller)

        response = self.client.patch(
            self.me_url,
            {
                "company_name": "Updated Store",
                "company_description": "Local electronics seller",
                "contact_phone": "01712345678",
                "business_address": "Dhaka, Bangladesh",
                "shipping_policy": "Delivery within three days.",
                "shipping_fee": "85.00",
                "payout_method": "bKash",
                "payout_reference": "0171****678",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "Updated Store")
        self.assertEqual(response.data["company_description"], "Local electronics seller")
        self.assertEqual(response.data["shipping_fee"], "85.00")
        self.assertEqual(response.data["payout_method"], "bKash")
        seller.refresh_from_db()
        self.assertEqual(seller.payout_reference, "0171****678")

    def test_non_seller_cannot_update_store_settings(self):
        self.authenticate()

        response = self.client.patch(
            self.me_url,
            {"payout_method": "Nagad"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Store settings are only available", str(response.data))

    def test_seller_settings_validate_shipping_fee_and_payout_method(self):
        seller = User.objects.create_user(
            email="seller@example.com",
            password=PASSWORD,
            full_name="Seller",
            company_name="Seller Store",
            role=User.Role.SELLER,
        )
        self.client.force_authenticate(user=seller)

        for payload in (
            {"shipping_fee": "-1"},
            {"payout_method": "Unsupported"},
        ):
            response = self.client.patch(self.me_url, payload, format="json")
            self.assertEqual(response.status_code, 400)

    def test_logout_blacklists_refresh_token(self):
        self.register()
        refresh = self.login().data["refresh"]

        response = self.client.post(self.logout_url, {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 204)

        response = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_change_password(self):
        self.authenticate()
        new_password = "AnotherStrong456!"

        response = self.client.post(
            self.change_password_url,
            {"old_password": "wrong-old-password", "new_password": new_password},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            self.change_password_url,
            {"old_password": PASSWORD, "new_password": new_password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.client.credentials()
        self.assertEqual(
            self.login(email="test@example.com", password=new_password).status_code,
            200,
        )
        self.assertEqual(
            self.login(email="test@example.com", password=PASSWORD).status_code,
            401,
        )
