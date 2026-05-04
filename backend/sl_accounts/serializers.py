from datetime import timedelta
import re

from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SmartLaundryUser, EmailVerificationCode, PasswordResetToken


PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if SmartLaundryUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate_password(self, value):
        if not PASSWORD_PATTERN.match(value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters and include upper, lower, digit and special character"
            )
        return value

    def create(self, validated_data):
        user = SmartLaundryUser.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
        )
        EmailVerificationCode.objects.create(
            user=user,
            code=self.context["code"],
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        return user


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    user = None

    def validate(self, attrs):
        email = attrs["email"]
        code = attrs["code"]
        try:
            user = SmartLaundryUser.objects.get(email__iexact=email)
        except SmartLaundryUser.DoesNotExist:
            raise serializers.ValidationError({"email": "Account not found"})
        now = timezone.now()
        qs = EmailVerificationCode.objects.filter(
            user=user,
            code=code,
            is_used=False,
            expires_at__gt=now,
        )
        if not qs.exists():
            raise serializers.ValidationError({"code": "Invalid or expired code"})
        attrs["user"] = user
        attrs["verification"] = qs.first()
        self.user = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        verification = self.validated_data["verification"]
        user.is_active = True
        user.save(update_fields=["is_active"])
        verification.is_used = True
        verification.save(update_fields=["is_used"])
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserInfoSerializer(user).data,
        }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    user = None

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError({"detail": "invalid_credentials"})

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError({"detail": "invalid_credentials"})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "email_not_verified"})

        self.user = user
        refresh = RefreshToken.for_user(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not SmartLaundryUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Account not found")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if not PASSWORD_PATTERN.match(value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters and include upper, lower, digit and special character"
            )
        return value

    def validate(self, attrs):
        email = attrs["email"]
        code = attrs["code"]
        try:
            user = SmartLaundryUser.objects.get(email__iexact=email)
        except SmartLaundryUser.DoesNotExist:
            raise serializers.ValidationError({"email": "Account not found"})
        now = timezone.now()
        qs = PasswordResetToken.objects.filter(
            user=user,
            code=code,
            is_used=False,
            expires_at__gt=now,
        )
        if not qs.exists():
            raise serializers.ValidationError({"code": "Invalid or expired code"})
        attrs["user"] = user
        attrs["token_obj"] = qs.first()
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        token = self.validated_data["token_obj"]
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        return user


class UserInfoSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    public_id = serializers.SerializerMethodField()

    class Meta:
        model = SmartLaundryUser
        fields = ("id", "public_id", "email", "role", "is_active")

    def get_role(self, obj):
        if obj.is_superuser:
            return "superadmin"
        if obj.is_staff:
            return "admin"
        return "user"

    def get_public_id(self, obj):
        return obj.id
