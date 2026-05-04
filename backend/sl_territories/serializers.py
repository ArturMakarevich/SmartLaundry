from rest_framework import serializers
from django.utils import timezone
from sl_accounts.serializers import UserInfoSerializer
from .models import (
    Territory,
    Zone,
    Machine,
    WashProgram,
    TerritoryAccess,
    Booking,
    InstructionTemplate,
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

    class Meta:
        model = Territory
        fields = ("id", "name", "code", "zones")

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
        instance.save(update_fields=["name"])

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

    class Meta:
        model = Booking
        fields = (
            "id",
            "machine",
            "user",
            "start_time",
            "end_time",
            "status",
            "created_at",
        )
        read_only_fields = ("status", "created_at")

    def validate(self, attrs):
        start = attrs.get("start_time")
        end = attrs.get("end_time")
        machine = attrs.get("machine")
        if not start or not end or not machine:
            raise serializers.ValidationError("machine, start_time and end_time are required")
        if end <= start:
            raise serializers.ValidationError("end_time must be greater than start_time")
        overlap = Booking.objects.filter(
            machine=machine,
            status=Booking.STATUS_ACTIVE,
            start_time__lt=end,
            end_time__gt=start,
        )
        if overlap.exists():
            raise serializers.ValidationError("Slot overlaps with existing booking")
        if start < timezone.now():
            raise serializers.ValidationError("Cannot book in the past")
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
