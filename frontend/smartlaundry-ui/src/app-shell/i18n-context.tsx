import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type LanguageCode = "en" | "pl" | "ru";

export type TranslationKey =
  | "appTitle"
  | "signIn"
  | "signUp"
  | "myQueue"
  | "language"
  | "theme"
  | "loadingSlowTitle"
  | "loadingSlowReasonNetwork"
  | "loadingSlowReasonDevice"
  | "errorInvalidEmail"
  | "errorEmailRequired"
  | "errorEmailPasswordRequired"
  | "errorPasswordMinLength"
  | "errorPasswordMissingUpper"
  | "errorPasswordMissingLower"
  | "errorPasswordMissingDigit"
  | "errorPasswordMissingSpecial"
  | "errorPasswordsNotMatch"
  | "errorEmailAlreadyRegistered"
  | "errorRegistrationGeneric"
  | "errorLoginInvalid"
  | "errorLoginNotVerified"
  | "errorCodeRequired"
  | "errorCodeInvalidOrExpired"
  | "errorResetRequestFailed"
  | "errorResetFailed"
  | "infoVerificationCodeSent"
  | "infoVerificationCodeResent"
  | "infoResetCodeSent"
  | "infoResetCodeResent"
  | "authChoiceTitle"
  | "authChoiceSubtitle"
  | "authChoiceSignIn"
  | "authChoiceSignUp"
  | "authTitleSignIn"
  | "authTitleSignUp"
  | "authTitleReset"
  | "authTitleSetNewPassword"
  | "authTitlePasswordChanged"
  | "authPasswordChangedText"
  | "authContinue"
  | "authSendCode"
  | "authSave"
  | "authGoToSignIn"
  | "authEmailLabel"
  | "authPasswordLabel"
  | "authRepeatPasswordLabel"
  | "authCodeLabel"
  | "authForgotPassword"
  | "authNoAccountYet"
  | "authAlreadyHaveAccount"
  | "authPasswordHint"
  | "authBack"
  | "authAccountCreatedText"
  | "heroTitle"
  | "heroText"
  | "heroPrimaryCta"
  | "heroSecondaryCta"
  | "authRoleUser"
  | "authRoleAdmin"
  | "authRoleSuperAdmin"
  | "profileLanguage"
  | "profileCodes"
  | "profileAllUsers"
  | "profileChangePassword"
  | "profileLogout"
  | "profileCodesTitle"
  | "profileCodesDescription"
  | "profileCodesCurrent"
  | "profileCodesEmpty"
  | "profileCodesNewCodeLabel"
  | "profileCodesNewCodePlaceholder"
  | "profileCodesAdd"
  | "profileCodesErrorInvalid"
  | "profileCodesErrorDuplicate"
  | "profileUsersMenuTitle"
  | "profileUsersMenuDescription"
  | "profileUsersTableHeaderUser"
  | "profileUsersTableHeaderEmail"
  | "profileUsersTableHeaderRole"
  | "profileUsersTableHeaderStatus"
  | "profileUsersLoading"
  | "profileUsersNoData"
  | "profileUsersStatusActive"
  | "profileUsersStatusBlocked"
  | "profileUsersMakeUser"
  | "profileUsersMakeAdmin"
  | "profileUsersBlock"
  | "profileUsersUnblock"
  | "profileUsersErrorLoad"
  | "profileUsersErrorAction"
  | "profileAdminTerritories"
  | "profileAdminUsers"
  | "profileSuperAdminAllUsers"
  | "profileSuperAdminAllTerritories";

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<LanguageCode, Dictionary> = {
  en: {
    appTitle: "SmartLaundry",
    signIn: "Sign in",
    signUp: "Sign up",
    myQueue: "My bookings",
    language: "Language",
    theme: "Theme",
    loadingSlowTitle: "Things are taking longer than usual",
    loadingSlowReasonNetwork: "Possible reason: unstable or slow internet connection.",
    loadingSlowReasonDevice: "Possible reason: low device performance or heavy background apps.",
    errorInvalidEmail: "Please enter a valid email address.",
    errorEmailRequired: "Email is required.",
    errorEmailPasswordRequired: "Email and password are required.",
    errorPasswordMinLength: "Password must be at least 8 characters long.",
    errorPasswordMissingUpper: "Password must include at least one uppercase letter.",
    errorPasswordMissingLower: "Password must include at least one lowercase letter.",
    errorPasswordMissingDigit: "Password must include at least one digit.",
    errorPasswordMissingSpecial: "Password must include at least one special character.",
    errorPasswordsNotMatch: "Passwords do not match.",
    errorEmailAlreadyRegistered: "This email is already registered. Try to sign in instead.",
    errorRegistrationGeneric: "Registration failed. Please try again.",
    errorLoginInvalid: "Invalid email or password.",
    errorLoginNotVerified: "Account exists but email is not verified yet.",
    errorCodeRequired: "Please enter the 6-digit code.",
    errorCodeInvalidOrExpired: "Invalid or expired code.",
    errorResetRequestFailed: "Failed to send reset code. Please try again.",
    errorResetFailed: "Failed to reset password. Please try again.",
    infoVerificationCodeSent:
      "Verification code was sent. For development it is printed in the backend console.",
    infoVerificationCodeResent:
      "New verification code was sent. For development it is printed in the backend console.",
    infoResetCodeSent: "Reset code was sent. For development it is printed in the backend console.",
    infoResetCodeResent:
      "New reset code was sent. For development it is printed in the backend console.",
    authChoiceTitle: "Welcome to SmartLaundry",
    authChoiceSubtitle: "Choose what you want to do",
    authChoiceSignIn: "I already have an account",
    authChoiceSignUp: "Create a new account",
    authTitleSignIn: "Sign in",
    authTitleSignUp: "Create account",
    authTitleReset: "Reset password",
    authTitleSetNewPassword: "Set new password",
    authTitlePasswordChanged: "Password changed",
    authPasswordChangedText: "Your password has been updated. Please sign in with the new password.",
    authContinue: "Continue",
    authSendCode: "Send code",
    authSave: "Save",
    authGoToSignIn: "Go to sign in",
    authEmailLabel: "Email",
    authPasswordLabel: "Password",
    authRepeatPasswordLabel: "Repeat password",
    authCodeLabel: "Code",
    authForgotPassword: "Forgot password",
    authNoAccountYet: "Do not have an account yet",
    authAlreadyHaveAccount: "Already have an account",
    authPasswordHint:
      "At least 8 characters, including upper and lower case letters, a digit and a special character.",
    authBack: "Back",
    authAccountCreatedText: "Your account has been created successfully.",
    heroTitle: "Smart queue for shared washing machines",
    heroText:
      "Online booking system for laundry rooms in dormitories and shared buildings. Transparent queue, real time machine status, notifications and protection against spam bookings.",
    heroPrimaryCta: "Sign up",
    heroSecondaryCta: "Sign in",
    authRoleUser: "User",
    authRoleAdmin: "Administrator",
    authRoleSuperAdmin: "Super administrator",
    profileLanguage: "Language",
    profileCodes: "Codes",
    profileAllUsers: "All users",
    profileChangePassword: "Change password",
    profileLogout: "Sign out",
    profileCodesTitle: "Active codes",
    profileCodesDescription: "You do not have any active codes yet.",
    profileCodesCurrent: "Active codes",
    profileCodesEmpty: "You do not have any active codes.",
    profileCodesNewCodeLabel: "Add new code",
    profileCodesNewCodePlaceholder: "Enter code from administrator",
    profileCodesAdd: "Add code",
    profileCodesErrorInvalid: "Please enter a valid code.",
    profileCodesErrorDuplicate: "This code is already added.",
    profileUsersMenuTitle: "All users",
    profileUsersMenuDescription: "Manage users and administrators.",
    profileUsersTableHeaderUser: "User",
    profileUsersTableHeaderEmail: "Email",
    profileUsersTableHeaderRole: "Role",
    profileUsersTableHeaderStatus: "Status",
    profileUsersLoading: "Loading users…",
    profileUsersNoData: "No users to display.",
    profileUsersStatusActive: "Active",
    profileUsersStatusBlocked: "Blocked",
    profileUsersMakeUser: "Make user",
    profileUsersMakeAdmin: "Make admin",
    profileUsersBlock: "Block",
    profileUsersUnblock: "Unblock",
    profileUsersErrorLoad: "Failed to load users list.",
    profileUsersErrorAction: "Failed to perform action.",
    profileAdminTerritories: "Manage locations and washing machines for this code.",
    profileAdminUsers: "Manage users of this location.",
    profileSuperAdminAllUsers: "All users and administrators.",
    profileSuperAdminAllTerritories: "All locations and codes."
  },
  pl: {
    appTitle: "SmartLaundry",
    signIn: "Zaloguj się",
    signUp: "Zarejestruj się",
    myQueue: "Moje rezerwacje",
    language: "Język",
    theme: "Motyw",
    loadingSlowTitle: "To trwa dłużej niż zwykle",
    loadingSlowReasonNetwork: "Możliwy powód: niestabilne lub wolne połączenie internetowe.",
    loadingSlowReasonDevice: "Możliwy powód: słaba wydajność urządzenia lub ciężkie aplikacje w tle.",
    errorInvalidEmail: "Podaj poprawny adres e-mail.",
    errorEmailRequired: "Adres e-mail jest wymagany.",
    errorEmailPasswordRequired: "Adres e-mail i hasło są wymagane.",
    errorPasswordMinLength: "Hasło musi mieć co najmniej 8 znaków.",
    errorPasswordMissingUpper: "Hasło musi zawierać przynajmniej jedną wielką literę.",
    errorPasswordMissingLower: "Hasło musi zawierać przynajmniej jedną małą literę.",
    errorPasswordMissingDigit: "Hasło musi zawierać przynajmniej jedną cyfrę.",
    errorPasswordMissingSpecial: "Hasło musi zawierać przynajmniej jeden znak specjalny.",
    errorPasswordsNotMatch: "Hasła не są identyczne.",
    errorEmailAlreadyRegistered: "Ten adres e-mail jest już zarejestrowany. Spróbuj się zalogować.",
    errorRegistrationGeneric: "Rejestracja не powiodła się. Spróbuj ponownie.",
    errorLoginInvalid: "Nieprawidłowy адрес e-mail lub hasło.",
    errorLoginNotVerified: "Konto istnieje, ale adres e-mail не został jeszcze potwierdzony.",
    errorCodeRequired: "Wpisz 6-cyfrowy kod.",
    errorCodeInvalidOrExpired: "Nieprawidłowy lub wygasły kod.",
    errorResetRequestFailed: "Nie udało się wysłać коду resetującego. Spróbuj ponownie.",
    errorResetFailed: "Nie udało się zresetować hasła. Spróbuj ponownie.",
    infoVerificationCodeSent:
      "Kod weryfikacyjny został wysłany. W trybie deweloperskim jest widoczny w konsoli backendu.",
    infoVerificationCodeResent:
      "Nowy kod weryfikacyjny został wysłany. W trybie деweloperskim jest widoczny w konsoli backendu.",
    infoResetCodeSent:
      "Kod do resetu hasła został wysłany. W trybie деweloperskim jest widoczny w консоли backendu.",
    infoResetCodeResent:
      "Nowy kod do resetu hasła został wysłany. W trybie деweloperskim jest widoczny w консоли backendu.",
    authChoiceTitle: "Witaj w SmartLaundry",
    authChoiceSubtitle: "Wybierz, co chcesz zrobić",
    authChoiceSignIn: "Mam już konto",
    authChoiceSignUp: "Chcę utworzyć nowe konto",
    authTitleSignIn: "Logowanie",
    authTitleSignUp: "Rejestracja",
    authTitleReset: "Reset hasła",
    authTitleSetNewPassword: "Ustaw nowe hasło",
    authTitlePasswordChanged: "Hasło zostało zmienione",
    authPasswordChangedText: "Twoje hasło zostało zaktualizowane. Zaloguj się przy użyciu nowego hasła.",
    authContinue: "Kontynuuj",
    authSendCode: "Wyślij kod",
    authSave: "Zapisz",
    authGoToSignIn: "Przejdź do logowania",
    authEmailLabel: "Adres e-mail",
    authPasswordLabel: "Hasło",
    authRepeatPasswordLabel: "Powtórz hasło",
    authCodeLabel: "Kod",
    authForgotPassword: "Zapomniałeś hasła",
    authNoAccountYet: "Nie masz jeszcze konta",
    authAlreadyHaveAccount: "Masz już konto",
    authPasswordHint:
      "Co najmniej 8 znaków, w tym małe i wielkie litery, cyfra oraz znak specjalny.",
    authBack: "Wróć",
    authAccountCreatedText: "Twoje konto zostało pomyślnie utworzone.",
    heroTitle: "Inteligentna kolejka do współdzielonych pralek",
    heroText:
      "System rezerwacji online dla pralni w akademikach i budynkach współdzielonych. Przejrzysta kolejka, status pralek w czasie rzeczywistym, powiadomienia i ochrona przed spamującymi rezerwacjami.",
    heroPrimaryCta: "Zarejestruj się",
    heroSecondaryCta: "Zaloguj się",
    authRoleUser: "Użytkownik",
    authRoleAdmin: "Administrator",
    authRoleSuperAdmin: "Super administrator",
    profileLanguage: "Język",
    profileCodes: "Kody",
    profileAllUsers: "Wszyscy użytkownicy",
    profileChangePassword: "Zmień hasło",
    profileLogout: "Wyloguj się",
    profileCodesTitle: "Aktywne kody",
    profileCodesDescription: "Nie masz jeszcze żadnych aktywnych kodów.",
    profileCodesCurrent: "Aktywne kody",
    profileCodesEmpty: "Nie masz żadnych aktywnych kodów.",
    profileCodesNewCodeLabel: "Dodaj nowy kod",
    profileCodesNewCodePlaceholder: "Wpisz kod od administratora",
    profileCodesAdd: "Dodaj kod",
    profileCodesErrorInvalid: "Podaj poprawny kod.",
    profileCodesErrorDuplicate: "Ten kod jest już dodany.",
    profileUsersMenuTitle: "Wszyscy użytkownicy",
    profileUsersMenuDescription: "Zarządzaj użytkownikami i administratorami.",
    profileUsersTableHeaderUser: "Użytkownik",
    profileUsersTableHeaderEmail: "E-mail",
    profileUsersTableHeaderRole: "Rola",
    profileUsersTableHeaderStatus: "Status",
    profileUsersLoading: "Ładowanie listy użytkowników…",
    profileUsersNoData: "Brak użytkowników do wyświetlenia.",
    profileUsersStatusActive: "Aktywne konto",
    profileUsersStatusBlocked: "Zablokowane konto",
    profileUsersMakeUser: "Ustaw jako użytkownika",
    profileUsersMakeAdmin: "Ustaw jako administratora",
    profileUsersBlock: "Zablokuj",
    profileUsersUnblock: "Odblokuj",
    profileUsersErrorLoad: "Nie udało się wczytać listy użytkowników.",
    profileUsersErrorAction: "Nie udało się wykonać akcji.",
    profileAdminTerritories: "Zarządzaj lokalizacjami i pralkami dla tego kodu.",
    profileAdminUsers: "Zarządzaj użytkownikami tej lokalizacji.",
    profileSuperAdminAllUsers: "Wszyscy użytkownicy i administratorzy.",
    profileSuperAdminAllTerritories: "Wszystkie lokalizacje i kody."
  },
  ru: {
    appTitle: "SmartLaundry",
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    myQueue: "Мои бронирования",
    language: "Язык",
    theme: "Тема",
    loadingSlowTitle: "Загрузка идёт дольше обычного",
    loadingSlowReasonNetwork: "Возможная причина: нестабильное или медленное интернет-соединение.",
    loadingSlowReasonDevice: "Возможная причина: слабое устройство или тяжёлые фоновые приложения.",
    errorInvalidEmail: "Пожалуйста, введите корректный адрес электронной почты.",
    errorEmailRequired: "Требуется адрес электронной почты.",
    errorEmailPasswordRequired: "Нужно указать и почту, и пароль.",
    errorPasswordMinLength: "Пароль должен содержать минимум 8 символов.",
    errorPasswordMissingUpper: "Пароль должен содержать хотя бы одну заглавную букву.",
    errorPasswordMissingLower: "Пароль должен содержать хотя бы одну строчную букву.",
    errorPasswordMissingDigit: "Пароль должен содержать хотя бы одну цифру.",
    errorPasswordMissingSpecial: "Пароль должен содержать хотя бы один специальный символ.",
    errorPasswordsNotMatch: "Пароли не совпадают.",
    errorEmailAlreadyRegistered: "Этот e-mail уже зарегистрирован. Попробуйте войти.",
    errorRegistrationGeneric: "Не удалось завершить регистрацию. Попробуйте ещё раз.",
    errorLoginInvalid: "Неверный e-mail или пароль.",
    errorLoginNotVerified: "Аккаунт существует, но e-mail ещё не подтверждён.",
    errorCodeRequired: "Введите 6-значный код.",
    errorCodeInvalidOrExpired: "Неверный или просроченный код.",
    errorResetRequestFailed: "Не удалось отправить код для сброса. Попробуйте ещё раз.",
    errorResetFailed: "Не удалось сбросить пароль. Попробуйте ещё раз.",
    infoVerificationCodeSent:
      "Код подтверждения отправлен. В режиме разработки он печатается в консоли backend’а.",
    infoVerificationCodeResent:
      "Новый код подтверждения отправлен. В режиме разработки он печатается в консоли backend’а.",
    infoResetCodeSent:
      "Код для смены пароля отправлен. В режиме разработки он печатается в консоли backend’а.",
    infoResetCodeResent:
      "Новый код для смены пароля отправлен. В режиме разработки он печатается в консоли backend’а.",
    authChoiceTitle: "Добро пожаловать в SmartLaundry",
    authChoiceSubtitle: "Выберите, что вы хотите сделать",
    authChoiceSignIn: "У меня уже есть аккаунт",
    authChoiceSignUp: "Создать новый аккаунт",
    authTitleSignIn: "Вход",
    authTitleSignUp: "Создание аккаунта",
    authTitleReset: "Сброс пароля",
    authTitleSetNewPassword: "Новый пароль",
    authTitlePasswordChanged: "Пароль изменён",
    authPasswordChangedText: "Ваш пароль обновлён. Войдите, используя новый пароль.",
    authContinue: "Продолжить",
    authSendCode: "Выслать код",
    authSave: "Сохранить",
    authGoToSignIn: "Перейти ко входу",
    authEmailLabel: "Электронная почта",
    authPasswordLabel: "Пароль",
    authRepeatPasswordLabel: "Повторите пароль",
    authCodeLabel: "Код",
    authForgotPassword: "Забыли пароль",
    authNoAccountYet: "Ещё нет аккаунта",
    authAlreadyHaveAccount: "Уже есть аккаунт",
    authPasswordHint:
      "Минимум 8 символов, включая строчные и заглавные буквы, цифру и специальный символ.",
    authBack: "Вернуться",
    authAccountCreatedText: "Ваш аккаунт успешно создан.",
    heroTitle: "Умная очередь к общим стиральным машинам",
    heroText:
      "Онлайн-система бронирования для прачечных в общежитиях и совместно используемых зданиях. Прозрачная очередь, статус машин в реальном времени, уведомления и защита от спам-бронирований.",
    heroPrimaryCta: "Зарегистрироваться",
    heroSecondaryCta: "Войти",
    authRoleUser: "Пользователь",
    authRoleAdmin: "Администратор",
    authRoleSuperAdmin: "Супер администратор",
    profileLanguage: "Язык",
    profileCodes: "Коды",
    profileAllUsers: "Все пользователи",
    profileChangePassword: "Сменить пароль",
    profileLogout: "Выйти",
    profileCodesTitle: "Активные коды",
    profileCodesDescription: "У вас пока нет активных кодов.",
    profileCodesCurrent: "Активные коды",
    profileCodesEmpty: "Нет ни одного активного кода.",
    profileCodesNewCodeLabel: "Добавить новый код",
    profileCodesNewCodePlaceholder: "Введите код от администратора",
    profileCodesAdd: "Добавить код",
    profileCodesErrorInvalid: "Введите корректный код.",
    profileCodesErrorDuplicate: "Этот код уже добавлен.",
    profileUsersMenuTitle: "Все пользователи",
    profileUsersMenuDescription: "Управление пользователями и администраторами.",
    profileUsersTableHeaderUser: "Пользователь",
    profileUsersTableHeaderEmail: "E-mail",
    profileUsersTableHeaderRole: "Роль",
    profileUsersTableHeaderStatus: "Статус",
    profileUsersLoading: "Загрузка списка пользователей…",
    profileUsersNoData: "Нет пользователей для отображения.",
    profileUsersStatusActive: "Активен",
    profileUsersStatusBlocked: "Заблокирован",
    profileUsersMakeUser: "Сделать пользователем",
    profileUsersMakeAdmin: "Сделать админом",
    profileUsersBlock: "Заблокировать",
    profileUsersUnblock: "Разблокировать",
    profileUsersErrorLoad: "Не удалось загрузить список пользователей.",
    profileUsersErrorAction: "Не удалось выполнить действие.",
    profileAdminTerritories: "Управление локациями и стиральными машинами для этого кода.",
    profileAdminUsers: "Управление пользователями этой локации.",
    profileSuperAdminAllUsers: "Все пользователи и администраторы.",
    profileSuperAdminAllTerritories: "Все локации и коды."
  }
};

type I18nContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("sl_lang") as LanguageCode | null;
    if (stored && dictionaries[stored]) {
      setLangState(stored);
      return;
    }
    const browser = navigator.language.split("-")[0];
    if (browser === "pl" || browser === "ru") {
      setLangState(browser as LanguageCode);
    }
  }, []);

  const setLang = (l: LanguageCode) => {
    setLangState(l);
    window.localStorage.setItem("sl_lang", l);
  };

  const t = (key: TranslationKey) => dictionaries[lang][key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
