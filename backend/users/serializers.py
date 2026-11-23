from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "company_name",
            "role",
            "is_active",
            "seller_approved",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "email",
            "full_name",
            "company_name",
            "role",
            "date_joined",
        ]

    def validate(self, attrs):
        if "seller_approved" in attrs and self.instance.role != User.Role.SELLER:
            raise serializers.ValidationError(
                {"seller_approved": "Only seller accounts can be approved."}
            )
        return attrs


def run_password_validators(password, user=None):
    try:
        validate_password(password, user)
    except DjangoValidationError as error:
        raise serializers.ValidationError(list(error.messages))


class UserSerializer(serializers.ModelSerializer):
    """Public view of the signed-in user and their editable profile fields."""

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "company_name",
            "company_description",
            "contact_phone",
            "business_address",
            "shipping_policy",
            "shipping_fee",
            "payout_method",
            "payout_reference",
            "email",
            "role",
            "seller_approved",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "seller_approved", "date_joined"]

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Full name cannot be blank.")

        return value

    def validate_company_name(self, value):
        value = value.strip()
        if self.instance and self.instance.role == User.Role.SELLER and not value:
            raise serializers.ValidationError("Company name cannot be blank for sellers.")
        return value

    def validate_shipping_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Shipping fee cannot be negative.")
        return value

    def validate_payout_method(self, value):
        value = value.strip()
        if value and value not in ("bKash", "Nagad", "Bank transfer", "Other"):
            raise serializers.ValidationError("Select a supported payout method.")
        return value

    def validate_payout_reference(self, value):
        value = value.strip()
        if len(value) > 100:
            raise serializers.ValidationError("Payout reference is too long.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance and self.instance.role != User.Role.SELLER:
            seller_fields = {
                "company_name",
                "company_description",
                "contact_phone",
                "business_address",
                "shipping_policy",
                "shipping_fee",
                "payout_method",
                "payout_reference",
            }
            if seller_fields.intersection(attrs):
                raise serializers.ValidationError(
                    "Store settings are only available to seller accounts."
                )
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            (User.Role.CUSTOMER, "Customer"),
            (User.Role.SELLER, "Seller"),
        ],
        default=User.Role.CUSTOMER,
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "company_name",
            "email",
            "password",
            "role",
        ]
        read_only_fields = ["id"]

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Full name cannot be blank.")

        return value

    def validate_company_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Company name is required for sellers.")
        return value

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        if attrs.get("role") == User.Role.SELLER and not attrs.get(
            "company_name", ""
        ).strip():
            raise serializers.ValidationError(
                {"company_name": "Company name is required for sellers."}
            )

        candidate = User(email=attrs.get("email"), full_name=attrs.get("full_name"))

        try:
            run_password_validators(attrs["password"], candidate)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({"password": error.detail})

        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            company_name=validated_data.get("company_name", ""),
            role=validated_data["role"],
            seller_approved=validated_data["role"] != User.Role.SELLER,
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")

        return value

    def validate_new_password(self, value):
        run_password_validators(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        try:
            RefreshToken(self.validated_data["refresh"]).blacklist()
        except TokenError:
            raise serializers.ValidationError(
                {"refresh": "This token is invalid or has already been used."}
            )
