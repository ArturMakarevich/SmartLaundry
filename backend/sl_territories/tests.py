import threading
from datetime import timedelta
from unittest.mock import Mock

from django.db import connection
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.utils import timezone

from .instruction_parser import (
    DEFAULT_PROGRAMS,
    cleanup_programs,
    looks_like_program_name,
    parse_duration_minutes,
    parse_instruction_programs,
    parse_programs_from_tables,
    parse_programs_from_text,
)
from .models import (
    Booking,
    Machine,
    ReservationStatusHistory,
    Territory,
    TerritoryAccess,
    TerritoryUserBlock,
    Zone,
)
from .serializers import BookingSerializer
from .tasks import auto_cancel_unconfirmed_booking



class InstructionParserTests(SimpleTestCase):
    def test_parse_polish_program_table_lines(self):
        text = """
        TABELA PROGRAMÓW
        Nazwa programu Temperatura Czas [h:min]
        Bawełna szybki 60° 1000 4,5 + x l 01:53 Średnio zabrudzona odzież
        Syntetyki 40° 700 2,0 - x l 01:40 Lekko zabrudzona odzież
        Wełna 40° 500 1,0 - x l 01:25 Delikatny program
        """

        programs = parse_programs_from_text(text)

        self.assertIn({"name": "Bawełna szybki 60°", "duration_minutes": 113}, programs)
        self.assertIn({"name": "Syntetyki 40°", "duration_minutes": 100}, programs)
        self.assertIn({"name": "Wełna 40°", "duration_minutes": 85}, programs)

    def test_parse_english_consumption_values(self):
        text = """
        Consumption values
        Programme Temperature Load (kg) Energy Water Programme duration
        Cottons 40 9.0 1.250 91.0 3:30
        Easy Care 40 4.0 0.780 62.0 2:30
        Mix 40 4.0 0.620 44.0 1:00
        Delicates/ 30 2.0 0.220 36.0 0:45
        Silk
        """

        programs = parse_programs_from_text(text)

        self.assertIn({"name": "Cottons 40°", "duration_minutes": 210}, programs)
        self.assertIn({"name": "Easy Care 40°", "duration_minutes": 150}, programs)
        self.assertIn({"name": "Mix 40°", "duration_minutes": 60}, programs)
        self.assertIn({"name": "Delicates/Silk 30°", "duration_minutes": 45}, programs)

    def test_parse_polish_duration_words(self):
        self.assertEqual(parse_duration_minutes("2 godz. 10 min"), 130)
        self.assertEqual(parse_duration_minutes("45 minut"), 45)

    def test_parse_transposed_polish_program_table(self):
        table = [
            ["", "1", "2", "3", "L.p."],
            ["", "Pranie krótkie 15’", "Wirowanie", "Bawełna Eco", "programu Nazwa"],
            ["", "30°", "-", "60°", "[°C] max. Temp."],
            ["", "Opcja", "Opcja", "Opcja", "Dostępne funkcje"],
            ["", "0:15", "0:15", "3:20", "[h:min] Czas"],
        ]

        programs = parse_programs_from_tables([table])

        self.assertIn({"name": "Pranie krótkie 15’ 30°", "duration_minutes": 15}, programs)
        self.assertIn({"name": "Wirowanie", "duration_minutes": 15}, programs)
        self.assertIn({"name": "Bawełna Eco 60°", "duration_minutes": 200}, programs)

    def test_ignore_delayed_start_text(self):
        text = """
        Press the Delayed Start button Time will increase 60 min
        Naciśnij przycisk Opóźniony Start Zwłoka czasowa rośnie o 60 min
        włożonego prania może występować różnica do 300 min
        """

        programs = parse_programs_from_text(text)

        self.assertEqual(programs, [])

    def test_cleanup_temperature_duplicates_and_footnotes(self):
        programs = cleanup_programs(
            [
                {"name": "Bawełna 20° 20°", "duration_minutes": 140},
                {"name": "Bawełna 40* 40°", "duration_minutes": 80},
                {"name": "Bawełna 60** 60°", "duration_minutes": 98},
                {"name": "Cotton* 60°", "duration_minutes": 179},
                {"name": "Eco 40-60 3)", "duration_minutes": 208},
                {"name": "odcinki", "duration_minutes": 60},
                {"name": "20 °C", "duration_minutes": 63},
            ]
        )

        self.assertIn({"name": "Bawełna 20°", "duration_minutes": 140}, programs)
        self.assertIn({"name": "Bawełna 40°", "duration_minutes": 80}, programs)
        self.assertIn({"name": "Bawełna 60°", "duration_minutes": 98}, programs)
        self.assertIn({"name": "Cotton 60°", "duration_minutes": 179}, programs)
        self.assertIn({"name": "Eco 40-60", "duration_minutes": 208}, programs)
        self.assertNotIn({"name": "odcinki", "duration_minutes": 60}, programs)
        self.assertIn({"name": "20°C", "duration_minutes": 63}, programs)

    def test_reject_instruction_sentences_as_program_names(self):
        invalid_names = [
            "浸泡 Activate or deactivate soaking for",
            "main locked for up to",
            "CGR_lortnoC_5_",
            "Steam is shown in hours such as 1h",
            "button for",
            "LE MOTOR LOCKED ERROR",
            "The router frequency is not",
            "If the wash is not recommenced within",
            "This function cannot be set for less than",
            "The appliance supports",
            "Your product automatically detects the amount of laundry",
            "To utilize the HomeWhiz feature ensure that the",
            "there may be a difference of",
            "any button within",
        ]

        for name in invalid_names:
            with self.subTest(name=name):
                self.assertFalse(looks_like_program_name(name))

    def test_allow_short_english_program_names(self):
        valid_names = [
            "Eco",
            "Cottons",
            "Synthetics",
            "Shirts 40°",
            "Baby comfort 30°",
            "Express 15’",
            "Cotton 60°",
        ]

        for name in valid_names:
            with self.subTest(name=name):
                self.assertTrue(looks_like_program_name(name))

    def test_instruction_parser_falls_back_for_too_few_programs(self):
        class NamedTextFile:
            name = "manual.txt"

            def read(self):
                return b"Eco 2:47\nSynthetics 2:15\n"

            def seek(self, position):
                return None

        self.assertEqual(parse_instruction_programs(NamedTextFile()), DEFAULT_PROGRAMS)


def _slot(machine_number: int, slot_index: int = 0, days_ahead: int = 1):
    """Return (start, end) for a slot that satisfies the machine's booking slot pattern.

    The slot pattern repeats every 360 min (6 h).
    Odd machines:  (60, 60, 120, 120) → slots at 0,1,2,4 h offsets within the cycle.
    Even machines: (120, 120, 60, 60) → slots at 0,2,4,5 h offsets within the cycle.
    """
    pattern = (60, 60, 120, 120) if machine_number % 2 != 0 else (120, 120, 60, 60)
    pattern_total = 360

    now = timezone.now()
    # Use server timezone so slot boundaries match what DRF's enforce_timezone produces
    day = timezone.localtime(now + timedelta(days=days_ahead)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    repetition, idx = divmod(slot_index, len(pattern))
    offset = repetition * pattern_total + sum(pattern[:idx])
    start = day + timedelta(minutes=offset)
    end = start + timedelta(minutes=pattern[idx])
    return start, end


class BookingIntegrationTests(TestCase):
    """DB-backed tests for booking validation and fairness rules."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user = User.objects.create_user(email="user@test.com", password="pass")
        self.user.is_active = True
        self.user.save()

        self.other_user = User.objects.create_user(email="other@test.com", password="pass")
        self.other_user.is_active = True
        self.other_user.save()

        self.territory = Territory.objects.create(name="Building A", code="AAAA01")
        self.zone = Zone.objects.create(territory=self.territory, name="Floor 1", order=0)
        self.machine = Machine.objects.create(zone=self.zone, number=1)

    def _grant_access(self, user=None):
        user = user or self.user
        return TerritoryAccess.objects.get_or_create(user=user, territory=self.territory)[0]

    def _make_booking(self, user=None, machine=None, start=None, end=None, status=Booking.STATUS_ACTIVE):
        user = user or self.user
        machine = machine or self.machine
        if start is None:
            start, end = _slot(machine.number, slot_index=0)
        elif end is None:
            _, end = _slot(machine.number, slot_index=0)
        return Booking.objects.create(
            user=user, machine=machine, start_time=start, end_time=end, status=status
        )

    def _serialize_booking(self, user=None, machine=None, start=None, end=None):
        """Run BookingSerializer.validate() via is_valid() with a mock request."""
        from unittest.mock import Mock
        user = user or self.user
        machine = machine or self.machine
        if start is None:
            start, end = _slot(machine.number, slot_index=0)
        elif end is None:
            _, end = _slot(machine.number, slot_index=0)
        request = Mock()
        request.user = user
        s = BookingSerializer(
            data={
                "machine": machine.id,
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "client_timezone_offset": 0,
            },
            context={"request": request},
        )
        return s

    # ------------------------------------------------------------------
    # Territory membership
    # ------------------------------------------------------------------

    def test_booking_blocked_without_territory_access(self):
        s = self._serialize_booking()
        self.assertFalse(s.is_valid())
        self.assertIn("You don't have access", str(s.errors))

    def test_booking_allowed_with_territory_access(self):
        self._grant_access()
        start, end = _slot(self.machine.number, slot_index=0)
        s = self._serialize_booking(start=start, end=end)
        self.assertTrue(s.is_valid(), s.errors)

    def test_blocked_user_cannot_book(self):
        self._grant_access()
        TerritoryUserBlock.objects.create(
            user=self.user, territory=self.territory, is_active=True
        )
        s = self._serialize_booking()
        self.assertFalse(s.is_valid())
        self.assertIn("blocked", str(s.errors))

    # ------------------------------------------------------------------
    # Booking limit (normal and with penalty)
    # ------------------------------------------------------------------

    def test_third_booking_allowed_fourth_rejected(self):
        self._grant_access()
        # 3 machines, each gets its own slot 0 (different machines → no overlap conflict)
        machine_numbers = [11, 13, 15]
        for num in machine_numbers:
            m = Machine.objects.create(zone=self.zone, number=num)
            start, end = _slot(num, slot_index=0)
            self._make_booking(machine=m, start=start, end=end)

        # 4th booking should be rejected (limit=3)
        m4 = Machine.objects.create(zone=self.zone, number=17)
        start4, end4 = _slot(17, slot_index=0)
        s = self._serialize_booking(machine=m4, start=start4, end=end4)
        self.assertFalse(s.is_valid())
        self.assertIn("limit", str(s.errors))

    def test_no_show_penalty_reduces_limit_to_two(self):
        access = self._grant_access()
        access.no_show_count = 1
        access.penalty_until = timezone.now() + timedelta(days=2)
        access.save()

        m1 = Machine.objects.create(zone=self.zone, number=31)
        m2 = Machine.objects.create(zone=self.zone, number=32)
        s1, e1 = _slot(31, slot_index=0)
        s2, e2 = _slot(32, slot_index=0)
        self._make_booking(machine=m1, start=s1, end=e1)
        self._make_booking(machine=m2, start=s2, end=e2)

        # 3rd booking should be rejected (effective limit is 2)
        m3 = Machine.objects.create(zone=self.zone, number=33)
        s3, e3 = _slot(33, slot_index=0)
        s = self._serialize_booking(machine=m3, start=s3, end=e3)
        self.assertFalse(s.is_valid())
        self.assertIn("limit", str(s.errors))

    def test_no_show_penalty_reduces_limit_to_one_after_two_violations(self):
        access = self._grant_access()
        access.no_show_count = 2
        access.penalty_until = timezone.now() + timedelta(days=2)
        access.save()

        m1 = Machine.objects.create(zone=self.zone, number=41)
        s1, e1 = _slot(41, slot_index=0)
        self._make_booking(machine=m1, start=s1, end=e1)

        # 2nd booking should be rejected (effective limit is 1)
        m2 = Machine.objects.create(zone=self.zone, number=42)
        s2, e2 = _slot(42, slot_index=0)
        s = self._serialize_booking(machine=m2, start=s2, end=e2)
        self.assertFalse(s.is_valid())
        self.assertIn("limit", str(s.errors))

    def test_expired_penalty_restores_full_limit(self):
        access = self._grant_access()
        access.no_show_count = 2
        access.penalty_until = timezone.now() - timedelta(seconds=1)
        access.save()

        self.assertEqual(access.effective_booking_limit(), 3)

    # ------------------------------------------------------------------
    # Same machine same day duplicate
    # ------------------------------------------------------------------

    def test_same_machine_same_day_duplicate_rejected(self):
        self._grant_access()
        # Book slot 0 on machine 1
        s0, e0 = _slot(self.machine.number, slot_index=0)
        self._make_booking(machine=self.machine, start=s0, end=e0)

        # Try slot 1 on the same machine same day — should be rejected
        s1, e1 = _slot(self.machine.number, slot_index=1)
        s = self._serialize_booking(machine=self.machine, start=s1, end=e1)
        self.assertFalse(s.is_valid())
        self.assertIn("already have a booking for this machine", str(s.errors))

    def test_different_machine_same_day_allowed(self):
        self._grant_access()
        # Book slot 0 on machine 1
        s0, e0 = _slot(self.machine.number, slot_index=0)
        self._make_booking(machine=self.machine, start=s0, end=e0)

        # Book slot 0 on a different machine — should be fine
        other_machine = Machine.objects.create(zone=self.zone, number=99)
        s1, e1 = _slot(other_machine.number, slot_index=0)
        s = self._serialize_booking(machine=other_machine, start=s1, end=e1)
        self.assertTrue(s.is_valid(), s.errors)

    # ------------------------------------------------------------------
    # Overlap prevention
    # ------------------------------------------------------------------

    def test_overlapping_booking_rejected(self):
        self._grant_access()
        self._grant_access(user=self.other_user)
        s0, e0 = _slot(self.machine.number, slot_index=0)
        # other_user holds the slot first → self.user gets an overlap (not same-machine-same-day)
        self._make_booking(user=self.other_user, start=s0, end=e0)

        s = self._serialize_booking(start=s0, end=e0)
        self.assertFalse(s.is_valid())
        self.assertIn("overlaps", str(s.errors))

    # ------------------------------------------------------------------
    # Auto-cancel Celery task
    # ------------------------------------------------------------------

    def test_auto_cancel_task_cancels_unconfirmed_booking(self):
        self._grant_access()
        booking = self._make_booking()

        auto_cancel_unconfirmed_booking(booking.id)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_CANCELLED)

        history = ReservationStatusHistory.objects.get(booking=booking)
        self.assertEqual(history.note, "no_show")
        self.assertEqual(history.previous_status, Booking.STATUS_ACTIVE)

        access = TerritoryAccess.objects.get(user=self.user, territory=self.territory)
        self.assertEqual(access.no_show_count, 1)
        self.assertIsNotNone(access.penalty_until)

    def test_auto_cancel_task_skips_already_confirmed_booking(self):
        self._grant_access()
        booking = self._make_booking()
        booking.confirmed_at = timezone.now()
        booking.save(update_fields=["confirmed_at"])

        auto_cancel_unconfirmed_booking(booking.id)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_ACTIVE)

    def test_auto_cancel_task_skips_already_cancelled_booking(self):
        self._grant_access()
        booking = self._make_booking(status=Booking.STATUS_CANCELLED)

        auto_cancel_unconfirmed_booking(booking.id)

        access_qs = TerritoryAccess.objects.filter(user=self.user, territory=self.territory)
        # No new access record created, no penalty applied
        if access_qs.exists():
            self.assertEqual(access_qs.first().no_show_count, 0)

    def test_auto_cancel_accumulates_penalty_on_repeat_no_shows(self):
        access = self._grant_access()
        access.no_show_count = 1
        access.penalty_until = timezone.now() + timedelta(days=3)
        access.save()

        booking = self._make_booking()
        auto_cancel_unconfirmed_booking(booking.id)

        access.refresh_from_db()
        self.assertEqual(access.no_show_count, 2)
        self.assertEqual(access.effective_booking_limit(), 1)

    # ------------------------------------------------------------------
    # effective_booking_limit unit tests
    # ------------------------------------------------------------------

    def test_effective_limit_no_penalty(self):
        access = self._grant_access()
        self.assertEqual(access.effective_booking_limit(), 3)

    def test_effective_limit_first_no_show(self):
        access = self._grant_access()
        access.no_show_count = 1
        access.penalty_until = timezone.now() + timedelta(days=3)
        access.save()
        self.assertEqual(access.effective_booking_limit(), 2)

    def test_effective_limit_minimum_one(self):
        access = self._grant_access()
        access.no_show_count = 99
        access.penalty_until = timezone.now() + timedelta(days=3)
        access.save()
        self.assertEqual(access.effective_booking_limit(), 1)


class ConcurrentBookingTests(TransactionTestCase):
    """Test that select_for_update prevents double-booking under simultaneous requests."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user1 = User.objects.create_user(email="concurrent1@test.com", password="pass")
        self.user1.is_active = True
        self.user1.save()

        self.user2 = User.objects.create_user(email="concurrent2@test.com", password="pass")
        self.user2.is_active = True
        self.user2.save()

        self.territory = Territory.objects.create(name="Concurrent Building", code="CONC01")
        self.zone = Zone.objects.create(territory=self.territory, name="Floor 1", order=0)
        self.machine = Machine.objects.create(zone=self.zone, number=1)
        TerritoryAccess.objects.create(user=self.user1, territory=self.territory)
        TerritoryAccess.objects.create(user=self.user2, territory=self.territory)

    def _try_book(self, user, start, end, results, barrier):
        connection.close()
        try:
            barrier.wait()
            request = Mock()
            request.user = user
            s = BookingSerializer(
                data={
                    "machine": self.machine.id,
                    "start_time": start.isoformat(),
                    "end_time": end.isoformat(),
                    "client_timezone_offset": 0,
                },
                context={"request": request},
            )
            if s.is_valid():
                s.save()
                results.append("success")
            else:
                results.append("rejected")
        except Exception as e:
            results.append(f"error: {e}")
        finally:
            connection.close()

    def test_only_one_booking_wins_race(self):
        """Two users simultaneously try to book the same slot — exactly one must succeed."""
        start, end = _slot(self.machine.number, slot_index=0)
        results = []
        barrier = threading.Barrier(2)

        threads = [
            threading.Thread(target=self._try_book, args=(self.user1, start, end, results, barrier)),
            threading.Thread(target=self._try_book, args=(self.user2, start, end, results, barrier)),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r == "success"]
        self.assertEqual(
            len(successes), 1,
            f"Expected exactly 1 successful booking, got results: {results}",
        )
        self.assertEqual(Booking.objects.count(), 1)

    @staticmethod
    def _is_sqlite():
        return connection.vendor == "sqlite"

    def test_different_slots_all_succeed(self):
        """Two users booking different slots on the same machine — both must succeed.

        SQLite uses table-level locking so this test only runs on PostgreSQL,
        which supports row-level locking via SELECT FOR UPDATE.
        """
        if self._is_sqlite():
            self.skipTest("SQLite uses table-level locking — run against PostgreSQL to test true concurrency")

        start1, end1 = _slot(self.machine.number, slot_index=0)
        start2, end2 = _slot(self.machine.number, slot_index=1)
        results = []
        barrier = threading.Barrier(2)

        threads = [
            threading.Thread(target=self._try_book, args=(self.user1, start1, end1, results, barrier)),
            threading.Thread(target=self._try_book, args=(self.user2, start2, end2, results, barrier)),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r == "success"]
        self.assertEqual(
            len(successes), 2,
            f"Expected both bookings to succeed, got results: {results}",
        )
        self.assertEqual(Booking.objects.count(), 2)
