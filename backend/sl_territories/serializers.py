from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from sl_accounts.serializers import UserInfoSerializer
from .models import (
    Territory,
    Zone,
    Machine,
    WashProgram,
    TerritoryAccess,
    TerritoryUserBlock,
    Booking,
    InstructionTemplate,
    UserNotification,
)


class WashProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashProgram
        fields = ("id", "name", "duration_minutes")


class MachineSerializer(serializers.ModelSerializer):
    programs = WashProgramSerializer(many=True)
    instruction_file = serializers.SerializerMethodField()

    class Meta:
        model = Machine
        fields = (
            "id",
            "number",
            "model_name",
            "instructions_found",
            "instruction_template",
            "instruction_file",
            "status",
            "programs",
        )

    def get_instruction_file(self, obj):
        if obj.instruction_template and obj.instruction_template.file:
            request = self.context.get("request")
            url = obj.instruction_template.file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class ZoneSerializer(serializers.ModelSerializer):
    machines = MachineSerializer(many=True)

    class Meta:
        model = Zone
        fields = ("id", "name", "description", "order", "machines")


class TerritorySerializer(serializers.ModelSerializer):
    zones = ZoneSerializer(many=True)
    booking_slot_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Territory
        fields = ("id", "name", "code", "slot_strategy", "booking_slot_minutes", "zones")

    def create(self, validated_data):
        zones_data = validated_data.pop("zones", [])
        territory = Territory.objects.create(**validated_data)
        for idx, zone_data in enumerate(zones_data):
            machines_data = zone_data.pop("machines", [])
            order = zone_data.pop("order", idx)
            zone = Zone.objects.create(territory=territory, order=order, **zone_data)
            for machine_idx, machine_data in enumerate(machines_data):
                programs_data = machine_data.pop("programs", [])
                model_name = machine_data.get("model_name", "").strip()
                template = None
                if model_name:
                    template = InstructionTemplate.objects.filter(
                        model_name__iexact=model_name
                    ).first()
                machine_number = machine_data.pop("number", machine_idx + 1)
                machine = Machine.objects.create(
                    zone=zone, number=machine_number, **machine_data
                )
                if template:
                    machine.instruction_template = template
                    machine.instructions_found = True
                    machine.save(update_fields=["instruction_template", "instructions_found"])
                    for program_data in template.parsed_programs:
                        WashProgram.objects.create(
                            machine=machine,
                            name=program_data.get("name", "Program"),
                            duration_minutes=program_data.get("duration_minutes", 0),
                        )
                    continue
                for program_data in programs_data:
                    WashProgram.objects.create(machine=machine, **program_data)
        return territory

    def update(self, instance, validated_data):
        zones_data = validated_data.pop("zones", [])
        instance.name = validated_data.get("name", instance.name)
        instance.slot_strategy = validated_data.get("slot_strategy", instance.slot_strategy)
        instance.save(update_fields=["name", "slot_strategy"])

        instance.zones.all().delete()
        for idx, zone_data in enumerate(zones_data):
            machines_data = zone_data.pop("machines", [])
            order = zone_data.pop("order", idx)
            zone = Zone.objects.create(territory=instance, order=order, **zone_data)
            for machine_idx, machine_data in enumerate(machines_data):
                programs_data = machine_data.pop("programs", [])
                model_name = machine_data.get("model_name", "").strip()
                template = None
                if model_name:
                    template = InstructionTemplate.objects.filter(
                        model_name__iexact=model_name
                    ).first()
                machine_number = machine_data.pop("number", machine_idx + 1)
                machine = Machine.objects.create(
                    zone=zone, number=machine_number, **machine_data
                )
                if template:
                    machine.instruction_template = template
                    machine.instructions_found = True
                    machine.save(update_fields=["instruction_template", "instructions_found"])
                    for program_data in template.parsed_programs:
                        WashProgram.objects.create(
                            machine=machine,
                            name=program_data.get("name", "Program"),
                            duration_minutes=program_data.get("duration_minutes", 0),
                        )
                    continue
                for program_data in programs_data:
                    WashProgram.objects.create(machine=machine, **program_data)
        return instance


class TerritoryAccessSerializer(serializers.ModelSerializer):
    territory = TerritorySerializer()

    class Meta:
        model = TerritoryAccess
        fields = ("territory", "added_at")


class BookingSerializer(serializers.ModelSerializer):
    user = UserInfoSerializer(read_only=True)
    machine_number = serializers.IntegerField(source="machine.number", read_only=True)
    machine_model = serializers.CharField(source="machine.model_name", read_only=True)
    machine_programs = WashProgramSerializer(source="machine.programs", many=True, read_only=True)
    zone_name = serializers.CharField(source="machine.zone.name", read_only=True)
    zone_description = serializers.CharField(source="machine.zone.description", read_only=True)
    territory_name = serializers.CharField(source="machine.zone.territory.name", read_only=True)
    client_timezone_offset = serializers.IntegerField(write_only=True, required=False)
    selected_program_name = serializers.CharField(required=False, allow_blank=True)
    selected_program_duration_minutes = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "machine",
            "machine_number",
            "machine_model",
            "machine_programs",
            "zone_name",
            "zone_description",
            "territory_name",
            "user",
            "start_time",
            "end_time",
            "status",
            "created_at",
            "client_timezone_offset",
            "selected_program_name",
            "selected_program_duration_minutes",
            "confirmed_at",
            "wash_started_at",
            "estimated_wash_end_at",
            "confirmation_extended",
        )
        read_only_fields = (
            "user",
            "status",
            "created_at",
            "confirmed_at",
            "wash_started_at",
            "estimated_wash_end_at",
            "confirmation_extended",
        )

    # Pełna walidacja rezerwacji: dostęp, blokada, wzorzec slotów, limit 3 rezerwacji,
    # jedna pralka dziennie, nakładanie się z istniejącymi — wszystko przed zapisem
    def validate(self, attrs):
        start = attrs.get("start_time")
        end = attrs.get("end_time")
        machine = attrs.get("machine")
        if not start or not end or not machine:
            raise serializers.ValidationError("machine, start_time and end_time are required")
        if machine.status in {Machine.STATUS_INACTIVE, Machine.STATUS_BROKEN}:
            raise serializers.ValidationError("This washing machine is not available for reservations")
        request = self.context.get("request")
        territory = machine.zone.territory
        if request and request.user and request.user.is_authenticated:
            if not TerritoryAccess.objects.filter(
                user=request.user,
                territory=territory,
            ).exists():
                raise serializers.ValidationError("You don't have access to this territory")
            if TerritoryUserBlock.objects.filter(
                user=request.user,
                territory=territory,
                is_active=True,
            ).exists():
                raise serializers.ValidationError("You are blocked in this territory")
        if end <= start:
            raise serializers.ValidationError("end_time must be greater than start_time")
        slot_minutes = int((end - start).total_seconds() // 60)
        selected_duration = attrs.get("selected_program_duration_minutes")
        if selected_duration is not None:
            if selected_duration <= 0:
                raise serializers.ValidationError("Selected program duration must be greater than zero")
            if slot_minutes < selected_duration:
                raise serializers.ValidationError("Booking must cover the selected washing mode duration")
        window_start = timezone.localtime(timezone.now()).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        window_end = window_start + timedelta(days=3)
        local_start = timezone.localtime(start)
        if local_start < window_start or local_start >= window_end:
            raise serializers.ValidationError("Bookings are only available for the next 3 days")
        if request and request.user and request.user.is_authenticated:
            try:
                access = TerritoryAccess.objects.get(user=request.user, territory=territory)
                effective_limit = access.effective_booking_limit()
            except TerritoryAccess.DoesNotExist:
                effective_limit = 3
            existing_count = Booking.objects.filter(
                user=request.user,
                status=Booking.STATUS_ACTIVE,
                start_time__gte=window_start,
                start_time__lt=window_end,
            ).count()
            if existing_count >= effective_limit:
                raise serializers.ValidationError(
                    f"Booking limit reached. You already have {existing_count} active bookings "
                    f"(limit: {effective_limit})."
                )
        if self._overlap_exists(machine, start, end):
            raise serializers.ValidationError("Slot overlaps with existing booking")
        if start < timezone.now():
            raise serializers.ValidationError("Cannot book in the past")
        return attrs

    def create(self, validated_data):
        from django.db import transaction

        validated_data["user"] = self.context["request"].user
        machine = validated_data["machine"]
        start = validated_data["start_time"]
        end = validated_data["end_time"]
        # select_for_update blokuje wiersz maszyny w DB — zapobiega podwójnej rezerwacji
        # gdy dwóch użytkowników rezerwuje ten sam slot dokładnie w tym samym momencie
        with transaction.atomic():
            Machine.objects.select_for_update().get(pk=machine.pk)
            if self._overlap_exists(machine, start, end):
                raise serializers.ValidationError("Slot overlaps with existing booking")
            return super().create(validated_data)

    @staticmethod
    def _overlap_exists(machine, start, end) -> bool:
        return Booking.objects.filter(
            machine=machine,
            status=Booking.STATUS_ACTIVE,
            start_time__lt=end,
            end_time__gt=start,
        ).exists()



class UserNotificationSerializer(serializers.ModelSerializer):
    territory_id = serializers.IntegerField(source="territory_id", read_only=True)

    class Meta:
        model = UserNotification
        fields = (
            "id",
            "type",
            "title",
            "message",
            "is_read",
            "created_at",
            "booking",
            "territory_id",
        )
        read_only_fields = fields
