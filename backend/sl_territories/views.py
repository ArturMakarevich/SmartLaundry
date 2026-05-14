from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.core.files.uploadedfile import UploadedFile
from django.db.models import Count, Max, Q
from datetime import timedelta

from .tasks import auto_cancel_unconfirmed_booking

from .models import (
    Territory,
    TerritoryAccess,
    TerritoryAdminAssignment,
    TerritoryUserBlock,
    Booking,
    ReservationStatusHistory,
    Machine,
    Zone,
    InstructionTemplate,
    UserNotification,
    InviteCode,
    ProblemReport,
)
from .instruction_parser import PROGRAM_OVERRIDES, normalize_model_key, parse_instruction_programs
from .serializers import (
    TerritorySerializer,
    TerritoryAccessSerializer,
    BookingSerializer,
    UserNotificationSerializer,
)


# Alfabet bez O, I, 0, 1 — żeby kody były czytelne i nie myliły się wizualnie
def generate_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return get_random_string(length=6, allowed_chars=alphabet)


def is_superadmin_user(user) -> bool:
    return getattr(user, "role", None) == "superadmin" or user.is_superuser


# Zwraca queryset terytoriów widocznych dla danego admina.
# Superadmin widzi wszystko; zwykły admin — tylko swoje (tworzone lub przypisane)
def admin_territories_qs(user):
    qs = Territory.objects.select_related("created_by").prefetch_related(
        "zones__machines__programs",
        "accesses__user",
        "user_blocks",
    ).order_by("name")
    if is_superadmin_user(user):
        return qs
    return qs.filter(Q(created_by=user) | Q(admin_assignments__user=user)).distinct()


def admin_can_manage_territory(user, territory) -> bool:
    if is_superadmin_user(user):
        return True
    return Territory.objects.filter(
        Q(pk=territory.pk),
        Q(created_by=user) | Q(admin_assignments__user=user),
    ).exists()


def create_admin_notification(user, booking, notification_type: str, title: str, message: str = ""):
    UserNotification.objects.create(
        user=user,
        booking=booking,
        type=notification_type,
        title=title,
        message=message,
    )


# Anuluje rezerwację i zapisuje historię zmiany statusu + wysyła powiadomienie do użytkownika
def cancel_booking_with_history(booking, changed_by, note: str, notification_type: str, title: str, message: str):
    previous_status = booking.status
    booking.status = Booking.STATUS_CANCELLED
    booking.save(update_fields=["status"])
    ReservationStatusHistory.objects.create(
        booking=booking,
        previous_status=previous_status,
        new_status=Booking.STATUS_CANCELLED,
        changed_by=changed_by,
        note=note,
    )
    create_admin_notification(
        user=booking.user,
        booking=booking,
        notification_type=notification_type,
        title=title,
        message=message,
    )


class AdminTerritoryListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        territories = admin_territories_qs(request.user)
        serializer = TerritorySerializer(territories, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        payload = request.data.copy()
        payload["code"] = generate_code()
        serializer = TerritorySerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        territory = serializer.save(created_by=request.user)
        TerritoryAdminAssignment.objects.get_or_create(user=request.user, territory=territory)
        return Response(TerritorySerializer(territory).data, status=status.HTTP_201_CREATED)


class AdminTerritoryDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TerritorySerializer(instance=territory, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        territory_name = territory.name
        user_ids = list(TerritoryAccess.objects.filter(territory=territory).values_list("user_id", flat=True))
        territory.delete()
        for uid in user_ids:
            try:
                UserNotification.objects.create(
                    user_id=uid,
                    booking=None,
                    type=UserNotification.TYPE_TERRITORY_DELETED,
                    title="Terytorium usunięte",
                    message=f"Terytorium '{territory_name}' zostalo usuniete przez administratora.",
                )
            except Exception:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        territories = list(admin_territories_qs(request.user))
        territory_ids = [territory.id for territory in territories]
        now = timezone.now()
        bookings = Booking.objects.select_related(
            "user",
            "machine",
            "machine__zone",
            "machine__zone__territory",
        ).filter(machine__zone__territory_id__in=territory_ids).order_by("start_time")
        active_bookings = list(bookings.filter(status=Booking.STATUS_ACTIVE))
        active_counts_by_machine = {}
        current_counts_by_machine = {}
        for booking in active_bookings:
            machine_id = booking.machine_id
            active_counts_by_machine[machine_id] = active_counts_by_machine.get(machine_id, 0) + 1
            if booking.start_time <= now <= booking.end_time:
                current_counts_by_machine[machine_id] = current_counts_by_machine.get(machine_id, 0) + 1

        user_stats = {
            item["user"]: item
            for item in Booking.objects.filter(machine__zone__territory_id__in=territory_ids)
            .values("user")
            .annotate(
                active_reservations=Count("id", filter=Q(status=Booking.STATUS_ACTIVE)),
                last_activity=Max("created_at"),
            )
        }
        active_blocks = {
            (block.territory_id, block.user_id): block
            for block in TerritoryUserBlock.objects.filter(territory_id__in=territory_ids, is_active=True)
        }

        booking_items = [
            {
                "id": booking.id,
                "territory_id": booking.machine.zone.territory_id,
                "machine": booking.machine_id,
                "machine_number": booking.machine.number,
                "machine_model": booking.machine.model_name,
                "zone_name": booking.machine.zone.name,
                "zone_description": booking.machine.zone.description,
                "territory_name": booking.machine.zone.territory.name,
                "user": {
                    "id": booking.user.id,
                    "email": booking.user.email,
                    "role": getattr(booking.user, "role", "user"),
                    "is_active": booking.user.is_active,
                },
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "status": booking.status,
                "selected_program_name": booking.selected_program_name,
                "selected_program_duration_minutes": booking.selected_program_duration_minutes,
            }
            for booking in bookings
        ]

        active_invite_codes: dict = {}
        for ic in InviteCode.objects.filter(territory_id__in=territory_ids, is_active=True, expires_at__gt=now).order_by("-created_at"):
            if ic.territory_id not in active_invite_codes:
                active_invite_codes[ic.territory_id] = {"code": ic.code, "expires_at": ic.expires_at, "id": ic.id}

        open_reports_count = {
            item["territory"]: item["cnt"]
            for item in ProblemReport.objects.filter(
                territory_id__in=territory_ids,
                status__in=[ProblemReport.STATUS_OPEN, ProblemReport.STATUS_IN_PROGRESS],
            ).values("territory").annotate(cnt=Count("id"))
        }

        response = []
        for territory in territories:
            territory_accesses = list(territory.accesses.select_related("user").all())
            users = []
            for access in territory_accesses:
                stats = user_stats.get(access.user_id, {})
                blocked = (territory.id, access.user_id) in active_blocks
                users.append(
                    {
                        "id": access.user.id,
                        "name": f"User #{access.user.display_id}",
                        "email": access.user.email,
                        "role": getattr(access.user, "role", "user"),
                        "is_active": access.user.is_active,
                        "blocked": blocked,
                        "active_reservations": stats.get("active_reservations", 0),
                        "last_activity": stats.get("last_activity") or access.added_at,
                    }
                )

            response.append(
                {
                    "id": territory.id,
                    "name": territory.name,
                    "code": territory.code,
                    "created_by_email": territory.created_by.email if territory.created_by else None,
                    "active_users_count": sum(1 for item in users if item["is_active"] and not item["blocked"]),
                    "current_reservations_count": sum(
                        1 for booking in active_bookings if booking.machine.zone.territory_id == territory.id
                    ),
                    "users": users,
                    "zones": [
                        {
                            "id": zone.id,
                            "name": zone.name,
                            "description": zone.description,
                            "machines": [
                                {
                                    "id": machine.id,
                                    "number": machine.number,
                                    "model_name": machine.model_name,
                                    "status": machine.status,
                                    "programs": [
                                        {"name": program.name, "duration_minutes": program.duration_minutes}
                                        for program in machine.programs.all()
                                    ],
                                    "active_reservations_count": active_counts_by_machine.get(machine.id, 0),
                                    "current_reservations_count": current_counts_by_machine.get(machine.id, 0),
                                }
                                for machine in zone.machines.all()
                            ],
                        }
                        for zone in territory.zones.all()
                    ],
                    "reservations": [
                        item for item in booking_items if item["territory_id"] == territory.id
                    ],
                    "active_invite_code": active_invite_codes.get(territory.id),
                    "open_problem_reports_count": open_reports_count.get(territory.id, 0),
                }
            )
        return Response(response, status=status.HTTP_200_OK)


class AdminTerritoryUserActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, territory_id: int, user_id: int):
        territory = get_object_or_404(Territory, pk=territory_id)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        access = get_object_or_404(TerritoryAccess.objects.select_related("user"), territory=territory, user_id=user_id)
        action = request.data.get("action")
        block, _ = TerritoryUserBlock.objects.get_or_create(
            territory=territory,
            user=access.user,
            defaults={"blocked_by": request.user},
        )
        if action == "block":
            block.is_active = True
            block.blocked_by = request.user
            block.reason = (request.data.get("reason") or "").strip()
            block.save(update_fields=["is_active", "blocked_by", "reason", "updated_at"])
            UserNotification.objects.create(
                user=access.user,
                type=UserNotification.TYPE_USER_BLOCKED,
                title="Dostęp zablokowany",
                message=f"Twoj dostep do terytorium '{territory.name}' zostal zablokowany przez administratora.",
            )
        elif action == "unblock":
            block.is_active = False
            block.save(update_fields=["is_active", "updated_at"])
            UserNotification.objects.create(
                user=access.user,
                type=UserNotification.TYPE_USER_UNBLOCKED,
                title="Dostep odblokowany",
                message=f"Twoj dostep do terytorium '{territory.name}' zostal odblokowany.",
            )
        else:
            return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"ok": True, "blocked": block.is_active}, status=status.HTTP_200_OK)


class AdminMachineActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, machine_id: int):
        machine = get_object_or_404(Machine.objects.select_related("zone__territory"), pk=machine_id)
        if not admin_can_manage_territory(request.user, machine.zone.territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get("status")
        allowed_statuses = {value for value, _label in Machine.STATUS_CHOICES}
        if new_status not in allowed_statuses:
            return Response({"detail": "Unsupported machine status"}, status=status.HTTP_400_BAD_REQUEST)
        previous_status = machine.status
        machine.status = new_status
        machine.save(update_fields=["status"])

        cancelled_count = 0
        if new_status == Machine.STATUS_BROKEN:
            future_bookings = Booking.objects.select_related("user", "machine__zone__territory").filter(
                machine=machine,
                status=Booking.STATUS_ACTIVE,
                start_time__gte=timezone.now(),
            )
            for booking in future_bookings:
                cancel_booking_with_history(
                    booking=booking,
                    changed_by=request.user,
                    note="machine_broken",
                    notification_type=UserNotification.TYPE_MACHINE_UNAVAILABLE,
                    title="Rezerwacja anulowana",
                    message=f"Twoja rezerwacja na pralkę #{booking.machine.number} (strefa: {booking.machine.zone.name}) została anulowana — pralka jest tymczasowo niedostępna.",
                )
                cancelled_count += 1
        return Response(
            {
                "id": machine.id,
                "status": machine.status,
                "previous_status": previous_status,
                "cancelled_reservations": cancelled_count,
            },
            status=status.HTTP_200_OK,
        )


class UserAddTerritoryByCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response({"detail": "Code is required"}, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        invite = InviteCode.objects.select_related("territory").filter(code__iexact=code).first()
        if invite:
            if not invite.is_active or invite.expires_at <= now:
                return Response({"detail": "Code expired"}, status=status.HTTP_400_BAD_REQUEST)
            territory = invite.territory
        else:
            territory = Territory.objects.filter(code__iexact=code).first()
            if not territory:
                return Response({"detail": "Invalid code"}, status=status.HTTP_404_NOT_FOUND)
        access, _ = TerritoryAccess.objects.get_or_create(user=request.user, territory=territory)
        serializer = TerritoryAccessSerializer(access, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserTerritoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accesses = TerritoryAccess.objects.filter(user=request.user).select_related("territory")
        serializer = TerritoryAccessSerializer(accesses, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserLeaveTerritoryView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, territory_id):
        deleted, _ = TerritoryAccess.objects.filter(user=request.user, territory_id=territory_id).delete()
        if not deleted:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BookingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        now = timezone.now()

        # Jeśli rezerwacja zaczyna się w ciągu 30 minut — wyślij powiadomienie od razu
        if now <= booking.start_time <= now + timedelta(minutes=30):
            create_booking_notification(
                user=request.user,
                booking=booking,
                notification_type=UserNotification.TYPE_BOOKING_START_SOON,
                title="Rezerwacja zaraz się zaczyna",
                message=f"Pralka #{booking.machine.number}: slot {format_booking_time_for_user(booking, booking.start_time)}–{format_booking_time_for_user(booking, booking.end_time)}",
            )

        # Celery anuluje rezerwację jeśli użytkownik nie potwierdzi prania w ciągu 15 minut od startu
        auto_cancel_unconfirmed_booking.apply_async(
            args=[booking.id],
            eta=booking.start_time + timedelta(minutes=15),
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        machine_id = request.query_params.get("machine")
        territory_id = request.query_params.get("territory_id")
        qs = Booking.objects.select_related("user", "machine", "machine__zone", "machine__zone__territory")
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        elif territory_id:
            # Bulk load: all bookings for the territory (last 3 days to future)
            cutoff = timezone.now() - timedelta(days=3)
            qs = qs.filter(machine__zone__territory_id=territory_id, start_time__gte=cutoff)
        elif is_superadmin_user(request.user):
            qs = qs.all()
        elif request.user.is_staff:
            territory_ids = admin_territories_qs(request.user).values_list("id", flat=True)
            cutoff = timezone.now() - timedelta(days=30)
            qs = qs.filter(machine__zone__territory_id__in=territory_ids, start_time__gte=cutoff)
        else:
            qs = qs.filter(user=request.user)
        serializer = BookingSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int):
        qs = Booking.objects.select_related("machine__zone__territory", "user")
        if not is_superadmin_user(request.user):
            if request.user.is_staff:
                qs = qs.filter(
                    Q(machine__zone__territory__created_by=request.user)
                    | Q(machine__zone__territory__admin_assignments__user=request.user)
                    | Q(user=request.user)
                ).distinct()
            else:
                qs = qs.filter(user=request.user)
        booking = get_object_or_404(qs, pk=pk)
        action = request.data.get("action")
        if action == "cancel":
            if booking.status != Booking.STATUS_ACTIVE:
                return Response({"detail": "Only active bookings can be cancelled"}, status=status.HTTP_400_BAD_REQUEST)
            is_admin_cancellation = request.user.is_staff and booking.user_id != request.user.id
            cancel_booking_with_history(
                booking=booking,
                changed_by=request.user,
                note="admin_cancelled" if is_admin_cancellation else "user_cancelled",
                notification_type=UserNotification.TYPE_BOOKING_CANCELLED,
                title="Rezerwacja anulowana",
                message=(
                    f"Twoja rezerwacja na pralke #{booking.machine.number} w strefie '{booking.machine.zone.name}' zostala anulowana przez administratora."
                    if is_admin_cancellation
                    else f"Pralka #{booking.machine.number}: rezerwacja anulowana."
                ),
            )
        elif action == "confirm_wash":
            if booking.status != Booking.STATUS_ACTIVE:
                return Response({"detail": "Only active bookings can be confirmed"}, status=status.HTTP_400_BAD_REQUEST)
            now = timezone.now()
            # Okno potwierdzenia: od startu rezerwacji do +15 minut.
            # Po tym czasie Celery automatycznie anuluje niezatwierdzoną rezerwację.
            confirmation_deadline = booking.start_time + timedelta(minutes=15)
            if now < booking.start_time:
                return Response({"detail": "Confirmation opens when the booking starts"}, status=status.HTTP_400_BAD_REQUEST)
            if now > confirmation_deadline:
                return Response({"detail": "Confirmation window expired"}, status=status.HTTP_400_BAD_REQUEST)
            duration = request.data.get("selected_program_duration_minutes")
            name = (request.data.get("selected_program_name") or "").strip()
            try:
                duration = int(duration) if duration else None
            except (TypeError, ValueError):
                duration = None
            booking.confirmed_at = now
            booking.wash_started_at = now
            booking.selected_program_name = name[:255]
            booking.selected_program_duration_minutes = duration
            booking.estimated_wash_end_at = now + timedelta(minutes=duration) if duration else None
            booking.save(
                update_fields=[
                    "confirmed_at",
                    "wash_started_at",
                    "selected_program_name",
                    "selected_program_duration_minutes",
                    "estimated_wash_end_at",
                ]
            )
            create_booking_notification(
                user=booking.user,
                booking=booking,
                notification_type=UserNotification.TYPE_RESERVATION_CONFIRMED,
                title="Rezerwacja potwierdzona",
                message=f"Pralka #{booking.machine.number}: {booking.selected_program_name or 'program nie wybrany'}",
            )
        else:
            return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BookingSerializer(booking, context={"request": request}).data, status=status.HTTP_200_OK)


class MachineListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, territory_id: int):
        territory = get_object_or_404(Territory, pk=territory_id)
        serializer = TerritorySerializer(territory, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


def format_booking_time_for_user(booking, value):
    if booking.client_timezone_offset is None:
        return timezone.localtime(value).strftime("%H:%M")
    local_value = value - timedelta(minutes=booking.client_timezone_offset)
    return local_value.strftime("%H:%M")


def create_booking_notification(user, booking, notification_type: str, title: str, message: str = ""):
    UserNotification.objects.get_or_create(
        user=user,
        booking=booking,
        type=notification_type,
        defaults={"title": title, "message": message},
    )


def ensure_booking_time_notifications(user):
    now = timezone.now()
    soon_until = now + timedelta(minutes=30)
    active_bookings = Booking.objects.select_related("machine").filter(
        user=user,
        status=Booking.STATUS_ACTIVE,
    )
    for booking in active_bookings:
        if now <= booking.start_time <= soon_until:
            create_booking_notification(
                user=user,
                booking=booking,
                notification_type=UserNotification.TYPE_BOOKING_START_SOON,
                title="Rezerwacja zaraz się zaczyna",
                message=f"Pralka #{booking.machine.number}: zaczyna się o {format_booking_time_for_user(booking, booking.start_time)}",
            )
        if booking.end_time <= now:
            create_booking_notification(
                user=user,
                booking=booking,
                notification_type=UserNotification.TYPE_BOOKING_ENDED,
                title="Slot zakończony",
                message=f"Pralka #{booking.machine.number}: slot zakończył się o {format_booking_time_for_user(booking, booking.end_time)}",
            )
        if booking.estimated_wash_end_at and booking.estimated_wash_end_at <= now:
            create_booking_notification(
                user=user,
                booking=booking,
                notification_type=UserNotification.TYPE_WASH_COMPLETED,
                title="Pranie zakończone",
                message=f"Pralka #{booking.machine.number}: szacowany czas prania dobiegł końca",
            )


class UserNotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_booking_time_notifications(request.user)
        limit_raw = request.query_params.get("limit")
        qs = UserNotification.objects.filter(user=request.user).order_by("-created_at", "-id")
        unread_count = qs.filter(is_read=False).count()
        if limit_raw:
            try:
                limit = max(1, min(50, int(limit_raw)))
                qs = qs[:limit]
            except ValueError:
                pass
        serializer = UserNotificationSerializer(qs, many=True)
        return Response(
            {"unread_count": unread_count, "results": serializer.data},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        action = request.data.get("action")
        qs = UserNotification.objects.filter(user=request.user)
        if action == "mark_all_read":
            qs.update(is_read=True)
            return Response({"ok": True}, status=status.HTTP_200_OK)
        ids = request.data.get("ids")
        if isinstance(ids, list):
            qs.filter(id__in=ids).update(is_read=True)
            return Response({"ok": True}, status=status.HTTP_200_OK)
        return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)


class AdminInviteCodeView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        invite = InviteCode.objects.filter(territory=territory, is_active=True, expires_at__gt=now).order_by("-created_at").first()
        if not invite:
            return Response({"code": None, "expires_at": None, "is_active": False}, status=status.HTTP_200_OK)
        return Response({"id": invite.id, "code": invite.code, "expires_at": invite.expires_at, "is_active": True}, status=status.HTTP_200_OK)

    def post(self, request, pk: int):
        territory = get_object_or_404(Territory, pk=pk)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        InviteCode.objects.filter(territory=territory, is_active=True).update(is_active=False)
        code = generate_code()
        expires_at = timezone.now() + timedelta(hours=12)
        invite = InviteCode.objects.create(
            territory=territory,
            code=code,
            created_by=request.user,
            expires_at=expires_at,
            is_active=True,
        )
        return Response({"id": invite.id, "code": invite.code, "expires_at": invite.expires_at, "is_active": True}, status=status.HTTP_201_CREATED)


class ProblemReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        territory_id = request.data.get("territory_id")
        zone_id = request.data.get("zone_id")
        machine_id = request.data.get("machine_id")
        report_type = request.data.get("type", ProblemReport.TYPE_OTHER)
        description = (request.data.get("description") or "").strip()
        if not territory_id:
            return Response({"detail": "territory_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        territory = get_object_or_404(Territory, pk=territory_id)
        if not TerritoryAccess.objects.filter(user=request.user, territory=territory).exists() \
                and not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        zone = get_object_or_404(Zone, pk=zone_id, territory=territory) if zone_id else None
        machine = get_object_or_404(Machine, pk=machine_id, zone__territory=territory) if machine_id else None
        valid_types = {value for value, _ in ProblemReport.TYPE_CHOICES}
        if report_type not in valid_types:
            report_type = ProblemReport.TYPE_OTHER
        report = ProblemReport.objects.create(
            territory=territory,
            zone=zone,
            machine=machine,
            reported_by=request.user,
            type=report_type,
            description=description,
        )

        zone_label = zone.name if zone else None
        machine_label = f"Pralka #{str(machine.number).zfill(2)}" if machine else None
        location_parts = [p for p in [zone_label, machine_label] if p]
        location_str = " · ".join(location_parts)
        reporter_label = f"User #{request.user.display_id}"
        notif_message = f"{reporter_label}: {description[:120]}"
        if location_str:
            notif_message = f"{location_str} — {notif_message}"

        admin_users = set()
        if territory.created_by:
            admin_users.add(territory.created_by)
        for assignment in territory.admin_assignments.select_related("user").all():
            admin_users.add(assignment.user)

        for admin in admin_users:
            UserNotification.objects.create(
                user=admin,
                booking=None,
                territory=territory,
                type=UserNotification.TYPE_PROBLEM_REPORT,
                title=f"Zgłoszenie: {territory.name}",
                message=notif_message,
            )

        return Response({"id": report.id, "type": report.type, "status": report.status, "created_at": report.created_at}, status=status.HTTP_201_CREATED)

    def get(self, request):
        territory_id = request.query_params.get("territory_id")
        if not territory_id:
            return Response({"detail": "territory_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        territory = get_object_or_404(Territory, pk=territory_id)
        if not admin_can_manage_territory(request.user, territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        qs = ProblemReport.objects.filter(territory=territory).select_related("zone", "machine", "reported_by").order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        results = [
            {
                "id": r.id,
                "type": r.type,
                "description": r.description,
                "status": r.status,
                "zone_name": r.zone.name if r.zone else None,
                "machine_number": r.machine.number if r.machine else None,
                "reported_by_id": r.reported_by.id,
                "created_at": r.created_at,
                "resolved_at": r.resolved_at,
            }
            for r in qs
        ]
        return Response(results, status=status.HTTP_200_OK)


class ProblemReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int):
        report = get_object_or_404(ProblemReport.objects.select_related("territory"), pk=pk)
        if not admin_can_manage_territory(request.user, report.territory):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get("status")
        valid_statuses = {value for value, _ in ProblemReport.STATUS_CHOICES}
        if new_status not in valid_statuses:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        report.status = new_status
        if new_status == ProblemReport.STATUS_RESOLVED:
            report.resolved_at = timezone.now()
            report.resolved_by = request.user
        report.save(update_fields=["status", "resolved_at", "resolved_by"])
        return Response({"id": report.id, "status": report.status}, status=status.HTTP_200_OK)


class InstructionTemplateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        model_name = (request.data.get("model_name") or "").strip()
        file_obj: UploadedFile = request.FILES.get("file")
        if not model_name or not file_obj:
            return Response(
                {"detail": "model_name and file are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        template, created = InstructionTemplate.objects.get_or_create(
            model_name__iexact=model_name,
            defaults={"model_name": model_name, "file": file_obj},
        )
        if not created:
            template.file.delete(save=False)
            template.file = file_obj
        try:
            file_obj.seek(0)
        except Exception:
            pass
        programs_to_save = parse_instruction_programs(file_obj, model_name=model_name)
        template.parsed_programs = programs_to_save
        try:
            file_obj.seek(0)
        except Exception:
            pass
        template.save()
        return Response(
            {
                "id": template.id,
                "model_name": template.model_name,
                "programs": programs_to_save,
                "created_at": template.created_at,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        search_query = (request.query_params.get("search") or request.query_params.get("q") or "").strip()
        if search_query:
            # Models that have instruction templates (with programs)
            templates = (
                InstructionTemplate.objects.filter(model_name__icontains=search_query)
                .order_by("model_name")[:10]
            )
            template_names = {t.model_name.lower() for t in templates}
            results = [{"model_name": t.model_name, "has_instructions": True} for t in templates]

            # Also include model names from existing machines that don't have a template yet
            machine_models = (
                Machine.objects.filter(model_name__icontains=search_query)
                .exclude(model_name="")
                .values_list("model_name", flat=True)
                .distinct()
                .order_by("model_name")[:10]
            )
            for name in machine_models:
                if name.lower() not in template_names and len(results) < 10:
                    results.append({"model_name": name, "has_instructions": False})

            results.sort(key=lambda x: x["model_name"].lower())
            return Response({"results": results[:8]}, status=status.HTTP_200_OK)

        model_name = (request.query_params.get("model_name") or "").strip()
        if not model_name:
            return Response({"detail": "model_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        template = InstructionTemplate.objects.filter(model_name__iexact=model_name).first()
        if not template:
            return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        key = normalize_model_key(model_name)
        programs = PROGRAM_OVERRIDES.get(key, template.parsed_programs)
        return Response(
            {
                "id": template.id,
                "model_name": template.model_name,
                "programs": programs,
                "file": template.file.url if template.file else None,
            },
            status=status.HTTP_200_OK,
        )
