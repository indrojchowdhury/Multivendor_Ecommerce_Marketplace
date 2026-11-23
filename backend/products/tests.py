from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from orders.models import Order, SellerOrder
from users.models import User

from .models import Category, Product, ProductReview


class ProductApiTests(APITestCase):
    @classmethod
    def make_product(cls, name, category, price, rating, stock=10, is_active=True):
        return Product.objects.create(
            seller=cls.seller,
            category=category,
            name=name,
            description=f"{name} description",
            price=price,
            rating=rating,
            stock=stock,
            is_active=is_active,
        )

    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user(
            email="seller@example.com",
            password="StrongPass123!",
            full_name="Seller One",
            company_name="Seller One Store",
            role=User.Role.SELLER,
        )

        cls.electronics = Category.objects.create(name="Electronics", slug="electronics")
        cls.fashion = Category.objects.create(name="Fashion", slug="fashion")
        cls.hidden = Category.objects.create(name="Hidden", slug="hidden", is_active=False)

        cls.headphones = cls.make_product("Wireless Headphones", cls.electronics, 2490, "4.8")
        cls.sneakers = cls.make_product("Casual Sneakers", cls.fashion, 2890, "4.9")
        cls.watch = cls.make_product("Smart Watch", cls.electronics, 4590, "4.7", stock=0)
        cls.inactive = cls.make_product("Old Item", cls.fashion, 100, "3.0", is_active=False)
        cls.in_hidden = cls.make_product("Secret Item", cls.hidden, 100, "3.0")

        cls.list_url = reverse("product-list")

    def names(self, response):
        return [item["name"] for item in response.json()["results"]]

    def test_list_hides_inactive_products_and_categories(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 3)
        self.assertNotIn("Old Item", self.names(response))
        self.assertNotIn("Secret Item", self.names(response))

    def test_list_uses_the_shape_the_frontend_expects(self):
        item = self.client.get(self.list_url).json()["results"][0]

        self.assertIsInstance(item["price"], (int, float))
        self.assertIsInstance(item["rating"], (int, float))
        self.assertEqual(item["sold_count"], 0)
        self.assertIsInstance(item["category"], str)
        self.assertIn("image", item)
        self.assertNotIn("description", item)

    def test_filter_by_category_slug_or_name(self):
        for value in ("electronics", "Electronics", "ELECTRONICS"):
            response = self.client.get(self.list_url, {"category": value})
            self.assertEqual(response.json()["count"], 2, value)

    def test_search(self):
        response = self.client.get(self.list_url, {"search": "watch"})

        self.assertEqual(self.names(response), ["Smart Watch"])

    def test_price_range(self):
        response = self.client.get(self.list_url, {"min_price": "2500"})
        self.assertEqual(response.json()["count"], 2)

        response = self.client.get(self.list_url, {"max_price": "2500"})
        self.assertEqual(self.names(response), ["Wireless Headphones"])

        response = self.client.get(
            self.list_url, {"min_price": "2000", "max_price": "3000"}
        )
        self.assertEqual(response.json()["count"], 2)

    def test_invalid_price_filters_are_rejected(self):
        response = self.client.get(self.list_url, {"min_price": "abc"})
        self.assertEqual(response.status_code, 400)

        response = self.client.get(self.list_url, {"min_price": "-5"})
        self.assertEqual(response.status_code, 400)

        response = self.client.get(
            self.list_url, {"min_price": "3000", "max_price": "1000"}
        )
        self.assertEqual(response.status_code, 400)

    def test_in_stock_filter(self):
        response = self.client.get(self.list_url, {"in_stock": "true"})

        self.assertEqual(response.json()["count"], 2)
        self.assertNotIn("Smart Watch", self.names(response))

    def test_ordering(self):
        response = self.client.get(self.list_url, {"ordering": "price"})
        self.assertEqual(
            self.names(response),
            ["Wireless Headphones", "Casual Sneakers", "Smart Watch"],
        )

        response = self.client.get(self.list_url, {"ordering": "-rating"})
        self.assertEqual(
            self.names(response),
            ["Casual Sneakers", "Wireless Headphones", "Smart Watch"],
        )

    def test_pagination(self):
        response = self.client.get(self.list_url, {"page_size": 2})
        data = response.json()

        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["count"], 3)
        self.assertIsNotNone(data["next"])

        response = self.client.get(self.list_url, {"page_size": 2, "page": 2})
        self.assertEqual(len(response.json()["results"]), 1)

    def test_detail_includes_description_and_seller(self):
        url = reverse("product-detail", args=[self.headphones.id])
        data = self.client.get(url).json()

        self.assertEqual(data["description"], "Wireless Headphones description")
        self.assertEqual(data["seller_name"], "Seller One")
        self.assertEqual(data["company_name"], "Seller One Store")
        self.assertEqual(data["seller_id"], self.seller.id)
        self.assertFalse(data["can_rate"])
        self.assertIsNone(data["my_rating"])

    def create_purchase(self, customer, product, status=Order.Status.PROCESSING):
        order = Order.objects.create(
            user=customer,
            status=status,
            items=[
                {
                    "id": product.id,
                    "name": product.name,
                    "price": float(product.price),
                    "quantity": 2,
                    "seller_id": product.seller_id,
                }
            ],
            subtotal=product.price * 2,
            shipping_fee=0,
            total=product.price * 2,
            shipping_address={},
            payment_method=Order.PaymentMethod.COD,
            payment_status=Order.PaymentStatus.ON_DELIVERY,
        )
        SellerOrder.objects.create(
            order=order,
            seller=product.seller,
            status=status,
        )
        return order

    def test_customer_can_rate_a_delivered_product_only_once(self):
        customer = User.objects.create_user(
            email="rater@example.com",
            password="customer-password",
            full_name="Product Rater",
        )
        review_url = reverse("product-review", args=[self.headphones.id])
        detail_url = reverse("product-detail", args=[self.headphones.id])

        self.client.force_authenticate(user=customer)
        response = self.client.post(review_url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 403)

        purchase = self.create_purchase(customer, self.headphones)
        detail = self.client.get(detail_url)
        self.assertFalse(detail.data["can_rate"])
        response = self.client.post(review_url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 403)

        SellerOrder.objects.filter(order=purchase).update(
            status=Order.Status.DELIVERED
        )
        detail = self.client.get(detail_url)
        self.assertTrue(detail.data["can_rate"])

        response = self.client.post(review_url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 200)
        self.headphones.refresh_from_db()
        self.assertEqual(self.headphones.rating, 4)
        self.assertEqual(ProductReview.objects.count(), 1)
        self.assertFalse(self.client.get(detail_url).data["can_rate"])

        response = self.client.post(review_url, {"rating": 2}, format="json")
        self.assertEqual(response.status_code, 409)
        self.headphones.refresh_from_db()
        self.assertEqual(self.headphones.rating, 4)
        self.assertEqual(ProductReview.objects.count(), 1)

        detail = self.client.get(detail_url)
        self.assertEqual(detail.data["my_rating"], 4)

    def test_customer_cannot_rate_a_cancelled_purchase(self):
        customer = User.objects.create_user(
            email="cancelled-rater@example.com",
            password="customer-password",
            full_name="Cancelled Rater",
        )
        self.create_purchase(
            customer, self.headphones, status=Order.Status.CANCELLED
        )
        self.client.force_authenticate(user=customer)

        response = self.client.get(
            reverse("product-detail", args=[self.headphones.id])
        )
        self.assertFalse(response.data["can_rate"])

        response = self.client.post(
            reverse("product-review", args=[self.headphones.id]),
            {"rating": 5},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_product_rating_average_and_popular_order_update(self):
        first_customer = User.objects.create_user(
            email="first-rater@example.com",
            password="customer-password",
            full_name="First Rater",
        )
        second_customer = User.objects.create_user(
            email="second-rater@example.com",
            password="customer-password",
            full_name="Second Rater",
        )

        self.create_purchase(
            first_customer, self.headphones, status=Order.Status.DELIVERED
        )
        self.client.force_authenticate(user=first_customer)
        response = self.client.post(
            reverse("product-review", args=[self.headphones.id]),
            {"rating": 5},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.create_purchase(
            second_customer, self.headphones, status=Order.Status.DELIVERED
        )
        self.client.force_authenticate(user=second_customer)
        response = self.client.post(
            reverse("product-review", args=[self.headphones.id]),
            {"rating": 3},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.headphones.refresh_from_db()
        self.assertEqual(self.headphones.rating, 4)

        response = self.client.get(self.list_url)
        products = response.data["results"]
        self.assertEqual(products[0]["id"], self.sneakers.id)
        self.assertEqual(products[1]["id"], self.watch.id)
        self.assertEqual(products[2]["id"], self.headphones.id)

    def test_customer_review_can_include_photo_and_comment(self):
        customer = User.objects.create_user(
            email="photo-reviewer@example.com",
            password="customer-password",
            full_name="Photo Reviewer",
        )
        self.create_purchase(
            customer, self.headphones, status=Order.Status.DELIVERED
        )
        image_buffer = BytesIO()
        Image.new("RGB", (1, 1), color="green").save(image_buffer, format="PNG")
        self.client.force_authenticate(user=customer)

        response = self.client.post(
            reverse("product-review", args=[self.headphones.id]),
            {
                "rating": 5,
                "comment": "Works well and matches the listing.",
                "image_file": SimpleUploadedFile(
                    "review.png",
                    image_buffer.getvalue(),
                    content_type="image/png",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200, response.data)
        review = ProductReview.objects.get(product=self.headphones, customer=customer)
        self.addCleanup(review.image.delete, save=False)
        self.assertEqual(review.comment, "Works well and matches the listing.")

        detail = self.client.get(
            reverse("product-detail", args=[self.headphones.id])
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["description"], "Wireless Headphones description")
        self.assertEqual(detail.data["review_count"], 1)
        self.assertEqual(detail.data["reviews"][0]["customer_name"], "Photo Reviewer")
        self.assertEqual(
            detail.data["reviews"][0]["comment"],
            "Works well and matches the listing.",
        )
        self.assertIn("/media/product-reviews/", detail.data["reviews"][0]["image"])

    def test_detail_hides_inactive_product(self):
        url = reverse("product-detail", args=[self.inactive.id])

        self.assertEqual(self.client.get(url).status_code, 404)

    def test_category_list_counts_products_and_hides_inactive(self):
        response = self.client.get(reverse("category-list"))
        data = response.json()
        slugs = [item["slug"] for item in data]

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("hidden", slugs)

        electronics = next(item for item in data if item["slug"] == "electronics")
        self.assertEqual(electronics["product_count"], 2)

    def test_seller_can_create_product_and_cannot_access_another_sellers_product(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            reverse("seller-product-list"),
            {
                "name": "New product",
                "description": "Description",
                "price": "120.50",
                "category": "electronics",
                "stock": 4,
                "image": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["category"], "Electronics")
        self.assertEqual(response.data["price"], 120.5)
        self.assertEqual(response.data["company_name"], "Seller One Store")
        product_id = response.data["id"]

        other_seller = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123!",
            full_name="Other Seller",
            role=User.Role.SELLER,
        )
        self.client.force_authenticate(user=other_seller)
        detail = self.client.get(
            reverse("seller-product-detail", args=[product_id])
        )
        self.assertEqual(detail.status_code, 404)

    def test_seller_can_upload_a_product_image(self):
        self.client.force_authenticate(user=self.seller)
        image_buffer = BytesIO()
        Image.new("RGB", (1, 1), color="red").save(image_buffer, format="PNG")

        response = self.client.post(
            reverse("seller-product-list"),
            {
                "name": "Image upload product",
                "description": "Product with an uploaded image",
                "price": "120.50",
                "category": "electronics",
                "stock": 4,
                "is_active": True,
                "image_file": SimpleUploadedFile(
                    "product.png", image_buffer.getvalue(), content_type="image/png"
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("/media/products/", response.data["image"])

        product = Product.objects.get(name="Image upload product")
        self.addCleanup(product.image_file.delete, save=False)
        self.assertTrue(product.image_file.name.endswith(".png"))

        public_product = self.client.get(
            reverse("product-detail", args=[product.id])
        )
        self.assertEqual(public_product.status_code, 404)

        admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPass123!",
            full_name="Admin",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=admin)
        approved = self.client.patch(
            reverse("admin-product-detail", args=[product.id]),
            {"is_approved": True},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)

        public_product = self.client.get(
            reverse("product-detail", args=[product.id])
        )
        self.assertEqual(public_product.status_code, 200)
        self.assertEqual(public_product.data["image"], response.data["image"])

    def test_admin_can_moderate_products_and_categories(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPass123!",
            full_name="Admin",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=admin)

        product_response = self.client.patch(
            reverse("admin-product-detail", args=[self.headphones.id]),
            {"is_approved": False},
            format="json",
        )
        category_response = self.client.patch(
            reverse("admin-category-detail", args=[self.electronics.id]),
            {"is_active": False},
            format="json",
        )
        created_category = self.client.post(
            reverse("admin-category-list"),
            {"name": "Books", "slug": "books"},
            format="json",
        )

        self.assertEqual(product_response.status_code, 200)
        self.assertFalse(product_response.data["is_approved"])
        self.assertEqual(category_response.status_code, 200)
        self.assertFalse(category_response.data["is_active"])
        self.assertEqual(created_category.status_code, 201)
        self.assertEqual(
            self.client.get(reverse("product-detail", args=[self.headphones.id]))
            .status_code,
            404,
        )

    def test_seller_created_product_is_not_public_until_approved(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            reverse("seller-product-list"),
            {
                "name": "Awaiting review",
                "description": "Review me",
                "price": "120.50",
                "category": "electronics",
                "stock": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["is_approved"])
        public_response = self.client.get(
            reverse("product-detail", args=[response.data["id"]])
        )
        self.assertEqual(public_response.status_code, 404)

    def test_seller_can_view_and_reactivate_inactive_product(self):
        self.client.force_authenticate(user=self.seller)
        list_url = reverse("seller-product-list")
        response = self.client.get(list_url)

        self.assertEqual(response.status_code, 200)
        inactive = next(
            product for product in response.data if product["id"] == self.inactive.id
        )
        self.assertFalse(inactive["is_active"])

        response = self.client.patch(
            reverse("seller-product-detail", args=[self.inactive.id]),
            {"is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_active"])
        self.inactive.refresh_from_db()
        self.assertTrue(self.inactive.is_active)

    def test_customer_cannot_manage_seller_products(self):
        customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123!",
            full_name="Customer",
        )
        self.client.force_authenticate(user=customer)

        response = self.client.get(reverse("seller-product-list"))

        self.assertEqual(response.status_code, 403)