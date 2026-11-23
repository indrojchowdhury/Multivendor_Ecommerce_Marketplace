from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from .models import Order, PaymentTransaction, SellerOrder
from .payments import (
    PaymentGatewayError,
    PaymentValidationError,
    initiate_payment,
    validate_payment,
)
from .serializers import OrderCreateSerializer, OrderReadSerializer


class SellerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("seller", "admin"):
            return Response(
                {"detail": "Seller access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role == "seller" and not request.user.seller_approved:
            return Response(
                {"detail": "Your seller account is awaiting admin approval."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        week_start = today - timedelta(days=6)
        month_start = today.replace(day=1)
        seller_orders = []
        customer_ids = set()
        daily_orders = set()
        weekly_orders = set()
        monthly_orders = set()
        all_time_sales = Decimal("0.00")
        daily_sales = Decimal("0.00")
        weekly_sales = Decimal("0.00")
        monthly_sales = Decimal("0.00")
        trend_sales = defaultdict(lambda: Decimal("0.00"))
        product_sales = defaultdict(lambda: {"quantity": 0, "revenue": Decimal("0.00")})
        product_names = {}

        for order in Order.objects.select_related("user").prefetch_related(
            "seller_orders"
        ):
            if order.status == Order.Status.CANCELLED:
                continue
            if (
                order.payment_method != Order.PaymentMethod.COD
                and order.payment_status != Order.PaymentStatus.PAID
            ):
                continue
            if (
                order.payment_method != Order.PaymentMethod.COD
                and order.payment_status != Order.PaymentStatus.PAID
            ):
                continue

            seller_statuses = {
                seller_order.seller_id: seller_order.status
                for seller_order in order.seller_orders.all()
            }
            for item in order.items:
                seller_id = item.get("seller_id")
                if request.user.role != "admin" and seller_id != request.user.id:
                    continue
                order_status = seller_statuses.get(seller_id, order.status)
                if order_status == Order.Status.CANCELLED:
                    continue

                amount = Decimal(str(item["price"])) * item["quantity"]
                order_date = timezone.localtime(order.created_at).date()
                customer_ids.add(order.user_id)
                if order_status == Order.Status.DELIVERED:
                    all_time_sales += amount
                    if order_date == today:
                        daily_sales += amount
                        daily_orders.add(order.order_number)
                    if week_start <= order_date <= today:
                        weekly_sales += amount
                        weekly_orders.add(order.order_number)
                        trend_sales[order_date] += amount
                    if order_date >= month_start:
                        monthly_sales += amount
                        monthly_orders.add(order.order_number)
                    product = product_sales[item["id"]]
                    product["quantity"] += item["quantity"]
                    product["revenue"] += amount
                    product_names.setdefault(item["id"], item["name"])
                seller_orders.append(
                    {
                        "id": order.order_number,
                        "key": f"{order.order_number}-{item['id']}",
                        "seller_id": seller_id,
                        "customer": order.user.full_name,
                        "product": item["name"],
                        "amount": float(amount),
                        "status": order_status,
                        "can_confirm": (
                            order_status == Order.Status.PROCESSING
                            and (
                                order.payment_method == Order.PaymentMethod.COD
                                or order.payment_status == Order.PaymentStatus.PAID
                            )
                        ),
                        "can_cancel": (
                            order_status == Order.Status.PROCESSING
                            and order.payment_method == Order.PaymentMethod.COD
                        ),
                        "created_at": order.created_at,
                    }
                )

        trend_start = today - timedelta(days=6)
        sales_trend = [
            {
                "date": (trend_start + timedelta(days=offset)).isoformat(),
                "sales": float(trend_sales[trend_start + timedelta(days=offset)]),
            }
            for offset in range(7)
        ]
        best_selling_products = sorted(
            [
                {
                    "id": product_id,
                    "name": product_names[product_id],
                    "quantity": values["quantity"],
                    "revenue": float(values["revenue"]),
                }
                for product_id, values in product_sales.items()
            ],
            key=lambda product: (product["quantity"], product["revenue"]),
            reverse=True,
        )[:5]

        seller_orders.sort(key=lambda item: item["created_at"], reverse=True)
        recent_orders = [
            {
                key: value
                for key, value in item.items()
                if key != "created_at"
            }
            for item in seller_orders[:10]
        ]
        return Response(
            {
                "totalProducts": Product.objects.filter(
                    is_active=True
                ).count()
                if request.user.role == "admin"
                else Product.objects.filter(
                    seller=request.user, is_active=True
                ).count(),
                "totalOrders": len({item["id"] for item in seller_orders}),
                "totalSales": float(all_time_sales),
                "customers": len(customer_ids),
                "recentOrders": recent_orders,
                "revenueSummary": {
                    "today": float(daily_sales),
                    "last7Days": float(weekly_sales),
                    "thisMonth": float(monthly_sales),
                },
                "salesOrderCounts": {
                    "today": len(daily_orders),
                    "last7Days": len(weekly_orders),
                    "thisMonth": len(monthly_orders),
                },
                "salesTrend": sales_trend,
                "bestSellingProducts": best_selling_products,
            }
        )


class SellerOrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, order_number):
        if request.user.role not in ("seller", "admin"):
            return Response(
                {"detail": "Seller access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role == "seller" and not request.user.seller_approved:
            return Response(
                {"detail": "Your seller account is awaiting admin approval."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order = Order.objects.filter(order_number=order_number).first()
        if order is None:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.role == "admin":
            seller_id = request.data.get("seller_id")
            try:
                seller_id = int(seller_id)
            except (TypeError, ValueError):
                return Response(
                    {"seller_id": "A valid seller ID is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            seller_id = request.user.id

        with transaction.atomic():
            order = Order.objects.select_for_update().filter(pk=order.pk).first()
            if order is None:
                return Response(
                    {"detail": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not any(
                item.get("seller_id") == seller_id for item in order.items
            ):
                return Response(
                    {"detail": "This order does not contain your products."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            seller_order = (
                SellerOrder.objects.select_for_update()
                .filter(order=order, seller_id=seller_id)
                .first()
            )
            if seller_order is None:
                return Response(
                    {"detail": "Seller order not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if order.payment_method != Order.PaymentMethod.COD:
                return Response(
                    {
                        "detail": (
                            "Only Cash on Delivery orders can be cancelled here. "
                            "Online orders require a refund workflow."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if seller_order.status != Order.Status.PROCESSING:
                return Response(
                    {"detail": "Only unconfirmed orders can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seller_items = [
                item
                for item in order.items
                if item.get("seller_id") == seller_id
            ]
            product_ids = [item["id"] for item in seller_items]
            products = {
                product.id: product
                for product in Product.objects.select_for_update().filter(
                    id__in=product_ids,
                    seller_id=seller_id,
                )
            }
            for item in seller_items:
                product = products.get(item["id"])
                if product:
                    product.stock += item["quantity"]
                    product.save(update_fields=["stock"])

            seller_order.status = Order.Status.CANCELLED
            seller_order.save(update_fields=["status"])

            active_seller_orders = list(
                order.seller_orders.exclude(
                    status=Order.Status.CANCELLED
                ).values_list("status", flat=True)
            )
            if not active_seller_orders:
                order.status = Order.Status.CANCELLED
                order.shipping_fee = Decimal("0.00")
            elif all(
                current_status == Order.Status.DELIVERED
                for current_status in active_seller_orders
            ):
                order.status = Order.Status.DELIVERED
            elif any(
                current_status == Order.Status.SHIPPED
                for current_status in active_seller_orders
            ):
                order.status = Order.Status.SHIPPED
            else:
                order.status = Order.Status.PROCESSING

            cancelled_seller_ids = set(
                order.seller_orders.filter(
                    status=Order.Status.CANCELLED
                ).values_list("seller_id", flat=True)
            )
            remaining_subtotal = sum(
                (
                    Decimal(str(item["price"])) * item["quantity"]
                    for item in order.items
                    if item.get("seller_id") not in cancelled_seller_ids
                ),
                Decimal("0.00"),
            )
            order.subtotal = remaining_subtotal
            order.total = remaining_subtotal + order.shipping_fee
            order.save(
                update_fields=["status", "subtotal", "shipping_fee", "total"]
            )

        return Response(
            {"status": Order.Status.CANCELLED, "restocked": len(seller_items)}
        )

    def post(self, request, order_number):
        if request.user.role not in ("seller", "admin"):
            return Response(
                {"detail": "Seller access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role == "seller" and not request.user.seller_approved:
            return Response(
                {"detail": "Your seller account is awaiting admin approval."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order = Order.objects.filter(order_number=order_number).first()
        if order is None:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.role == "admin":
            seller_id = request.data.get("seller_id")
            if not seller_id:
                return Response(
                    {"seller_id": "This field is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                seller_id = int(seller_id)
            except (TypeError, ValueError):
                return Response(
                    {"seller_id": "Enter a valid seller ID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            seller_id = request.user.id

        if not any(item.get("seller_id") == seller_id for item in order.items):
            return Response(
                {"detail": "This order does not contain your products."},
                status=status.HTTP_404_NOT_FOUND,
            )

        seller_order, _ = SellerOrder.objects.get_or_create(
            order=order,
            seller_id=seller_id,
            defaults={"status": order.status},
        )
        if (
            order.payment_method != Order.PaymentMethod.COD
            and order.payment_status != Order.PaymentStatus.PAID
        ):
            return Response(
                {"detail": "This order cannot be fulfilled until payment is confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        next_status = request.data.get("status")
        allowed_transitions = {
            Order.Status.PROCESSING: Order.Status.SHIPPED,
            Order.Status.SHIPPED: Order.Status.DELIVERED,
        }
        if allowed_transitions.get(seller_order.status) != next_status:
            return Response(
                {"status": "This order cannot be moved to that status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seller_order.status = next_status
        seller_order.save(update_fields=["status"])

        seller_statuses = list(
            order.seller_orders.exclude(
                status=Order.Status.CANCELLED
            ).values_list("status", flat=True)
        )
        if not seller_statuses:
            order.status = Order.Status.CANCELLED
        elif all(
            current_status == Order.Status.DELIVERED
            for current_status in seller_statuses
        ):
            order.status = Order.Status.DELIVERED
        elif any(
            current_status == Order.Status.SHIPPED
            for current_status in seller_statuses
        ):
            order.status = Order.Status.SHIPPED
        else:
            order.status = Order.Status.PROCESSING
        order.save(update_fields=["status"])

        return Response({"status": seller_order.status})


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).filter(
            Q(payment_method=Order.PaymentMethod.COD)
            | Q(payment_status=Order.PaymentStatus.PAID)
        ).filter(hidden_from_customer_history=False)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        response_data = OrderReadSerializer(
            order, context={"request": request}
        ).data
        if order.payment_method == Order.PaymentMethod.COD:
            return Response(response_data, status=status.HTTP_201_CREATED)

        payment_transaction = PaymentTransaction.objects.create(order=order)
        try:
            payment_url = initiate_payment(order, payment_transaction, request)
        except PaymentGatewayError as error:
            cancel_pending_payment(payment_transaction)
            return Response(
                {"detail": str(error)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        response_data["paymentUrl"] = payment_url
        return Response(response_data, status=status.HTTP_201_CREATED)


def cancel_pending_payment(payment_transaction):
    with transaction.atomic():
        payment = PaymentTransaction.objects.select_for_update().get(
            pk=payment_transaction.pk
        )
        order = Order.objects.select_for_update().get(pk=payment.order_id)
        if payment.status != PaymentTransaction.Status.PENDING:
            return

        payment.status = PaymentTransaction.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
        order.payment_status = Order.PaymentStatus.FAILED
        order.status = Order.Status.CANCELLED
        order.save(update_fields=["payment_status", "status"])
        order.seller_orders.update(status=Order.Status.CANCELLED)
        for item in order.items:
            Product.objects.filter(pk=item["id"]).update(
                stock=F("stock") + item["quantity"]
            )


@method_decorator(csrf_exempt, name="dispatch")
class PaymentCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, callback_type):
        return self._handle_callback(request, callback_type)

    def get(self, request, callback_type):
        return self._handle_callback(request, callback_type)

    def _handle_callback(self, request, callback_type):
        transaction_id = request.data.get("tran_id") or request.query_params.get("tran_id")
        if not transaction_id:
            return Response(
                {"detail": "Missing payment transaction ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_transaction = PaymentTransaction.objects.select_related(
            "order", "order__user"
        ).filter(transaction_id=transaction_id).first()
        if payment_transaction is None:
            return Response(
                {"detail": "Payment transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment_transaction.status == PaymentTransaction.Status.FAILED:
            if callback_type == "ipn":
                return Response(
                    {"detail": "Payment transaction is already closed."},
                    status=status.HTTP_409_CONFLICT,
                )
            return self._return_to_frontend(payment_transaction, "failed")

        if callback_type in ("success", "ipn"):
            if payment_transaction.status != PaymentTransaction.Status.PAID:
                validation_id = request.data.get("val_id") or request.query_params.get("val_id")
                if not validation_id:
                    return self._return_to_frontend(payment_transaction, "pending")
                try:
                    validate_payment(payment_transaction, validation_id)
                except PaymentValidationError as error:
                    cancel_pending_payment(payment_transaction)
                    if callback_type == "ipn":
                        return Response(
                            {"detail": str(error)},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return self._return_to_frontend(payment_transaction, "failed")
                except PaymentGatewayError as error:
                    if callback_type == "ipn":
                        return Response(
                            {"detail": str(error)},
                            status=status.HTTP_502_BAD_GATEWAY,
                        )
                    return self._return_to_frontend(payment_transaction, "pending")

                with transaction.atomic():
                    payment_transaction = PaymentTransaction.objects.select_for_update().get(
                        pk=payment_transaction.pk
                    )
                    order = Order.objects.select_for_update().get(
                        pk=payment_transaction.order_id
                    )
                    if payment_transaction.status == PaymentTransaction.Status.PENDING:
                        payment_transaction.status = PaymentTransaction.Status.PAID
                        payment_transaction.validation_id = validation_id
                        payment_transaction.save(
                            update_fields=["status", "validation_id", "updated_at"]
                        )
                        order.payment_status = Order.PaymentStatus.PAID
                        order.save(update_fields=["payment_status"])
                payment_transaction.refresh_from_db(fields=["status"])
                if payment_transaction.status != PaymentTransaction.Status.PAID:
                    return self._return_to_frontend(payment_transaction, "failed")
            if callback_type == "ipn":
                return Response({"detail": "Payment notification processed."})
            return self._return_to_frontend(payment_transaction, "success")

        if callback_type in ("failure", "cancel"):
            cancel_pending_payment(payment_transaction)
            return self._return_to_frontend(payment_transaction, callback_type)

        return Response(
            {"detail": "Unsupported payment callback."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @staticmethod
    def _return_to_frontend(payment_transaction, result):
        query = urlencode({"payment": result})
        url = (
            f"{settings.FRONTEND_URL}/order-confirmation/"
            f"{payment_transaction.order.order_number}?{query}"
        )
        from django.shortcuts import redirect

        return redirect(url)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderReadSerializer
    lookup_field = "order_number"
    lookup_url_kwarg = "order_number"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).filter(
            Q(payment_method=Order.PaymentMethod.COD)
            | Q(payment_status=Order.PaymentStatus.PAID)
        )


class OrderHistoryClearView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        if request.user.role != "customer":
            return Response(
                {"detail": "Only customers can clear their order history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        hidden_count = Order.objects.filter(
            user=request.user,
            hidden_from_customer_history=False,
        ).filter(
            Q(payment_method=Order.PaymentMethod.COD)
            | Q(payment_status=Order.PaymentStatus.PAID)
        ).update(hidden_from_customer_history=True)
        return Response({"hiddenOrders": hidden_count})
