from django.db.models import Q

from rest_framework import serializers

from .models import Category, Product, ProductReview


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.CharField(source="image_url", read_only=True)
    # Added by the view with .annotate(); counts active products only.
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image", "product_count"]


class ProductListSerializer(serializers.ModelSerializer):
    # Numbers, not strings, so the React app can format prices directly.
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True
    )
    rating = serializers.DecimalField(
        max_digits=2, decimal_places=1, coerce_to_string=False, read_only=True
    )
    image = serializers.SerializerMethodField()
    sold_count = serializers.SerializerMethodField()
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    company_name = serializers.CharField(source="seller.company_name", read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    def get_image(self, obj):
        if obj.image_file:
            image_url = obj.image_file.url
            request = self.context.get("request")
            return request.build_absolute_uri(image_url) if request else image_url
        return obj.image_url

    def get_sold_count(self, obj):
        from orders.models import Order

        sold_counts = self.context.get("_sold_counts")
        if sold_counts is None:
            sold_counts = {}
            for order in Order.objects.exclude(
                status=Order.Status.CANCELLED
            ).prefetch_related("seller_orders"):
                seller_statuses = {
                    seller_order.seller_id: seller_order.status
                    for seller_order in order.seller_orders.all()
                }
                for item in order.items:
                    seller_id = item.get("seller_id")
                    status = seller_statuses.get(seller_id, order.status)
                    if status == Order.Status.DELIVERED:
                        product_id = item.get("id")
                        sold_counts[product_id] = (
                            sold_counts.get(product_id, 0) + item.get("quantity", 0)
                        )

            self.context["_sold_counts"] = sold_counts

        return sold_counts.get(obj.id, 0)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "rating",
            "sold_count",
            "image",
            "category",
            "category_slug",
            "seller_name",
            "company_name",
            "stock",
            "in_stock",
            "created_at",
        ]


class ProductDetailSerializer(ProductListSerializer):
    seller_id = serializers.IntegerField(read_only=True)
    can_rate = serializers.SerializerMethodField()
    my_rating = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "seller_id",
            "updated_at",
            "can_rate",
            "my_rating",
            "reviews",
            "review_count",
        ]

    def get_can_rate(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role != "customer":
            return False

        if ProductReview.objects.filter(product=obj, customer=request.user).exists():
            return False

        from orders.models import Order

        orders = Order.objects.filter(user=request.user).exclude(
            status=Order.Status.CANCELLED
        )
        for order in orders:
            if not any(
                item.get("id") == obj.id
                and item.get("seller_id") == obj.seller_id
                for item in order.items
            ):
                continue
            seller_order = order.seller_orders.filter(seller_id=obj.seller_id).first()
            order_status = seller_order.status if seller_order else order.status
            if order_status == Order.Status.DELIVERED:
                return True

        return False

    def get_my_rating(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        review = ProductReview.objects.filter(
            product=obj, customer=request.user
        ).first()
        return review.rating if review else None

    def get_reviews(self, obj):
        reviews = obj.reviews.select_related("customer").all()
        return ProductReviewSerializer(
            reviews, many=True, context=self.context
        ).data

    def get_review_count(self, obj):
        return obj.reviews.count()


class ProductReviewSerializer(serializers.ModelSerializer):
    image_file = serializers.ImageField(
        required=False,
        allow_empty_file=False,
        write_only=True,
    )
    image = serializers.SerializerMethodField()
    customer_name = serializers.CharField(
        source="customer.full_name",
        read_only=True,
    )

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "rating",
            "comment",
            "image",
            "image_file",
            "customer_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Choose a rating from 1 to 5.")
        return value

    def validate_image_file(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image files must be 5 MB or smaller.")
        return value

    def get_image(self, review):
        if not review.image:
            return ""
        image_url = review.image.url
        request = self.context.get("request")
        return request.build_absolute_uri(image_url) if request else image_url


class SellerProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(write_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    image = serializers.CharField(source="image_url", required=False, allow_blank=True)
    image_file = serializers.ImageField(
        required=False, allow_empty_file=False, write_only=True
    )
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, coerce_to_string=False
    )
    company_name = serializers.CharField(
        source="seller.company_name", read_only=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "category",
            "category_name",
            "company_name",
            "stock",
            "image",
            "image_file",
            "rating",
            "is_active",
            "is_approved",
        ]
        read_only_fields = ["id", "rating", "is_approved"]

    def validate_image_file(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image files must be 5 MB or smaller.")
        return value

    def validate_category(self, value):
        category = Category.objects.filter(is_active=True).filter(
            Q(slug__iexact=value.strip()) | Q(name__iexact=value.strip())
        ).first()
        if category is None:
            raise serializers.ValidationError("Select an active category.")
        return category

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        validated_data["is_approved"] = True
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image_file:
            image_url = instance.image_file.url
            request = self.context.get("request")
            representation["image"] = (
                request.build_absolute_uri(image_url) if request else image_url
            )
        representation["category"] = representation.pop("category_name")
        return representation


class AdminProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "seller_name",
            "price",
            "stock",
            "is_approved",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "category",
            "seller_name",
            "price",
            "stock",
            "created_at",
        ]


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image_url", "is_active"]
        read_only_fields = ["id"]