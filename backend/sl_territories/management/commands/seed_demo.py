import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.crypto import get_random_string

from sl_territories.models import (
    Booking, InviteCode, Machine, ProblemReport, Territory,
    TerritoryAccess, TerritoryAdminAssignment, WashProgram, Zone,
)

User = get_user_model()

TERRITORY_DATA = [
    ("City Tower A", ["Floor 1", "Floor 2"], [4, 3]),
    ("City Tower B", ["Floor 1", "Floor 2", "Floor 3"], [3, 3, 2]),
    ("Riverside Complex", ["Wing East", "Wing West"], [5, 5]),
    ("Park Avenue House", ["Basement", "Ground Floor"], [4, 4]),
    ("Old Town Residences", ["Section 1", "Section 2", "Section 3"], [3, 3, 3]),
    ("Greenfield Apartments", ["Block A", "Block B"], [6, 6]),
    ("Sunset Towers", ["Level 1", "Level 2", "Level 3", "Level 4"], [2, 2, 2, 2]),
    ("Harbor View", ["North Wing", "South Wing"], [5, 4]),
    ("University District", ["Dorm A", "Dorm B", "Dorm C"], [4, 4, 4]),
    ("Central Park Lofts", ["Zone Alpha", "Zone Beta"], [7, 6]),
]

MACHINE_MODELS = [
    "Amica MAWF6102SL",
    "Samsung WW90T534DAE",
    "Bosch WAN28270PL",
    "LG F4WV509S0E",
    "Whirlpool FWDD1071682SBCEE",
    "Miele WSD323 WCS",
    "Electrolux EW6F4R28WC",
    "Indesit MTWSE61252WKEE",
    "Candy CS4 1272DE",
    "Gorenje W2NHPI72SCS",
]

PROGRAMS = [
    ("Cotton 60°C", 120),
    ("Cotton 40°C", 95),
    ("Synthetic 40°C", 65),
    ("Quick wash 30'", 30),
    ("Wool / Delicate", 55),
    ("Sports", 75),
    ("Rinse & Spin", 45),
]

PROBLEM_DESCRIPTIONS = [
    "Machine vibrates heavily during spin cycle",
    "Water doesn't drain properly after washing",
    "Door handle is broken, hard to open",
    "Machine takes too long to start",
    "Strange noise during washing",
    "Soap dispenser is stuck",
    "Display not showing program info",
    "Leaking water from the bottom",
]


def make_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = get_random_string(length=6, allowed_chars=alphabet)
        if not Territory.objects.filter(code=code).exists():
            return code


class Command(BaseCommand):
    help = "Seed demo territories, machines, bookings and problem reports"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete all demo territories first")

    def handle(self, *args, **options):
        now = timezone.now()

        # Pick admin/superadmin as creator
        admin = User.objects.filter(is_staff=True).order_by("id").first()
        if not admin:
            admin = User.objects.filter(is_active=True).order_by("id").first()
        if not admin:
            self.stderr.write("No users found. Register at least one user first.")
            return

        users = list(User.objects.filter(is_active=True).order_by("id"))
        regular_users = [u for u in users if not u.is_staff] or users

        if options["clear"]:
            demo_names = [name for name, _, _ in TERRITORY_DATA]
            deleted, _ = Territory.objects.filter(name__in=demo_names).delete()
            self.stdout.write(f"Cleared {deleted} demo territories")

        created_territories = []

        for territory_name, zone_names, machines_per_zone in TERRITORY_DATA:
            territory, created = Territory.objects.get_or_create(
                name=territory_name,
                defaults={"code": make_code(), "created_by": admin, "slot_strategy": "fixed_120"},
            )
            if created:
                self.stdout.write(f"  + Territory: {territory_name}")
            else:
                self.stdout.write(f"  ~ Territory exists: {territory_name}")

            # Assign admin
            TerritoryAdminAssignment.objects.get_or_create(user=admin, territory=territory)

            # Zones and machines
            all_machines = []
            for order, (zone_name, machine_count) in enumerate(zip(zone_names, machines_per_zone)):
                zone, _ = Zone.objects.get_or_create(
                    territory=territory, name=zone_name,
                    defaults={"order": order},
                )
                for m_num in range(1, machine_count + 1):
                    machine, m_created = Machine.objects.get_or_create(
                        zone=zone, number=m_num,
                        defaults={
                            "model_name": random.choice(MACHINE_MODELS),
                            "status": random.choices(
                                ["available", "available", "available", "broken", "inactive"],
                                weights=[70, 70, 70, 10, 5]
                            )[0],
                        },
                    )
                    if m_created:
                        for prog_name, prog_dur in random.sample(PROGRAMS, random.randint(3, 6)):
                            WashProgram.objects.get_or_create(
                                machine=machine, name=prog_name,
                                defaults={"duration_minutes": prog_dur},
                            )
                    all_machines.append(machine)

            # Grant access to all regular users
            for user in regular_users:
                TerritoryAccess.objects.get_or_create(user=user, territory=territory)

            # Active invite code
            if not InviteCode.objects.filter(territory=territory, is_active=True, expires_at__gt=now).exists():
                invite_alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                invite_code = get_random_string(length=6, allowed_chars=invite_alphabet)
                InviteCode.objects.create(
                    territory=territory,
                    code=invite_code,
                    created_by=admin,
                    expires_at=now + timedelta(days=30),
                    is_active=True,
                )

            available_machines = [m for m in all_machines if m.status == "available"]
            created_territories.append((territory, available_machines))

        # ---- Bookings ----
        self.stdout.write("Creating bookings...")

        for territory, machines in created_territories:
            if not machines or not regular_users:
                continue

            # Past completed bookings (30 days back)
            for days_ago in range(1, 31):
                day_start = now - timedelta(days=days_ago)
                day_start = day_start.replace(hour=7, minute=0, second=0, microsecond=0)
                slots_per_day = random.randint(2, min(6, len(machines) * 2))
                for _ in range(slots_per_day):
                    machine = random.choice(machines)
                    user = random.choice(regular_users)
                    slot_hour = random.randint(7, 20)
                    start = day_start.replace(hour=slot_hour, minute=0)
                    end = start + timedelta(hours=2)
                    if not Booking.objects.filter(machine=machine, start_time=start).exists():
                        Booking.objects.create(
                            machine=machine,
                            user=user,
                            start_time=start,
                            end_time=end,
                            status="completed",
                            confirmed_at=start - timedelta(minutes=10),
                            wash_started_at=start + timedelta(minutes=5),
                            estimated_wash_end_at=start + timedelta(hours=1, minutes=35),
                        )

            # Active bookings (today and next 3 days)
            for days_ahead in range(0, 4):
                day = now + timedelta(days=days_ahead)
                for machine in random.sample(machines, min(3, len(machines))):
                    user = random.choice(regular_users)
                    slot_hour = random.randint(int(now.hour) + 1 if days_ahead == 0 else 8, 20)
                    start = day.replace(hour=slot_hour, minute=0, second=0, microsecond=0)
                    end = start + timedelta(hours=2)
                    if start > now and not Booking.objects.filter(machine=machine, start_time=start).exists():
                        Booking.objects.create(
                            machine=machine,
                            user=user,
                            start_time=start,
                            end_time=end,
                            status="active",
                        )

        # ---- Problem reports ----
        self.stdout.write("Creating problem reports...")
        for territory, machines in created_territories:
            if not machines or not regular_users:
                continue
            for _ in range(random.randint(1, 3)):
                machine = random.choice(machines)
                reporter = random.choice(regular_users)
                pr_type = random.choice(["machine_broken", "water_leak", "noise", "other"])
                status = random.choice(["open", "open", "in_progress", "resolved"])
                resolved_at = now - timedelta(days=random.randint(1, 5)) if status == "resolved" else None
                ProblemReport.objects.create(
                    territory=territory,
                    zone=machine.zone,
                    machine=machine,
                    reported_by=reporter,
                    type=pr_type,
                    description=random.choice(PROBLEM_DESCRIPTIONS),
                    status=status,
                    resolved_at=resolved_at,
                    resolved_by=admin if resolved_at else None,
                )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! {len(created_territories)} territories, users assigned, bookings and reports created."
        ))
