from io import BytesIO
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from unittest.mock import patch
from PIL import Image
from rest_framework.test import APITestCase

from products.models import Category, Product, ProductReview
from users.models import User

from .models import Order, PaymentTransaction


class OrderApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user(
            email="seller@example.com",
            password="StrongPass123!",
            full_name="Seller",
            role=User.Role.SELLER,
        )
        cls.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123!",
            full_name="Customer",
        )
        category = Category.objects.create(name="Test", slug="test")
        cls.product = Product.objects.create(
            seller=cls.seller,
            category=category,
            name="Test product",
            description="Test description",
            price="500.00",
            stock=5,
        )

    def setUp(self):
        self.client.force_authenticate(user=self.customer)
        self.url = reverse("order-list")
        self.payload = {
            "items": [{"id": self.product.id, "quantity": 2}],
            "shippingAddress": {
                "fullName": "Customer",
                "phone": "01712345678",
                "district": "Dhaka",
                "area": "Mirpur",
                "address": "House 1",
                "note": "",
            },
            "paymentMethod": "cod",
        }

    def test_create_order_uses_server_prices_and_decreases_stock(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["subtotal"], 1000)
        self.assertEqual(response.data["shippingFee"], 60)
        self.assertEqual(response.data["total"], 1060)
        self.assertEqual(response.data["items"][0]["price"], 500)
        self.assertEqual(response.data["items"][0]["seller_id"], self.seller.id)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(Order.objects.count(), 1)

    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_online_order_starts_sslcommerz_payment(self, initiate_payment_mock):
        response = self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["paymentUrl"], "https://sandbox.sslcommerz.com/pay")
        order = Order.objects.get()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(order.payment_transaction.status, PaymentTransaction.Status.PENDING)
        initiate_payment_mock.assert_called_once()

    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_online_order_is_not_visible_until_payment_is_paid(
        self, _initiate_payment_mock
    ):
        response = self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )
        order = Order.objects.get(order_number=response.data["id"])
        detail_url = reverse(
            "order-detail",
            kwargs={"order_number": order.order_number},
        )

        self.assertEqual(self.client.get(self.url).data, [])
        self.assertEqual(self.client.get(detail_url).status_code, 404)

        self.client.force_authenticate(user=self.seller)
        dashboard_url = reverse("seller-dashboard")
        self.assertEqual(self.client.get(dashboard_url).data["recentOrders"], [])

        order.payment_status = Order.PaymentStatus.PAID
        order.save(update_fields=["payment_status"])
        self.assertEqual(
            len(self.client.get(dashboard_url).data["recentOrders"]),
            1,
        )

    @patch("orders.views.validate_payment", return_value={"status": "VALID"})
    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_successful_payment_callback_confirms_payment_once(
        self, _initiate_payment_mock, validate_payment_mock
    ):
        response = self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )
        order = Order.objects.get()
        callback_url = reverse(
            "payment-callback",
            kwargs={"callback_type": "success"},
        )
        callback_data = {
            "tran_id": str(order.payment_transaction.transaction_id),
            "val_id": "sandbox-validation-id",
        }

        callback_response = self.client.post(callback_url, callback_data)
        self.assertEqual(callback_response.status_code, 302)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(
            order.payment_transaction.status, PaymentTransaction.Status.PAID
        )

        self.client.post(callback_url, callback_data)
        self.assertEqual(Order.objects.get().payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(validate_payment_mock.call_count, 1)
        self.assertEqual(response.data["id"], order.order_number)

    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_failed_payment_callback_cancels_order_and_restores_stock(
        self, _initiate_payment_mock
    ):
        self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )
        order = Order.objects.get()
        callback_url = reverse(
            "payment-callback",
            kwargs={"callback_type": "failure"},
        )
        callback_response = self.client.post(
            callback_url,
            {"tran_id": str(order.payment_transaction.transaction_id)},
        )

        self.assertEqual(callback_response.status_code, 302)
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)
        self.assertEqual(self.product.stock, 5)

    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_seller_cannot_fulfill_unpaid_online_order(self, _initiate_payment_mock):
        response = self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )
        self.client.force_authenticate(user=self.seller)
        status_url = reverse(
            "seller-order-status",
            kwargs={"order_number": response.data["id"]},
        )

        status_response = self.client.post(status_url, {"status": "Shipped"}, format="json")

        self.assertEqual(status_response.status_code, 400)
        self.assertEqual(Order.objects.get().status, Order.Status.PROCESSING)

    def test_seller_can_cancel_own_cod_items_and_restock_without_affecting_other_seller(self):
        other_seller = User.objects.create_user(
            email="other-seller@example.com",
            password="test-pass-123",
            full_name="Other Seller",
            role=User.Role.SELLER,
        )
        other_product = Product.objects.create(
            seller=other_seller,
            category=self.product.category,
            name="Other seller product",
            description="Other product description",
            price="300.00",
            stock=4,
        )
        response = self.client.post(
            self.url,
            {
                **self.payload,
                "items": [
                    {"id": self.product.id, "quantity": 2},
                    {"id": other_product.id, "quantity": 1},
                ],
            },
            format="json",
        )
        order = Order.objects.get(order_number=response.data["id"])
        self.client.force_authenticate(user=self.seller)
        dashboard = self.client.get(reverse("seller-dashboard"))
        self.assertTrue(dashboard.data["recentOrders"][0]["can_cancel"])
        cancel_url = reverse(
            "seller-order-status",
            kwargs={"order_number": order.order_number},
        )

        cancel_response = self.client.delete(cancel_url)

        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.data["status"], Order.Status.CANCELLED)
        self.assertEqual(cancel_response.data["restocked"], 1)
        self.product.refresh_from_db()
        other_product.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(other_product.stock, 3)
        self.assertEqual(order.status, Order.Status.PROCESSING)
        self.assertEqual(order.subtotal, Decimal("300.00"))
        self.assertEqual(order.total, Decimal("360.00"))
        self.assertEqual(
            order.seller_orders.get(seller=self.seller).status,
            Order.Status.CANCELLED,
        )
        self.assertEqual(
            order.seller_orders.get(seller=other_seller).status,
            Order.Status.PROCESSING,
        )

        duplicate_cancel = self.client.delete(cancel_url)
        self.assertEqual(duplicate_cancel.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

        self.client.force_authenticate(user=other_seller)
        other_dashboard = self.client.get(reverse("seller-dashboard"))
        self.assertEqual(len(other_dashboard.data["recentOrders"]), 1)
        self.assertTrue(other_dashboard.data["recentOrders"][0]["can_confirm"])

    @patch("orders.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/pay")
    def test_seller_cannot_cancel_online_order_without_refund_support(
        self, _initiate_payment_mock
    ):
        response = self.client.post(
            self.url,
            {**self.payload, "paymentMethod": "sslcommerz"},
            format="json",
        )
        self.client.force_authenticate(user=self.seller)
        cancel_url = reverse(
            "seller-order-status",
            kwargs={"order_number": response.data["id"]},
        )

        cancel_response = self.client.delete(cancel_url)

        self.assertEqual(cancel_response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(Order.objects.get().status, Order.Status.PROCESSING)

    def test_order_history_includes_uploaded_product_images(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(order_response.status_code, 201)
        self.assertFalse(order_response.data["items"][0]["has_review"])

        ProductReview.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
        )
        history_response = self.client.get(self.url)
        self.assertTrue(history_response.data[0]["items"][0]["has_review"])

        image_buffer = BytesIO()
        Image.new("RGB", (1, 1), color="blue").save(image_buffer, format="PNG")
        self.product.image_file = SimpleUploadedFile(
            "order-product.png",
            image_buffer.getvalue(),
            content_type="image/png",
        )
        self.product.save(update_fields=["image_file"])
        self.addCleanup(self.product.image_file.delete, save=False)

        order_url = reverse(
            "order-detail",
            kwargs={"order_number": order_response.data["id"]},
        )
        history_response = self.client.get(order_url)

        self.assertEqual(history_response.status_code, 200)
        self.assertTrue(history_response.data["items"][0]["has_review"])
        self.assertIn("/media/products/", history_response.data["items"][0]["image"])

        next_order_response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(next_order_response.status_code, 201)
        self.assertIn(
            "/media/products/",
            next_order_response.data["items"][0]["image"],
        )

    def test_rejects_insufficient_stock_without_partial_updates(self):
        payload = {
            **self.payload,
            "items": [{"id": self.product.id, "quantity": 6}],
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_history_and_detail_are_scoped_to_signed_in_user(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        order_number = order_response.data["id"]

        self.assertEqual(self.client.get(self.url).data[0]["id"], order_number)
        self.client.force_authenticate(user=self.seller)
        detail = self.client.get(
            reverse("order-detail", kwargs={"order_number": order_number})
        )
        self.assertEqual(detail.status_code, 404)

    def test_customer_can_clear_history_without_deleting_orders_or_seller_records(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        order = Order.objects.get(order_number=order_response.data["id"])
        clear_url = reverse("order-history-clear")

        clear_response = self.client.delete(clear_url)

        self.assertEqual(clear_response.status_code, 200)
        self.assertEqual(clear_response.data["hiddenOrders"], 1)
        self.assertEqual(self.client.get(self.url).data, [])
        order.refresh_from_db()
        self.assertTrue(order.hidden_from_customer_history)
        self.assertEqual(Order.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

        self.client.force_authenticate(user=self.seller)
        seller_orders = self.client.get(reverse("seller-dashboard")).data["recentOrders"]
        self.assertEqual(len(seller_orders), 1)

    def test_only_customer_can_clear_order_history(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.delete(reverse("order-history-clear"))

        self.assertEqual(response.status_code, 403)

    def test_rejects_duplicate_product_lines(self):
        payload = {
            **self.payload,
            "items": [
                {"id": self.product.id, "quantity": 3},
                {"id": self.product.id, "quantity": 3},
            ],
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_seller_dashboard_returns_only_sales_from_the_sellers_products(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        self.client.force_authenticate(user=self.seller)

        dashboard_url = reverse("seller-dashboard")
        response = self.client.get(dashboard_url)
        self.assertEqual(response.data["recentOrders"][0]["status"], "Processing")
        self.assertEqual(response.data["totalSales"], 0)
        self.assertEqual(response.data["bestSellingProducts"], [])

        status_url = reverse(
            "seller-order-status",
            kwargs={"order_number": order_response.data["id"]},
        )
        response = self.client.post(status_url, {"status": "Shipped"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "Shipped")
        self.assertEqual(Order.objects.get().status, Order.Status.SHIPPED)

        response = self.client.post(status_url, {"status": "Delivered"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "Delivered")

        product_response = self.client.get(
            reverse("product-detail", args=[self.product.id])
        )
        self.assertEqual(product_response.status_code, 200)
        self.assertEqual(product_response.data["sold_count"], 2)

        response = self.client.get(reverse("seller-dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalProducts"], 1)
        self.assertEqual(response.data["totalOrders"], 1)
        self.assertEqual(response.data["totalSales"], 1000)
        self.assertEqual(response.data["customers"], 1)
        self.assertEqual(response.data["recentOrders"][0]["id"], order_response.data["id"])
        self.assertEqual(response.data["revenueSummary"]["today"], 1000)
        self.assertEqual(response.data["salesOrderCounts"]["today"], 1)
        self.assertEqual(response.data["bestSellingProducts"][0]["name"], "Test product")
        self.assertEqual(response.data["bestSellingProducts"][0]["quantity"], 2)
        self.assertEqual(len(response.data["salesTrend"]), 7)

    def test_seller_cannot_update_an_order_for_another_seller(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        self.client.force_authenticate(user=self.seller)
        status_url = reverse(
            "seller-order-status",
            kwargs={"order_number": order_response.data["id"]},
        )

        response = self.client.post(
            status_url, {"status": "Shipped"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        other_seller = User.objects.create_user(
            email="other-seller@example.com",
            password="other-seller-password",
            full_name="Other Seller",
            role=User.Role.SELLER,
        )
        self.client.force_authenticate(user=other_seller)
        response = self.client.post(
            status_url, {"status": "Delivered"}, format="json"
        )

        self.assertEqual(response.status_code, 404)

    def test_seller_dashboard_excludes_cancelled_sales(self):
        order_response = self.client.post(self.url, self.payload, format="json")
        Order.objects.filter(order_number=order_response.data["id"]).update(
            status=Order.Status.CANCELLED
        )
        self.client.force_authenticate(user=self.seller)

        response = self.client.get(reverse("seller-dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalSales"], 0)
        self.assertEqual(response.data["totalOrders"], 0)
        self.assertEqual(response.data["bestSellingProducts"], [])

    def test_customer_cannot_access_seller_dashboard(self):
        response = self.client.get(reverse("seller-dashboard"))

        self.assertEqual(response.status_code, 403)
