from django.db import models
from django.conf import settings


class Territory(models.Model):
    SLOT_STRATEGY_AUTO = "auto"
    SLOT_STRATEGY_FIXED_120 = "fixed_120"
    SLOT_STRATEGY_CHOICES = [
        (SLOT_STRATEGY_AUTO, "Max program duration rounded to 30 minutes"),
        (SLOT_STRATEGY_FIXED_120, "Fixed average 2-hour slots"),
    ]

    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=16, unique=True)
    slot_strategy = models.CharField(
        max_length=16,
        choices=SLOT_STRATEGY_CHOICES,
        default=SLOT_STRATEGY_AUTO,
    )
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

    @property
    def booking_slot_minutes(self) -> int:
        return 120


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
    STATUS_ACTIVE = "active"
    STATUS_AVAILABLE = "available"
    STATUS_BUSY = "busy"
    STATUS_INACTIVE = "inactive"
    STATUS_BROKEN = "broken"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_AVAILABLE, "Available"),
        (STATUS_BUSY, "Busy"),
        (STATUS_INACTIVE, "Inactive"),
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
    no_show_count = models.PositiveIntegerField(default=0)
    penalty_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "territory")
        ordering = ["-added_at"]

    def effective_booking_limit(self, now=None) -> int:
        from django.utils import timezone as tz
        if now is None:
            now = tz.now()
        if self.penalty_until and self.penalty_until > now:
            return max(1, 3 - self.no_show_count)
        return 3


class TerritoryAdminAssignment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="territory_admin_assignments",
    )
    territory = models.ForeignKey(
        Territory,
        on_delete=models.CASCADE,
        related_name="admin_assignments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "territory")
        ordering = ["territory__name", "user__email"]

    def __str__(self) -> str:
        return f"{self.user} -> {self.territory}"


class TerritoryUserBlock(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="territory_blocks",
    )
    territory = models.ForeignKey(
        Territory,
        on_delete=models.CASCADE,
        related_name="user_blocks",
    )
    blocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="territory_blocks_created",
    )
    reason = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "territory")
        indexes = [
            models.Index(fields=["territory", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} blocked in {self.territory}: {self.is_active}"


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
    client_timezone_offset = models.IntegerField(null=True, blank=True)
    selected_program_name = models.CharField(max_length=255, blank=True, default="")
    selected_program_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    wash_started_at = models.DateTimeField(null=True, blank=True)
    estimated_wash_end_at = models.DateTimeField(null=True, blank=True)
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


class ReservationStatusHistory(models.Model):
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    previous_status = models.CharField(max_length=16, blank=True, default="")
    new_status = models.CharField(max_length=16)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="booking_status_changes",
    )
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.booking_id}: {self.previous_status} -> {self.new_status}"


class UserNotification(models.Model):
    TYPE_BOOKING_START_SOON = "booking_start_soon"
    TYPE_WASH_TIMER_STARTED = "wash_timer_started"
    TYPE_WASH_COMPLETED = "wash_completed"
    TYPE_BOOKING_ENDED = "booking_ended"
    TYPE_MACHINE_UNAVAILABLE = "machine_unavailable"
    TYPE_BOOKING_CANCELLED = "booking_cancelled"
    TYPE_USER_BLOCKED = "user_blocked"
    TYPE_USER_UNBLOCKED = "user_unblocked"
    TYPE_RESERVATION_CONFIRMED = "reservation_confirmed"
    TYPE_TERRITORY_DELETED = "territory_deleted"
    TYPE_PROBLEM_REPORT = "problem_report"
    TYPE_CHOICES = [
        (TYPE_BOOKING_START_SOON, "Booking starts soon"),
        (TYPE_WASH_TIMER_STARTED, "Wash timer started"),
        (TYPE_WASH_COMPLETED, "Wash completed"),
        (TYPE_BOOKING_ENDED, "Booking ended"),
        (TYPE_MACHINE_UNAVAILABLE, "Machine became unavailable"),
        (TYPE_BOOKING_CANCELLED, "Booking cancelled"),
        (TYPE_USER_BLOCKED, "User blocked"),
        (TYPE_USER_UNBLOCKED, "User unblocked"),
        (TYPE_RESERVATION_CONFIRMED, "Reservation confirmed"),
        (TYPE_TERRITORY_DELETED, "Territory deleted"),
        (TYPE_PROBLEM_REPORT, "Problem report"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="laundry_notifications",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    territory = models.ForeignKey(
        "Territory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_notifications",
    )
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        unique_together = ("user", "booking", "type")
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} / {self.title}"


class InviteCode(models.Model):
    territory = models.ForeignKey(
        Territory, on_delete=models.CASCADE, related_name="invite_codes"
    )
    code = models.CharField(max_length=16, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invite_codes_created",
    )
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self) -> bool:
        from django.utils import timezone as tz
        return self.is_active and self.expires_at > tz.now()

    def __str__(self) -> str:
        return f"{self.territory.name} / {self.code}"


class ProblemReport(models.Model):
    TYPE_MACHINE_BROKEN = "machine_broken"
    TYPE_WATER_LEAK = "water_leak"
    TYPE_NOISE = "noise"
    TYPE_OTHER = "other"
    TYPE_CHOICES = [
        (TYPE_MACHINE_BROKEN, "Machine broken"),
        (TYPE_WATER_LEAK, "Water leak"),
        (TYPE_NOISE, "Noise"),
        (TYPE_OTHER, "Other"),
    ]

    STATUS_OPEN = "open"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_RESOLVED, "Resolved"),
    ]

    territory = models.ForeignKey(
        Territory, on_delete=models.CASCADE, related_name="problem_reports"
    )
    zone = models.ForeignKey(
        Zone, null=True, blank=True, on_delete=models.SET_NULL, related_name="problem_reports"
    )
    machine = models.ForeignKey(
        Machine, null=True, blank=True, on_delete=models.SET_NULL, related_name="problem_reports"
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="problem_reports",
    )
    type = models.CharField(max_length=32, choices=TYPE_CHOICES, default=TYPE_OTHER)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="problem_reports_resolved",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.territory.name}: {self.type} ({self.status})"
