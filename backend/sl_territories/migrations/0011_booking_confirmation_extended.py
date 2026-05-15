from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sl_territories', '0010_usernotification_territory_problem_report_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='confirmation_extended',
            field=models.BooleanField(default=False),
        ),
    ]
