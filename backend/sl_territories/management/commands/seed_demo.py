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
    ("City Tower A",          ["Floor 1", "Floor 2"],                    [4, 3]),
    ("City Tower B",          ["Floor 1", "Floor 2", "Floor 3"],         [3, 3, 2]),
    ("Riverside Complex",     ["Wing East", "Wing West"],                 [5, 5]),
    ("Park Avenue House",     ["Basement", "Ground Floor"],              [4, 4]),
    ("Old Town Residences",   ["Section 1", "Section 2", "Section 3"],   [3, 3, 3]),
    ("Greenfield Apartments", ["Block A", "Block B"],                    [6, 6]),
    ("Sunset Towers",         ["Level 1", "Level 2", "Level 3", "Level 4"], [2, 2, 2, 2]),
    ("Harbor View",           ["North Wing", "South Wing"],              [5, 4]),
    ("University District",   ["Dorm A", "Dorm B", "Dorm C"],            [4, 4, 4]),
    ("Central Park Lofts",    ["Zone Alpha", "Zone Beta"],               [7, 6]),
]

MACHINE_MODELS = [
    "Amica MAWF6102SL", "Samsung WW90T534DAE", "Bosch WAN28270PL",
    "LG F4WV509S0E", "Whirlpool FWDD1071682SBCEE", "Miele WSD323 WCS",
    "Electrolux EW6F4R28WC", "Indesit MTWSE61252WKEE",
    "Candy CS4 1272DE", "Gorenje W2NHPI72SCS",
]

PROGRAMS = [
    ("Cotton 60°C",    120),
    ("Cotton 40°C",     95),
    ("Synthetic 40°C",  65),
    ("Quick wash 30'",  30),
    ("Wool / Delicate", 55),
    ("Sports",          75),
    ("Rinse & Spin",    45),
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

TEST_USER_COUNT = 50
TEST_USER_PASSWORD = "test"
USERS_PER_TERRITORY = TEST_USER_COUNT // len(TERRITORY_DATA)   # 5


def make_territory_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = get_random_string(length=6, allowed_chars=alphabet)
        if not Territory.objects.filter(code=code).exists():
            return code


class Command(BaseCommand):
    help = "Seed demo territories with 50 test users and realistic bookings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all demo territories (and everything inside) before seeding",
        )

    def handle(self, *args, **options):
        now = timezone.now()

        # ── Admin user ────────────────────────────────────────────────
        admin = User.objects.filter(is_staff=True).order_by("id").first()
        if not admin:
            self.stderr.write("No staff user found. Create a superuser first.")
            return

        # ── Optional full reset ───────────────────────────────────────
        if options["clear"]:
            demo_names = [name for name, _, _ in TERRITORY_DATA]
            deleted, _ = Territory.objects.filter(name__in=demo_names).delete()
            self.stdout.write(f"Cleared {deleted} demo territories and all related data")

        # ── 1. Build / verify territories ─────────────────────────────
        self.stdout.write("Setting up territories…")
        created_territories = []

        for territory_name, zone_names, machines_per_zone in TERRITORY_DATA:
            territory, t_created = Territory.objects.get_or_create(
                name=territory_name,
                defaults={"code": make_territory_code(), "created_by": admin, "slot_strategy": "fixed_120"},
            )
            label = "+" if t_created else "~"
            self.stdout.write(f"  {label} {territory_name}")

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
                                weights=[70, 70, 70, 10, 5],
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

            # Invite code
            if not InviteCode.objects.filter(territory=territory, is_active=True, expires_at__gt=now).exists():
                inv_alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                InviteCode.objects.create(
                    territory=territory,
                    code=get_random_string(length=6, allowed_chars=inv_alphabet),
                    created_by=admin,
                    expires_at=now + timedelta(hours=12),
                    is_active=True,
                )

            available_machines = [m for m in all_machines if m.status == "available"]
            created_territories.append((territory, available_machines))

        # ── 2. Delete OLD bookings in demo territories ─────────────────
        self.stdout.write("Removing old demo bookings…")
        demo_ids = [t.id for t, _ in created_territories]
        deleted_b, _ = Booking.objects.filter(
            machine__zone__territory_id__in=demo_ids
        ).delete()
        self.stdout.write(f"  Removed {deleted_b} old bookings")

        # Remove old TerritoryAccess for non-test, non-admin users
        old_access = TerritoryAccess.objects.filter(
            territory_id__in=demo_ids,
        ).exclude(
            user__email__regex=r'^test\d+@gmail\.com$',
        ).exclude(
            user__is_staff=True,
        )
        deleted_a, _ = old_access.delete()
        self.stdout.write(f"  Removed {deleted_a} old territory access entries")

        # ── 3. Create 50 test users ────────────────────────────────────
        self.stdout.write(f"Creating {TEST_USER_COUNT} test users…")
        test_users = []
        for i in range(1, TEST_USER_COUNT + 1):
            email = f"test{str(i).zfill(3)}@gmail.com"
            user, u_created = User.objects.get_or_create(
                email=email,
                defaults={"is_active": True, "role": "user"},
            )
            if u_created:
                user.set_password(TEST_USER_PASSWORD)
                user.save(update_fields=["password"])
            elif not user.is_active:
                user.is_active = True
                user.save(update_fields=["is_active"])
            test_users.append(user)
        self.stdout.write(f"  {TEST_USER_COUNT} test users ready (password: {TEST_USER_PASSWORD!r})")

        # ── 4. Assign 5 users per territory ───────────────────────────
        self.stdout.write("Assigning users to territories…")
        for idx, (territory, _) in enumerate(created_territories):
            chunk_start = idx * USERS_PER_TERRITORY
            chunk_end = chunk_start + USERS_PER_TERRITORY
            for user in test_users[chunk_start:chunk_end]:
                TerritoryAccess.objects.get_or_create(user=user, territory=territory)

        # ── 5. Create bookings ─────────────────────────────────────────
        self.stdout.write("Creating bookings…")
        total_active = 0
        total_archived = 0

        for idx, (territory, machines) in enumerate(created_territories):
            if not machines:
                continue

            chunk_start = idx * USERS_PER_TERRITORY
            chunk_end = chunk_start + USERS_PER_TERRITORY
            territory_users = test_users[chunk_start:chunk_end]

            used_slots: set[tuple[int, int]] = set()   # (machine_id, hour_offset)

            def make_slot(machine, start_dt):
                end_dt = start_dt + timedelta(hours=2)
                key = (machine.id, int(start_dt.timestamp() // 3600))
                if key in used_slots:
                    return None
                if Booking.objects.filter(machine=machine, start_time=start_dt).exists():
                    return None
                used_slots.add(key)
                return (start_dt, end_dt)

            for user in territory_users:
                # Active bookings (1–3, within next 3 days)
                active_count = random.randint(1, 3)
                created_active = 0
                attempts = 0
                while created_active < active_count and attempts < 30:
                    attempts += 1
                    machine = random.choice(machines)
                    days_ahead = random.randint(0, 2)
                    hour = random.randint(8, 20)
                    start = (now + timedelta(days=days_ahead)).replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    if start <= now:
                        start += timedelta(days=1)
                    slot = make_slot(machine, start)
                    if slot is None:
                        continue
                    Booking.objects.create(
                        machine=machine, user=user,
                        start_time=slot[0], end_time=slot[1],
                        status="active",
                        client_timezone_offset=0,
                    )
                    created_active += 1
                    total_active += 1

                # Archived bookings (5–10, last 30 days)
                archive_count = random.randint(5, 10)
                created_archive = 0
                attempts = 0
                while created_archive < archive_count and attempts < 50:
                    attempts += 1
                    machine = random.choice(machines)
                    days_ago = random.randint(1, 30)
                    hour = random.randint(8, 20)
                    start = (now - timedelta(days=days_ago)).replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    slot = make_slot(machine, start)
                    if slot is None:
                        continue
                    Booking.objects.create(
                        machine=machine, user=user,
                        start_time=slot[0], end_time=slot[1],
                        status="completed",
                        client_timezone_offset=0,
                        confirmed_at=slot[0] + timedelta(minutes=5),
                        wash_started_at=slot[0] + timedelta(minutes=5),
                        estimated_wash_end_at=slot[0] + timedelta(minutes=random.choice([65, 95, 125])),
                    )
                    created_archive += 1
                    total_archived += 1

        # ── 6. Problem reports ────────────────────────────────────────
        self.stdout.write("Creating problem reports…")
        for territory, machines in created_territories:
            chunk_start = [t.id for t, _ in created_territories].index(territory.id) * USERS_PER_TERRITORY
            reporters = test_users[chunk_start:chunk_start + USERS_PER_TERRITORY]
            if not machines or not reporters:
                continue
            for _ in range(random.randint(1, 3)):
                machine = random.choice(machines)
                reporter = random.choice(reporters)
                pr_status = random.choice(["open", "open", "in_progress", "resolved"])
                resolved_at = now - timedelta(days=random.randint(1, 5)) if pr_status == "resolved" else None
                ProblemReport.objects.create(
                    territory=territory,
                    zone=machine.zone,
                    machine=machine,
                    reported_by=reporter,
                    type=random.choice(["machine_broken", "water_leak", "noise", "other"]),
                    description=random.choice(PROBLEM_DESCRIPTIONS),
                    status=pr_status,
                    resolved_at=resolved_at,
                    resolved_by=admin if resolved_at else None,
                )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone!\n"
            f"  Territories : {len(created_territories)}\n"
            f"  Test users  : {TEST_USER_COUNT} (test001–test050@gmail.com / {TEST_USER_PASSWORD!r})\n"
            f"  Users/territory: {USERS_PER_TERRITORY}\n"
            f"  Active bookings  : {total_active}\n"
            f"  Archived bookings: {total_archived}\n"
        ))
