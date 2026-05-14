from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sl_territories", "0007_alter_machine_status_alter_usernotification_type_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="territoryaccess",
            name="no_show_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="territoryaccess",
            name="penalty_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
