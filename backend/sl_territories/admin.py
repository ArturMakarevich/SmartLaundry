from django.contrib import admin
from .models import Territory, Zone, Machine, WashProgram, TerritoryAccess, Booking, InstructionTemplate


@admin.register(Territory)
class TerritoryAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "created_at")
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


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("machine", "user", "start_time", "end_time", "status")
    list_filter = ("status", "machine")
