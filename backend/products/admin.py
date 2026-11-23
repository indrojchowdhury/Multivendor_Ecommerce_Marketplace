from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "seller",
        "price",
        "stock",
        "rating",
        "is_active",
    )
    search_fields = (
        "name",
        "description",
        "seller__email",
        "seller__full_name",
    )
    list_filter = ("is_active", "category")
    list_select_related = ("category", "seller")