from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class SmartLaundryUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        if "role" not in extra_fields:
            extra_fields["role"] = "user"
        user = self.model(email=email, is_active=False, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "superadmin")
        user = self.create_user(email=email, password=password, **extra_fields)
        user.is_active = True
        user.save(using=self._db)
        return user


class SmartLaundryUser(AbstractBaseUser, PermissionsMixin):
    ROLE_USER = "user"
    ROLE_ADMIN = "admin"
    ROLE_SUPERADMIN = "superadmin"

    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_SUPERADMIN, "Super admin"),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    public_id = models.PositiveIntegerField(unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = SmartLaundryUserManager()

    def save(self, *args, **kwargs):
        if self.public_id is None:
            last = SmartLaundryUser.objects.order_by("-public_id").first()
            next_id = 1
            if last and last.public_id is not None:
                next_id = last.public_id + 1
            self.public_id = next_id
        super().save(*args, **kwargs)

    @property
    def display_id(self) -> int:
        return self.public_id or self.pk

    def __str__(self) -> str:
        return self.email


class EmailVerificationCode(models.Model):
    user = models.ForeignKey(SmartLaundryUser, on_delete=models.CASCADE, related_name="email_codes")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["code", "user"]),
        ]


class PasswordResetToken(models.Model):
    user = models.ForeignKey(SmartLaundryUser, on_delete=models.CASCADE, related_name="password_reset_tokens")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["code", "user"]),
        ]
