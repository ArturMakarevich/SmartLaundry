from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sl_territories", "0004_territory_slot_strategy_usernotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="client_timezone_offset",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]

