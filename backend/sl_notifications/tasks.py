from celery import shared_task

from sl_accounts.email_service import (
    send_verification_code_email,
    send_password_reset_code_email,
)


@shared_task
def send_verification_email_task(email: str, code: str, ui_language: str = "en") -> None:
    send_verification_code_email(
        email=email,
        code=code,
        ui_language=ui_language,
    )


@shared_task
def send_password_reset_email_task(email: str, code: str, ui_language: str = "en") -> None:
    send_password_reset_code_email(
        email=email,
        code=code,
        ui_language=ui_language,
    )
