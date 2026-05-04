import random
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SmartLaundryUser, EmailVerificationCode, PasswordResetToken
from .serializers import (
    RegisterSerializer,
    EmailVerificationSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserInfoSerializer,
)
from sl_accounts.email_service import (
    send_verification_code_email,
    send_password_reset_code_email,
)


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_verification_email(email: str, code: str, ui_language: str) -> None:
    send_verification_code_email(email, code, ui_language)


def send_reset_email(email: str, code: str, ui_language: str) -> None:
    send_password_reset_code_email(email, code, ui_language)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        ui_language = request.data.get("ui_language") or "en"

        if not email or not password:
            return Response(
                {"detail": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = SmartLaundryUser.objects.filter(email__iexact=email).first()

        if existing:
            if not existing.is_active:
                EmailVerificationCode.objects.filter(
                    user=existing, is_used=False
                ).update(is_used=True)
                code = generate_code()
                EmailVerificationCode.objects.create(
                    user=existing,
                    code=code,
                    expires_at=timezone.now() + timedelta(minutes=15),
                )
                send_verification_email(email, code, ui_language)
                return Response(
                    {"detail": "Verification code resent for inactive account"},
                    status=status.HTTP_200_OK,
                )
            return Response(
                {"detail": "Email already registered", "suggest_login": True},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = generate_code()
        payload = {"email": email, "password": password}
        serializer = RegisterSerializer(
            data=payload,
            context={"code": code},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        EmailVerificationCode.objects.filter(user=user, is_used=False).update(
            is_used=True
        )
        EmailVerificationCode.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        send_verification_email(email, code, ui_language)

        return Response(
            {"detail": "Verification code sent"},
            status=status.HTTP_201_CREATED,
        )


class ResendVerificationCodeView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        ui_language = request.data.get("ui_language") or "en"

        if not email:
            return Response(
                {"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = SmartLaundryUser.objects.get(email__iexact=email)
        except SmartLaundryUser.DoesNotExist:
            return Response(
                {"detail": "Account not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if user.is_active:
            return Response(
                {"detail": "Account already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        EmailVerificationCode.objects.filter(user=user, is_used=False).update(
            is_used=True
        )
        code = generate_code()
        EmailVerificationCode.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        send_verification_email(email, code, ui_language)

        return Response(
            {"detail": "Verification code resent"}, status=status.HTTP_200_OK
        )


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.save()
        return Response(tokens, status=status.HTTP_200_OK)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()

        if email:
            existing = SmartLaundryUser.objects.filter(email__iexact=email).first()
            if existing and not existing.is_active:
                return Response(
                    {"detail": "Email not verified", "not_verified": True},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if serializer.user:
            payload = {
                **serializer.validated_data,
                "user": UserInfoSerializer(serializer.user).data,
            }
        return Response(payload, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        ui_language = request.data.get("ui_language") or "en"
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = SmartLaundryUser.objects.get(email__iexact=email)

        PasswordResetToken.objects.filter(user=user, is_used=False).update(
            is_used=True
        )
        code = generate_code()
        PasswordResetToken.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        send_reset_email(email, code, ui_language)

        return Response({"detail": "Reset code sent"}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserInfoSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUsersListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = SmartLaundryUser.objects.all().order_by("id")
        serializer = UserInfoSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk: int):
        try:
            user = SmartLaundryUser.objects.get(pk=pk)
        except SmartLaundryUser.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response(
                {"detail": "Cannot modify yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = request.data.get("action")

        if action == "block":
            user.is_active = False
        elif action == "unblock":
            user.is_active = True
        elif action == "make_admin":
            user.is_staff = True
        elif action == "make_user":
            user.is_staff = False
        else:
            return Response({"detail": "Unknown action"}, status=status.HTTP_400_BAD_REQUEST)

        user.save()
        serializer = UserInfoSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
