from typing import Tuple

VerificationTuple = Tuple[str, str]


def normalize_lang(lang: str) -> str:
    lang = (lang or "").lower()
    if lang.startswith("pl"):
        return "pl"
    return "en"


def verification_email(lang: str, code: str) -> VerificationTuple:
    lang = normalize_lang(lang)

    if lang == "pl":
        subject = "SmartLaundry: kod weryfikacyjny"
        body = (
            "Cześć,\n\n"
            f"Twój kod weryfikacyjny SmartLaundry to: {code}\n\n"
            "Wpisz ten kod w aplikacji, aby potwierdzić adres e-mail.\n"
            "Jeśli to nie Ty próbowałeś(-aś) się zarejestrować, po prostu zignoruj tę wiadomość.\n\n"
            "Zespół SmartLaundry"
        )
        return subject, body

    subject = "SmartLaundry: verification code"
    body = (
        "Hello,\n\n"
        f"Your SmartLaundry verification code is: {code}\n\n"
        "Enter this code in the app to confirm your email address.\n"
        "If you did not try to sign up, you can safely ignore this message.\n\n"
        "SmartLaundry team"
    )
    return subject, body


def reset_password_email(lang: str, code: str) -> VerificationTuple:
    lang = normalize_lang(lang)

    if lang == "pl":
        subject = "SmartLaundry: reset hasła"
        body = (
            "Cześć,\n\n"
            "Otrzymaliśmy prośbę o reset hasła do Twojego konta SmartLaundry.\n"
            f"Twój kod do resetu hasła: {code}\n\n"
            "Wpisz ten kod w aplikacji, aby ustawić nowe hasło.\n"
            "Jeśli to nie Ty wysłałeś(-aś) tę prośbę, zignoruj tę wiadomość.\n\n"
            "Zespół SmartLaundry"
        )
        return subject, body

    subject = "SmartLaundry: password reset"
    body = (
        "Hello,\n\n"
        "We received a request to reset the password for your SmartLaundry account.\n"
        f"Your password reset code is: {code}\n\n"
        "Enter this code in the app to set a new password.\n"
        "If you did not request this, you can safely ignore this message.\n\n"
        "SmartLaundry team"
    )
    return subject, body
