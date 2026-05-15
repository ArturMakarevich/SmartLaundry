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

TEST_USER_COUNT = 50
USERS_PER_TERRITORY = 5

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
    help = "Seed demo territories, 50 test users (test001–test050@gmail.com / test), bookings and problem reports"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete all demo territories first")

    def handle(self, *args, **options):
        now = timezone.now()

        admin = User.objects.filter(is_staff=True).order_by("id").first()
        if not admin:
            admin = User.objects.filter(is_active=True).order_by("id").first()
        if not admin:
            self.stderr.write("No users found. Register at least one user first.")
            return

        demo_names = [name for name, _, _ in TERRITORY_DATA]

        if options["clear"]:
            deleted, _ = Territory.objects.filter(name__in=demo_names).delete()
            self.stdout.write(f"Cleared {deleted} demo territories")

        # ---- Ensure demo territories exist ----
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

            TerritoryAdminAssignment.objects.get_or_create(user=admin, territory=territory)

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

            if not InviteCode.objects.filter(territory=territory, is_active=True, expires_at__gt=now).exists():
                invite_alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                invite_code = get_random_string(length=6, allowed_chars=invite_alphabet)
                InviteCode.objects.create(
                    territory=territory,
                    code=invite_code,
                    created_by=admin,
                    expires_at=now + timedelta(hours=12),
                    is_active=True,
                )

            created_territories.append((territory, all_machines))

        # ---- Delete ALL old bookings for demo territories ----
        demo_ids = [t.id for t, _ in created_territories]
        deleted_bookings, _ = Booking.objects.filter(
            machine__zone__territory_id__in=demo_ids
        ).delete()
        self.stdout.write(f"Deleted {deleted_bookings} old bookings from demo territories")

        # Remove TerritoryAccess for non-admin, non-test users in demo territories
        import re
        test_email_pattern = re.compile(r'^test\d+@gmail\.com$')
        old_access_deleted, _ = TerritoryAccess.objects.filter(
            territory_id__in=demo_ids,
        ).exclude(
            user__email__regex=r'^test\d+@gmail\.com$'
        ).exclude(
            user__is_staff=True
        ).delete()
        self.stdout.write(f"Removed {old_access_deleted} old TerritoryAccess entries")

        # ---- Create 50 test users ----
        self.stdout.write("Creating test users...")
        test_users = []
        for i in range(1, TEST_USER_COUNT + 1):
            email = f"test{i:03d}@gmail.com"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"is_active": True},
            )
            if created or not user.has_usable_password():
                user.set_password("test")
                user.save(update_fields=["password"])
            if created:
                self.stdout.write(f"  + User: {email}")
            test_users.append(user)

        # ---- Assign 5 users per territory ----
        self.stdout.write("Assigning users to territories...")
        territory_users: list[tuple] = []
        for idx, (territory, machines) in enumerate(created_territories):
            start = (idx * USERS_PER_TERRITORY) % TEST_USER_COUNT
            assigned = [test_users[(start + j) % TEST_USER_COUNT] for j in range(USERS_PER_TERRITORY)]
            for user in assigned:
                TerritoryAccess.objects.get_or_create(user=user, territory=territory)
            territory_users.append((territory, machines, assigned))

        # ---- Bookings ----
        self.stdout.write("Creating bookings...")
        used_slots: set[tuple[int, int]] = set()

        for territory, machines, users in territory_users:
            available_machines = [m for m in machines if m.status == "available"]
            if not available_machines:
                continue

            for user in users:
                # Active bookings: 1–3 within next 3 days
                active_count = random.randint(1, 3)
                created_active = 0
                attempts = 0
                while created_active < active_count and attempts < 50:
                    attempts += 1
                    machine = random.choice(available_machines)
                    days_ahead = random.randint(0, 2)
                    day = now + timedelta(days=days_ahead)
                    min_hour = int(now.hour) + 1 if days_ahead == 0 else 8
                    if min_hour > 20:
                        continue
                    slot_hour = random.randint(min_hour, 20)
                    start_dt = day.replace(hour=slot_hour, minute=0, second=0, microsecond=0)
                    slot_key = (machine.id, int(start_dt.timestamp() // 3600))
                    if slot_key in used_slots:
                        continue
                    if start_dt <= now:
                        continue
                    end_dt = start_dt + timedelta(hours=2)
                    used_slots.add(slot_key)
                    Booking.objects.create(
                        machine=machine,
                        user=user,
                        start_time=start_dt,
                        end_time=end_dt,
                        status="active",
                    )
                    created_active += 1

                # Archived (completed) bookings: 5–10 in past 30 days
                archive_count = random.randint(5, 10)
                created_archive = 0
                attempts = 0
                while created_archive < archive_count and attempts < 100:
                    attempts += 1
                    machine = random.choice(available_machines)
                    days_ago = random.randint(1, 30)
                    day = now - timedelta(days=days_ago)
                    slot_hour = random.randint(7, 20)
                    start_dt = day.replace(hour=slot_hour, minute=0, second=0, microsecond=0)
                    slot_key = (machine.id, int(start_dt.timestamp() // 3600))
                    if slot_key in used_slots:
                        continue
                    end_dt = start_dt + timedelta(hours=2)
                    used_slots.add(slot_key)
                    Booking.objects.create(
                        machine=machine,
                        user=user,
                        start_time=start_dt,
                        end_time=end_dt,
                        status="completed",
                        confirmed_at=start_dt - timedelta(minutes=10),
                        wash_started_at=start_dt + timedelta(minutes=5),
                        estimated_wash_end_at=start_dt + timedelta(hours=1, minutes=35),
                    )
                    created_archive += 1

        # ---- Problem reports ----
        self.stdout.write("Creating problem reports...")
        for territory, machines, users in territory_users:
            if not machines or not users:
                continue
            for _ in range(random.randint(1, 3)):
                machine = random.choice(machines)
                reporter = random.choice(users)
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
            f"\nDone! {len(created_territories)} territories, {TEST_USER_COUNT} test users, bookings and reports created."
        ))
