#!/bin/bash
# Run Django dev server accessible from LAN (phone, tablet, etc.)
cd "$(dirname "$0")"
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
