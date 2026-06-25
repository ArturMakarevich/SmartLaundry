import logging
import os

import requests
from django.conf import settings
from django.core.mail import send_mail

from .email_templates import reset_password_email, verification_email

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")


def send_code_email(email: str, code: str, subject: str, body: str, label: str) -> None:
    if settings.DEBUG:
        logger.debug("[EMAIL DEV] %s code for %s: %s", label, email, code)

    if RESEND_API_KEY:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        if response.status_code not in (200, 201):
            logger.error("[EMAIL] Resend error %s: %s", response.status_code, response.text)
            raise RuntimeError(f"Email send failed: {response.status_code}")
    else:
        logger.info("[EMAIL] Using Django SMTP backend for %s to %s", label, email)
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )


def send_verification_code_email(email: str, code: str, ui_language: str) -> None:
    subject, body = verification_email(ui_language, code)
    send_code_email(email, code, subject, body, "verification")


def send_password_reset_code_email(email: str, code: str, ui_language: str) -> None:
    subject, body = reset_password_email(ui_language, code)
    send_code_email(email, code, subject, body, "password reset")
