from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from products.models import Product, ProductReview

from .models import Order, SellerOrder


class OrderItemRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemRequestSerializer(many=True, allow_empty=False)
    shippingAddress = serializers.DictField(write_only=True)
    paymentMethod = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices, write_only=True
    )

    class Meta:
        model = Order
        fields = ["items", "shippingAddress", "paymentMethod"]

    def validate_shippingAddress(self, value):
        required_fields = ("fullName", "phone", "district", "area", "address")
        normalized = {
            key: value.get(key, "").strip()
            for key in (*required_fields, "note")
            if isinstance(value.get(key, ""), str)
        }
        missing = [key for key in required_fields if not normalized.get(key)]
        if missing:
            raise serializers.ValidationError(
                {key: "This field is required." for key in missing}
            )
        return normalized

    def create(self, validated_data):
        requested_items = validated_data.pop("items")
        shipping_address = validated_data.pop("shippingAddress")
        payment_method = validated_data.pop("paymentMethod")
        product_ids = [item["id"] for item in requested_items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                {"items": "Each product may only appear once."}
            )

        with transaction.atomic():
            products_by_id = {
                product.id: product
                for product in Product.objects.select_for_update()
                .filter(id__in=product_ids, is_active=True, category__is_active=True)
                .select_related("category")
            }
            if len(products_by_id) != len(set(product_ids)):
                raise serializers.ValidationError(
                    {"items": "One or more products are unavailable."}
                )

            order_items = []
            subtotal = Decimal("0.00")
            request = self.context.get("request")
            for requested in requested_items:
                product = products_by_id[requested["id"]]
                quantity = requested["quantity"]
                if product.stock < quantity:
                    raise serializers.ValidationError(
                        {"items": f"Not enough stock for {product.name}."}
                    )

                product.stock -= quantity
                product.save(update_fields=["stock"])
                image_url = product.image_url
                if product.image_file:
                    image_url = product.image_file.url
                    if request:
                        image_url = request.build_absolute_uri(image_url)
                order_items.append(
                    {
                        "id": product.id,
                        "name": product.name,
                        "price": float(product.price),
                        "image": image_url,
                        "quantity": quantity,
                        "category": product.category.name,
                        "seller_id": product.seller_id,
                    }
                )
                subtotal += product.price * quantity

            shipping_fee = Decimal("60.00" if shipping_address["district"] == "Dhaka" else "120.00")
            payment_status = (
                Order.PaymentStatus.ON_DELIVERY
                if payment_method == Order.PaymentMethod.COD
                else Order.PaymentStatus.PENDING
            )
            order = Order.objects.create(
                user=self.context["request"].user,
                items=order_items,
                subtotal=subtotal,
                shipping_fee=shipping_fee,
                total=subtotal + shipping_fee,
                shipping_address=shipping_address,
                payment_method=payment_method,
                payment_status=payment_status,
            )
            SellerOrder.objects.bulk_create(
                [
                    SellerOrder(order=order, seller_id=seller_id)
                    for seller_id in {item["seller_id"] for item in order_items}
                ]
            )
            return order


class OrderReadSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="order_number", read_only=True)
    date = serializers.DateTimeField(source="created_at", read_only=True)
    shippingFee = serializers.DecimalField(
        source="shipping_fee",
        max_digits=10,
        decimal_places=2,
        coerce_to_string=False,
        read_only=True,
    )
    shippingAddress = serializers.JSONField(
        source="shipping_address", read_only=True
    )
    paymentMethod = serializers.CharField(source="payment_method", read_only=True)
    paymentStatus = serializers.CharField(source="payment_status", read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "date",
            "status",
            "items",
            "subtotal",
            "shippingFee",
            "total",
            "shippingAddress",
            "paymentMethod",
            "paymentStatus",
        ]

    def get_items(self, order):
        items = [dict(item) for item in order.items]
        request = self.context.get("request")
        reviewed_product_ids = set()
        if request and request.user.is_authenticated:
            reviewed_product_ids = set(
                ProductReview.objects.filter(
                    customer=request.user,
                    product_id__in=[item["id"] for item in items],
                ).values_list("product_id", flat=True)
            )

        seller_statuses = {
            seller_order.seller_id: seller_order.status
            for seller_order in order.seller_orders.all()
        }
        for item in items:
            item["status"] = seller_statuses.get(
                item.get("seller_id"), order.status
            )
            item["has_review"] = item.get("id") in reviewed_product_ids

        missing_image_product_ids = [
            item["id"]
            for item in items
            if not item.get("image")
        ]
        if not missing_image_product_ids:
            return items

        products = Product.objects.filter(
            id__in=missing_image_product_ids
        ).in_bulk()
        for item in items:
            if item.get("image"):
                continue
            product = products.get(item["id"])
            if not product:
                continue

            image_url = product.image_url
            if product.image_file:
                image_url = product.image_file.url
                if request:
                    image_url = request.build_absolute_uri(image_url)
            item["image"] = image_url

        return items

    subtotal = serializers.DecimalField(
        max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True
    )
    total = serializers.DecimalField(
        max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True
    )
