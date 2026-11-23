from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db.models import Avg, Count, Q
from rest_framework import filters, generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsMarketplaceAdmin

from .models import Category, Product, ProductReview
from .serializers import (
    AdminCategorySerializer,
    AdminProductSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductReviewSerializer,
    SellerProductSerializer,
)


@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "status": "success",
            "message": "Marketplace API is running!",
        },
        status=status.HTTP_200_OK,
    )


def public_categories():
    return Category.objects.filter(is_active=True).annotate(
        product_count=Count(
            "products",
            filter=Q(
                products__is_active=True,
                products__is_approved=True,
                products__seller__is_active=True,
                products__seller__seller_approved=True,
            ),
        )
    )


def public_products():
    return Product.objects.filter(
        is_active=True,
        is_approved=True,
        category__is_active=True,
        seller__is_active=True,
        seller__seller_approved=True,
    ).select_related("category", "seller")


def read_price_param(request, name):
    raw = request.query_params.get(name, "").strip()

    if not raw:
        return None

    try:
        value = Decimal(raw)
    except InvalidOperation:
        raise ValidationError({name: "Enter a valid number."})

    if not value.is_finite() or value < 0:
        raise ValidationError({name: "Enter a number that is zero or more."})

    return value


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return public_categories()


class CategoryDetailView(generics.RetrieveAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return public_categories()


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


class ProductListView(generics.ListAPIView):
    """
    Query parameters:
      search     words to look for in name, description and category name
      category   category slug or name (case-insensitive)
      min_price  lowest price
      max_price  highest price
      in_stock   true to hide out-of-stock products
      ordering   price, -price, rating, -rating, created_at, -created_at, name, -name
      page, page_size
    """

    serializer_class = ProductListSerializer
    pagination_class = ProductPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["price", "rating", "created_at", "name"]
    ordering = ["-rating", "-id"]

    def get_queryset(self):
        queryset = public_products()
        params = self.request.query_params

        category = params.get("category", "").strip()
        if category:
            queryset = queryset.filter(
                Q(category__slug__iexact=category) | Q(category__name__iexact=category)
            )

        min_price = read_price_param(self.request, "min_price")
        max_price = read_price_param(self.request, "max_price")

        if min_price is not None and max_price is not None and min_price > max_price:
            raise ValidationError(
                {"min_price": "Minimum price cannot be higher than maximum price."}
            )

        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)

        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        if params.get("in_stock", "").strip().lower() in ("1", "true", "yes"):
            queryset = queryset.filter(stock__gt=0)

        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        # Tie-breaker so products with equal prices or ratings never shuffle
        # between pages.
        return queryset.order_by(*queryset.query.order_by, "-id")


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer

    def get_queryset(self):
        return public_products()


class ProductReviewView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductReviewSerializer

    def post(self, request, pk):
        if request.user.role != "customer":
            return Response(
                {"detail": "Only customers can rate products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product = public_products().filter(pk=pk).first()
        if product is None:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from orders.models import Order

        eligible = False
        orders = Order.objects.filter(user=request.user).exclude(
            status=Order.Status.CANCELLED
        ).prefetch_related("seller_orders")
        for order in orders:
            if not any(
                item.get("id") == product.id
                and item.get("seller_id") == product.seller_id
                for item in order.items
            ):
                continue
            seller_order = next(
                (
                    seller_order
                    for seller_order in order.seller_orders.all()
                    if seller_order.seller_id == product.seller_id
                ),
                None,
            )
            order_status = seller_order.status if seller_order else order.status
            if order_status == Order.Status.DELIVERED:
                eligible = True
                break

        if not eligible:
            return Response(
                {"detail": "You can rate this product after it has been delivered."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ProductReview.objects.filter(
            product=product, customer=request.user
        ).exists():
            return Response(
                {"detail": "You have already rated this product."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review_data = {
            "rating": serializer.validated_data["rating"],
            "comment": serializer.validated_data.get("comment", ""),
        }
        if "image_file" in serializer.validated_data:
            review_data["image"] = serializer.validated_data["image_file"]
        review, created = ProductReview.objects.get_or_create(
            product=product,
            customer=request.user,
            defaults=review_data,
        )
        if not created:
            return Response(
                {"detail": "You have already rated this product."},
                status=status.HTTP_409_CONFLICT,
            )

        average_rating = ProductReview.objects.filter(product=product).aggregate(
            average=Avg("rating")
        )["average"]
        product.rating = Decimal(str(average_rating)).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )
        product.save(update_fields=["rating"])

        return Response(
            {"rating": review.rating, "average_rating": float(product.rating)},
            status=status.HTTP_200_OK,
        )


class SellerPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.role == "admin"
            or (
                request.user.role == "seller"
                and request.user.seller_approved
            )
        )


class SellerProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [SellerPermission]
    serializer_class = SellerProductSerializer

    def get_queryset(self):
        if self.request.user.role == "admin":
            return Product.objects.all().select_related("category")
        return Product.objects.filter(
            seller=self.request.user, is_deleted=False
        ).select_related("category")


class SellerProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [SellerPermission]
    serializer_class = SellerProductSerializer

    def get_queryset(self):
        if self.request.user.role == "admin":
            return Product.objects.all().select_related("category")
        return Product.objects.filter(
            seller=self.request.user, is_deleted=False
        ).select_related("category")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted"])


class AdminProductListView(generics.ListAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("category", "seller").all()


class AdminProductDetailView(generics.UpdateAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.all()
    http_method_names = ["patch", "options", "head"]


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()


class AdminCategoryDetailView(generics.UpdateAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()
    http_method_names = ["patch", "options", "head"]