from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("sl_territories", "0002_instructiontemplate_machine_instruction_template"),
    ]

    operations = [
        migrations.AddField(
            model_name="zone",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
    ]
