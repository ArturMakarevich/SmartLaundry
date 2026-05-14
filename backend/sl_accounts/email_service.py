import logging

from django.conf import settings
from django.core.mail import send_mail

from .email_templates import reset_password_email, verification_email

logger = logging.getLogger(__name__)


def send_code_email(email: str, code: str, subject: str, body: str, label: str) -> None:
    if settings.DEBUG:
        logger.debug("[EMAIL DEV] %s code for %s: %s", label, email, code)
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
    except Exception:
        if settings.DEBUG:
            logger.warning("[EMAIL DEV] Could not send %s email to %s; use code: %s", label, email, code)
            return
        raise


def send_verification_code_email(email: str, code: str, ui_language: str) -> None:
    subject, body = verification_email(ui_language, code)
    send_code_email(email, code, subject, body, "verification")


def send_password_reset_code_email(email: str, code: str, ui_language: str) -> None:
    subject, body = reset_password_email(ui_language, code)
    send_code_email(email, code, subject, body, "password reset")
