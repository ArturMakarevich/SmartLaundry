from django.db import models
from django.conf import settings


class Territory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=16, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="territories_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class InstructionTemplate(models.Model):
    model_name = models.CharField(max_length=255, unique=True)
    file = models.FileField(upload_to="instructions/")
    parsed_programs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.model_name


class Zone(models.Model):
    territory = models.ForeignKey(
        Territory, on_delete=models.CASCADE, related_name="zones"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("territory", "name")
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.territory.name} / {self.name}"


class Machine(models.Model):
    STATUS_AVAILABLE = "available"
    STATUS_BROKEN = "broken"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_BROKEN, "Broken"),
    ]

    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name="machines")
    number = models.PositiveIntegerField()
    model_name = models.CharField(max_length=255, blank=True, default="")
    instructions_found = models.BooleanField(default=False)
    instruction_template = models.ForeignKey(
        InstructionTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="machines",
    )
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_AVAILABLE
    )

    class Meta:
        unique_together = ("zone", "number")
        ordering = ["number", "id"]

    def __str__(self) -> str:
        return f"{self.zone.name} #{self.number}"


class WashProgram(models.Model):
    machine = models.ForeignKey(
        Machine, on_delete=models.CASCADE, related_name="programs"
    )
    name = models.CharField(max_length=255)
    duration_minutes = models.PositiveIntegerField()

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.machine} - {self.name}"


class TerritoryAccess(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="territory_access",
    )
    territory = models.ForeignKey(
        Territory, on_delete=models.CASCADE, related_name="accesses"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "territory")
        ordering = ["-added_at"]


class Booking(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_CANCELLED = "cancelled"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_COMPLETED, "Completed"),
    ]

    machine = models.ForeignKey(
        Machine, on_delete=models.CASCADE, related_name="bookings"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time", "id"]
        indexes = [
            models.Index(fields=["machine", "start_time", "end_time"]),
        ]

    def __str__(self) -> str:
        return f"{self.machine} {self.start_time} - {self.end_time}"
