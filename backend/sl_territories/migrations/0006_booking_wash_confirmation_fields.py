from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("sl_territories", "0005_booking_client_timezone_offset"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="selected_program_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="booking",
            name="selected_program_duration_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="wash_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="estimated_wash_end_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
