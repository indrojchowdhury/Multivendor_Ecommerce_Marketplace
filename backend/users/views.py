from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from orders.models import Order
from products.models import Category, Product

from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .permissions import IsMarketplaceAdmin
from .models import User


class AdminDashboardView(APIView):
    permission_classes = [IsMarketplaceAdmin]

    def get(self, request):
        return Response(
            {
                "users": User.objects.count(),
                "activeUsers": User.objects.filter(is_active=True).count(),
                "pendingSellers": User.objects.filter(
                    role=User.Role.SELLER, seller_approved=False
                ).count(),
                "products": Product.objects.count(),
                "pendingProducts": Product.objects.filter(is_approved=False).count(),
                "categories": Category.objects.count(),
                "activeCategories": Category.objects.filter(is_active=True).count(),
                "orders": Order.objects.count(),
            }
        )


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()


class AdminUserDetailView(generics.UpdateAPIView):
    permission_classes = [IsMarketplaceAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()

    def get_object(self):
        user = super().get_object()
        if user.role == User.Role.ADMIN:
            raise PermissionDenied("Admin accounts cannot be changed here.")
        return user

    http_method_names = ["patch", "options", "head"]


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = CustomTokenObtainPairSerializer.get_token(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Your password has been changed."})