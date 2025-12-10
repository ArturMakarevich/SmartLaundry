from django.contrib import admin
from .models import SmartLaundryUser, EmailVerificationCode, PasswordResetToken


@admin.register(SmartLaundryUser)
class SmartLaundryUserAdmin(admin.ModelAdmin):
    list_display = ("email", "public_id", "role", "is_active", "is_staff", "is_superuser", "date_joined")
    search_fields = ("email",)
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    readonly_fields = ("public_id", "date_joined")


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "is_used", "expires_at", "created_at")
    search_fields = ("user__email", "code")
    list_filter = ("is_used",)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "is_used", "expires_at", "created_at")
    search_fields = ("user__email", "code")
    list_filter = ("is_used",)
