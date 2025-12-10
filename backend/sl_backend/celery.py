import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sl_backend.settings")

app = Celery("sl_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
