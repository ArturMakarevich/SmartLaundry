import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sl_territories', '0009_invitecode_problemreport_notif_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='usernotification',
            name='territory',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='admin_notifications',
                to='sl_territories.territory',
            ),
        ),
        migrations.AlterField(
            model_name='usernotification',
            name='type',
            field=models.CharField(
                choices=[
                    ('booking_start_soon', 'Booking starts soon'),
                    ('wash_timer_started', 'Wash timer started'),
                    ('wash_completed', 'Wash completed'),
                    ('booking_ended', 'Booking ended'),
                    ('machine_unavailable', 'Machine became unavailable'),
                    ('booking_cancelled', 'Booking cancelled'),
                    ('user_blocked', 'User blocked'),
                    ('user_unblocked', 'User unblocked'),
                    ('reservation_confirmed', 'Reservation confirmed'),
                    ('territory_deleted', 'Territory deleted'),
                    ('problem_report', 'Problem report'),
                ],
                max_length=32,
            ),
        ),
    ]
