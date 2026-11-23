
from django.urls import path

from .views import (
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminProductDetailView,
    AdminProductListView,
    health_check,
    CategoryListView,
    CategoryDetailView,
    ProductListView,
    ProductDetailView,
    ProductReviewView,
    SellerProductDetailView,
    SellerProductListCreateView,
)

urlpatterns = [
    path("admin/products/", AdminProductListView.as_view(), name="admin-product-list"),
    path(
        "admin/products/<int:pk>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),
    path(
        "admin/categories/",
        AdminCategoryListCreateView.as_view(),
        name="admin-category-list",
    ),
    path(
        "admin/categories/<int:pk>/",
        AdminCategoryDetailView.as_view(),
        name="admin-category-detail",
    ),
    path("health/", health_check, name="health-check"),

    path("categories/", CategoryListView.as_view(), name="category-list"),
    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),

    path("products/", ProductListView.as_view(), name="product-list"),
    path(
        "products/<int:pk>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
    path(
        "products/<int:pk>/reviews/",
        ProductReviewView.as_view(),
        name="product-review",
    ),
    path(
        "seller/products/",
        SellerProductListCreateView.as_view(),
        name="seller-product-list",
    ),
    path(
        "seller/products/<int:pk>/",
        SellerProductDetailView.as_view(),
        name="seller-product-detail",
    ),
]
