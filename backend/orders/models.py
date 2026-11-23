import uuid

from django.conf import settings
from django.db import models


def generate_payment_transaction_id():
    return uuid.uuid4().hex[:30]


def generate_order_number():
    return f"ORD-{uuid.uuid4().hex[:10].upper()}"


class Order(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "Processing", "Processing"
        SHIPPED = "Shipped", "Shipped"
        DELIVERED = "Delivered", "Delivered"
        CANCELLED = "Cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        COD = "cod", "Cash on Delivery"
        SSLCOMMERZ = "sslcommerz", "SSLCommerz"
        BKASH = "bkash", "bKash"
        NAGAD = "nagad", "Nagad"
        CARD = "card", "Credit / Debit Card"

    class PaymentStatus(models.TextChoices):
        ON_DELIVERY = "Pay on delivery", "Pay on delivery"
        PENDING = "Pending", "Pending"
        PAID = "Paid", "Paid"
        FAILED = "Failed", "Failed"

    order_number = models.CharField(
        max_length=14, unique=True, default=generate_order_number
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PROCESSING
    )
    hidden_from_customer_history = models.BooleanField(default=False)
    items = models.JSONField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.JSONField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class PaymentTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        PAID = "Paid", "Paid"
        FAILED = "Failed", "Failed"

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="payment_transaction",
    )
    transaction_id = models.CharField(
        max_length=30,
        default=generate_payment_transaction_id,
        unique=True,
    )
    validation_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order.order_number} - {self.status}"


class SellerOrder(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="seller_orders",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_orders",
    )
    status = models.CharField(
        max_length=20,
        choices=Order.Status.choices,
        default=Order.Status.PROCESSING,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "seller"],
                name="unique_seller_order",
            )
        ]

    def __str__(self):
        return f"{self.order.order_number} - {self.seller_id}"
