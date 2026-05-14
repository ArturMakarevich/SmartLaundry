from django.contrib import admin
from .models import (
    Territory,
    Zone,
    Machine,
    WashProgram,
    TerritoryAccess,
    TerritoryAdminAssignment,
    TerritoryUserBlock,
    Booking,
    ReservationStatusHistory,
    InstructionTemplate,
    UserNotification,
    InviteCode,
    ProblemReport,
)


@admin.register(Territory)
class TerritoryAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "slot_strategy", "created_at")
    search_fields = ("name", "code")


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "territory", "order")
    list_filter = ("territory",)


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ("zone", "number", "model_name", "status", "instructions_found")
    list_filter = ("zone", "status")


@admin.register(WashProgram)
class WashProgramAdmin(admin.ModelAdmin):
    list_display = ("machine", "name", "duration_minutes")


@admin.register(InstructionTemplate)
class InstructionTemplateAdmin(admin.ModelAdmin):
    list_display = ("model_name", "created_at")


@admin.register(TerritoryAccess)
class TerritoryAccessAdmin(admin.ModelAdmin):
    list_display = ("user", "territory", "added_at")
    list_filter = ("territory",)


@admin.register(TerritoryAdminAssignment)
class TerritoryAdminAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "territory", "created_at")
    list_filter = ("territory",)
    search_fields = ("user__email", "territory__name", "territory__code")


@admin.register(TerritoryUserBlock)
class TerritoryUserBlockAdmin(admin.ModelAdmin):
    list_display = ("user", "territory", "is_active", "blocked_by", "updated_at")
    list_filter = ("territory", "is_active")
    search_fields = ("user__email", "territory__name", "territory__code")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("machine", "user", "start_time", "end_time", "status")
    list_filter = ("status", "machine")


@admin.register(ReservationStatusHistory)
class ReservationStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("booking", "previous_status", "new_status", "changed_by", "created_at")
    list_filter = ("new_status",)


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "type", "is_read", "created_at")
    list_filter = ("type", "is_read")
    search_fields = ("title", "message", "user__email")


@admin.register(InviteCode)
class InviteCodeAdmin(admin.ModelAdmin):
    list_display = ("territory", "code", "is_active", "expires_at", "created_by", "created_at")
    list_filter = ("territory", "is_active")
    search_fields = ("code", "territory__name")
    readonly_fields = ("created_at",)


@admin.register(ProblemReport)
class ProblemReportAdmin(admin.ModelAdmin):
    list_display = ("territory", "machine", "type", "status", "reported_by", "created_at")
    list_filter = ("territory", "status", "type")
    search_fields = ("description", "territory__name", "reported_by__email")
    readonly_fields = ("created_at",)
