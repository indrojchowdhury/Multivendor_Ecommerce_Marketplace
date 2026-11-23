from django.urls import path

from .views import (
    OrderDetailView,
    OrderHistoryClearView,
    OrderListCreateView,
    PaymentCallbackView,
    SellerDashboardView,
    SellerOrderStatusView,
)

urlpatterns = [
    path("seller/dashboard/", SellerDashboardView.as_view(), name="seller-dashboard"),
    path(
        "<str:order_number>/seller-status/",
        SellerOrderStatusView.as_view(),
        name="seller-order-status",
    ),
    path(
        "payments/<str:callback_type>/",
        PaymentCallbackView.as_view(),
        name="payment-callback",
    ),
    path("history/", OrderHistoryClearView.as_view(), name="order-history-clear"),
    path("", OrderListCreateView.as_view(), name="order-list"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
]
