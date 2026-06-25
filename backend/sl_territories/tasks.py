from celery import shared_task
from datetime import timedelta


@shared_task
def auto_cancel_unconfirmed_booking(booking_id: int) -> None:
    from django.utils import timezone

    from .models import Booking, ReservationStatusHistory, TerritoryAccess, UserNotification

    try:
        booking = Booking.objects.select_related(
            "user", "machine__zone__territory"
        ).get(pk=booking_id)
    except Booking.DoesNotExist:
        return

    if booking.status != Booking.STATUS_ACTIVE:
        return
    if booking.confirmed_at is not None:
        return

    # Bail out if the cancellation deadline hasn't passed yet — this guards against
    # CELERY_TASK_ALWAYS_EAGER=True (dev mode) which ignores the eta and fires immediately.
    deadline = booking.start_time + timedelta(minutes=15)
    if timezone.now() < deadline:
        return

    # If user extended the confirmation window, give them 30 more minutes
    if booking.confirmation_extended:
        extended_deadline = booking.start_time + timedelta(minutes=45)
        if timezone.now() < extended_deadline:
            auto_cancel_unconfirmed_booking.apply_async(
                args=[booking_id],
                eta=extended_deadline,
            )
            return

    booking.status = Booking.STATUS_CANCELLED
    booking.save(update_fields=["status"])

    ReservationStatusHistory.objects.create(
        booking=booking,
        previous_status=Booking.STATUS_ACTIVE,
        new_status=Booking.STATUS_CANCELLED,
        note="no_show",
    )

    territory = booking.machine.zone.territory
    access, _ = TerritoryAccess.objects.get_or_create(
        user=booking.user,
        territory=territory,
    )
    access.no_show_count += 1
    access.penalty_until = timezone.now() + timedelta(days=3)
    access.save(update_fields=["no_show_count", "penalty_until"])

    machine_number = booking.machine.number
    territory_name = territory.name
    penalty_limit = access.effective_booking_limit()

    UserNotification.objects.get_or_create(
        user=booking.user,
        booking=booking,
        type=UserNotification.TYPE_BOOKING_CANCELLED,
        defaults={
            "title": "Rezerwacja anulowana automatycznie",
            "message": (
                f"Pralka #{machine_number} ({territory_name}): rezerwacja została anulowana, "
                f"ponieważ nie potwierdzono przybycia w ciągu 15 minut. "
                f"Limit rezerwacji obniżony do {penalty_limit} na 3 dni."
            ),
        },
    )
