from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    ResendVerificationCodeView,
    VerifyEmailView,
    LoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    MeView,
    AdminUsersListView,
    AdminUserActionView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("register/resend-code/", ResendVerificationCodeView.as_view(), name="resend_verification_code"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("login/", LoginView.as_view(), name="login"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("admin/users/", AdminUsersListView.as_view(), name="admin_users"),
    path("admin/users/<int:pk>/action/", AdminUserActionView.as_view(), name="admin_user_action"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
