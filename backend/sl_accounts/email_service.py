from django.conf import settings
from django.core.mail import send_mail


def normalize_language(ui_language: str) -> str:
    value = (ui_language or "en").lower()
    if value.startswith("pl"):
        return "pl"
    return "en"


def send_verification_code_email(email: str, code: str, ui_language: str) -> None:
    lang = normalize_language(ui_language)

    if lang == "pl":
        subject = "SmartLaundry – kod weryfikacyjny"
        body = (
            f"Twój kod weryfikacyjny SmartLaundry: {code}.\n"
            "Kod jest ważny przez 15 minut."
        )
    else:
        subject = "SmartLaundry – verification code"
        body = (
            f"Your SmartLaundry verification code: {code}.\n"
            "The code is valid for 15 minutes."
        )

    print(f"[EMAIL DEBUG] Verification code for {email}: {code} ({lang})")
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)


def send_password_reset_code_email(email: str, code: str, ui_language: str) -> None:
    lang = normalize_language(ui_language)

    if lang == "pl":
        subject = "SmartLaundry – reset hasła"
        body = (
            f"Twój kod do resetu hasła SmartLaundry: {code}.\n"
            "Kod jest ważny przez 15 minut."
        )
    else:
        subject = "SmartLaundry – password reset code"
        body = (
            f"Your SmartLaundry password reset code: {code}.\n"
            "The code is valid for 15 minutes."
        )

    print(f"[EMAIL DEBUG] Password reset code for {email}: {code} ({lang})")
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
