import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type LanguageCode = "en" | "pl";

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
  | "profileSuperAdminAllTerritories"
  | "territoryFormTitle"
  | "territoryNameLabel"
  | "territoryZonesLabel"
  | "territoryMachinesPerZoneLabel"
  | "territoryZoneLabel"
  | "territorySaveGenerate"
  | "territoryErrorNameRequired"
  | "territoryErrorDuplicate"
  | "territoryErrorZoneCount"
  | "territoryErrorMachinesCount"
  | "territoryErrorSaveFailed"
  | "territoryNamePlaceholder"
  | "territoryEdit"
  | "territoryMachinesTitle"
  | "territoryMachineLabel"
  | "territoryMachinePlaceholder"
  | "territoryMachineFound"
  | "territoryMachineNotFound"
  | "territorySave"
  | "territorySearchInstruction"
  | "territoryUploadInstruction"
  | "territoryReuseInstruction"
  | "territoryUploadHint"
  | "territoryJoinCodeTitle"
  | "territoryJoinCodePlaceholder"
  | "territoryJoinCodeAdd"
  | "bookingTitle"
  | "bookingCTA"
  | "bookingBackToList"
  | "bookingTodayOnly"
  | "bookingWarningNextDay"
  | "bookingSelectProgram"
  | "bookingSelectProgramPlaceholder"
  | "bookingManualStart"
  | "bookingManualHint"
  | "bookingNearest"
  | "bookingContinue"
  | "bookingSummaryTitle"
  | "bookingStartLabel"
  | "bookingEndLabel"
  | "bookingNextAvailableLabel"
  | "bookingConfirm"
  | "bookingChangeSelection"
  | "bookingListTitle"
  | "bookingListEmpty"
  | "bookingUnknownUser"
  | "bookingMy"
  | "bookingMyDailyLimit"
  | "bookingNoSlots"
  | "bookingErrorProgram"
  | "bookingErrorStart"
  | "bookingErrorTodayOnly"
  | "bookingErrorFuture"
  | "bookingErrorStep"
  | "bookingErrorAlreadyBooked"
  | "bookingErrorDailyLimit"
  | "bookingErrorOverlap"
  | "bookingErrorMachineNotFound"
  | "bookingErrorGeneric"
  | "bookingSuccess"
  | "bookingActiveTitle"
  | "bookingActiveNone"
  | "landingOverviewTitle"
  | "landingOverviewIntro"
  | "landingOverviewAlt"
  | "landingAdminTitle"
  | "landingAdminItem1"
  | "landingAdminItem2"
  | "landingAdminItem3"
  | "landingUserTitle"
  | "landingUserItem1"
  | "landingUserItem2"
  | "landingUserItem3"
  | "landingUserItem4";

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
    profileSuperAdminAllTerritories: "All locations and codes.",
    territoryFormTitle: "Add territory",
    territoryNameLabel: "Territory name",
    territoryZonesLabel: "Number of zones",
    territoryMachinesPerZoneLabel: "Machines per zone",
    territoryZoneLabel: "Zone",
    territorySaveGenerate: "Save and generate code",
    territoryErrorNameRequired: "Territory name is required.",
    territoryErrorDuplicate: "Territory with this name already exists.",
    territoryErrorZoneCount: "At least one zone is required.",
    territoryErrorMachinesCount: "Each zone must have at least one machine.",
    territoryErrorSaveFailed: "Could not save territory. Please try again.",
    territoryNamePlaceholder: "e.g. City Tower A",
    territoryEdit: "Edit territory",
    territoryMachinesTitle: "Machines and models",
    territoryMachineLabel: "Machine",
    territoryMachinePlaceholder: "Model name",
    territoryMachineFound: "Found",
    territoryMachineNotFound: "Not found",
    territorySave: "Save",
    territorySearchInstruction: "Find instruction",
    territoryUploadInstruction: "Upload instruction file",
    territoryReuseInstruction: "We found an instruction in our database.",
    territoryUploadHint: "After upload we will auto-extract wash programs and reuse for the same model.",
    territoryJoinCodeTitle: "Enter territory code",
    territoryJoinCodePlaceholder: "6-character code",
    territoryJoinCodeAdd: "Add code",
    bookingTitle: "Booking",
    bookingCTA: "Book",
    bookingBackToList: "Back to all washers",
    bookingTodayOnly: "Booking available only today: {date}",
    bookingWarningNextDay: "Laundry will continue tomorrow. Tomorrow you can book from {time}.",
    bookingSelectProgram: "Select washing program",
    bookingSelectProgramPlaceholder: "Choose program",
    bookingManualStart: "Start time (today, 10-minute steps)",
    bookingManualHint: "Start times are only at :00/:10/:20/:30/:40/:50.",
    bookingNearest: "Nearest available time",
    bookingContinue: "Continue",
    bookingSummaryTitle: "Booking summary",
    bookingStartLabel: "Start",
    bookingEndLabel: "Estimated finish",
    bookingNextAvailableLabel: "Next booking allowed from",
    bookingConfirm: "Confirm booking",
    bookingChangeSelection: "Change selection",
    bookingListTitle: "Bookings for this washer",
    bookingListEmpty: "No bookings yet.",
    bookingUnknownUser: "User",
    bookingMy: "My booking",
    bookingMyDailyLimit: "This is 1 of 2 bookings allowed today.",
    bookingNoSlots: "No available slots today for this duration.",
    bookingErrorProgram: "Select a washing program",
    bookingErrorStart: "Select a start time",
    bookingErrorTodayOnly: "Booking must be for today",
    bookingErrorFuture: "Start time must be now or later",
    bookingErrorStep: "Start time must align to 10-minute steps",
    bookingErrorAlreadyBooked: "You already booked this washer today",
    bookingErrorDailyLimit: "Daily limit reached (max 2 active bookings)",
    bookingErrorOverlap: "Selected slot overlaps with existing bookings",
    bookingErrorMachineNotFound: "Washer not found",
    bookingErrorGeneric: "Booking failed",
    bookingSuccess: "Booking confirmed",
    bookingActiveTitle: "Active booking",
    bookingActiveNone: "None",
    landingOverviewTitle:
      "SmartLaundry is a web platform for managing the availability of washing machines in shared spaces: dorms, residential complexes, and other laundry locations.",
    landingOverviewIntro:
      "It cuts queues and conflicts around “busy” machines by introducing a transparent booking mechanism.",
    landingOverviewAlt:
      "Some machines can stay outside the system (e.g., about 1/4) so users always have a walk-up option.",
    landingAdminTitle: "For location administrators",
    landingAdminItem1:
      "Add a territory/location with washing machines, set their models, and assign numbers that match the labels on the machines so users know exactly which one they book.",
    landingAdminItem2:
      "Attach or find the model manual; the platform extracts wash programs and cycle times so schedules build automatically and users pick valid modes.",
    landingAdminItem3:
      "After setup the system generates a territory code. Share it only with real residents to block fake sign-ups and bogus bookings.",
    landingUserTitle: "For users",
    landingUserItem1: "Add the territory code in your profile to unlock your laundry area.",
    landingUserItem2:
      "Book a specific washing machine by number (e.g., #5) - the same number is on the physical machine.",
    landingUserItem3:
      "Bookings are only for the current day and up to two per user per day to keep access fair.",
    landingUserItem4:
      "When creating a booking, choose a wash program; the system calculates finish time from the manual and builds non-overlapping slots automatically."
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
    errorPasswordsNotMatch: "Hasła nie są identyczne.",
    errorEmailAlreadyRegistered: "Ten adres e-mail jest już zarejestrowany. Spróbuj się zalogować.",
    errorRegistrationGeneric: "Rejestracja nie powiodła się. Spróbuj ponownie.",
    errorLoginInvalid: "Nieprawidłowy adres e-mail lub hasło.",
    errorLoginNotVerified: "Konto istnieje, ale adres e-mail nie został jeszcze potwierdzony.",
    errorCodeRequired: "Wpisz 6-cyfrowy kod.",
    errorCodeInvalidOrExpired: "Nieprawidłowy lub wygasły kod.",
    errorResetRequestFailed: "Nie udało się wysłać kodu resetującego. Spróbuj ponownie.",
    errorResetFailed: "Nie udało się zresetować hasła. Spróbuj ponownie.",
    infoVerificationCodeSent:
      "Kod weryfikacyjny został wysłany. W trybie deweloperskim jest widoczny w konsoli backendu.",
    infoVerificationCodeResent:
      "Nowy kod weryfikacyjny został wysłany. W trybie deweloperskim jest widoczny w konsoli backendu.",
    infoResetCodeSent:
      "Kod do resetu hasła został wysłany. W trybie deweloperskim jest widoczny w konsoli backendu.",
    infoResetCodeResent:
      "Nowy kod do resetu hasła został wysłany. W trybie deweloperskim jest widoczny w konsoli backendu.",
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
    profileSuperAdminAllTerritories: "Wszystkie lokalizacje i kody.",
    territoryFormTitle: "Dodaj lokalizację",
    territoryNameLabel: "Nazwa lokalizacji",
    territoryZonesLabel: "Liczba stref",
    territoryMachinesPerZoneLabel: "Pralki na strefę",
    territoryZoneLabel: "Strefa",
    territorySaveGenerate: "Zapisz i wygeneruj kod",
    territoryErrorNameRequired: "Wymagana jest nazwa lokalizacji.",
    territoryErrorDuplicate: "Taka lokalizacja już istnieje.",
    territoryErrorZoneCount: "Musi być przynajmniej jedna strefa.",
    territoryErrorMachinesCount: "W każdej strefie musi być co najmniej jedna pralka.",
    territoryErrorSaveFailed: "Nie udało się zapisać lokalizacji. Spróbuj ponownie.",
    territoryNamePlaceholder: "np. City Tower A",
    territoryEdit: "Edytuj lokalizację",
    territoryMachinesTitle: "Pralki i modele",
    territoryMachineLabel: "Pralka",
    territoryMachinePlaceholder: "Nazwa modelu",
    territoryMachineFound: "Znaleziono",
    territoryMachineNotFound: "Nie znaleziono",
    territorySave: "Zapisz",
    territorySearchInstruction: "Znajdź instrukcję",
    territoryUploadInstruction: "Prześlij plik instrukcji",
    territoryReuseInstruction: "Znaleźliśmy instrukcję w naszej bazie.",
    territoryUploadHint: "Po przesłaniu wyciągniemy programy prania i użyjemy ich dla tego modelu.",
    territoryJoinCodeTitle: "Wpisz kod lokalizacji",
    territoryJoinCodePlaceholder: "6-znakowy kod",
    territoryJoinCodeAdd: "Dodaj kod",
    bookingTitle: "Rezerwacja",
    bookingCTA: "Zarezerwuj",
    bookingBackToList: "Wróć do wszystkich pralek",
    bookingTodayOnly: "Rezerwacja dostępna tylko na dziś: {date}",
    bookingWarningNextDay: "Pranie przejdzie na jutro. Jutro rezerwacje od {time}.",
    bookingSelectProgram: "Wybierz program prania",
    bookingSelectProgramPlaceholder: "Wybierz program",
    bookingManualStart: "Godzina startu (dziś, co 10 min)",
    bookingManualHint: "Godziny startu tylko o :00/:10/:20/:30/:40/:50.",
    bookingNearest: "Najbliższy dostępny czas",
    bookingContinue: "Kontynuuj",
    bookingSummaryTitle: "Podsumowanie rezerwacji",
    bookingStartLabel: "Start",
    bookingEndLabel: "Szacowany koniec",
    bookingNextAvailableLabel: "Następna rezerwacja możliwa od",
    bookingConfirm: "Potwierdź rezerwację",
    bookingChangeSelection: "Zmień wybór",
    bookingListTitle: "Rezerwacje dla tej pralki",
    bookingListEmpty: "Brak rezerwacji.",
    bookingUnknownUser: "Użytkownik",
    bookingMy: "Moja rezerwacja",
    bookingMyDailyLimit: "To jest 1 z 2 możliwych rezerwacji dzisiaj.",
    bookingNoSlots: "Brak wolnych terminów dzisiaj dla tego czasu trwania.",
    bookingErrorProgram: "Wybierz program prania",
    bookingErrorStart: "Wybierz czas startu",
    bookingErrorTodayOnly: "Rezerwacja tylko na dziś",
    bookingErrorFuture: "Czas startu musi być teraz lub później",
    bookingErrorStep: "Czas startu musi wypadać co 10 minut",
    bookingErrorAlreadyBooked: "Masz już rezerwację tej pralki na dziś",
    bookingErrorDailyLimit: "Osiągnięto limit dzienny (maks 2 aktywne rezerwacje)",
    bookingErrorOverlap: "Wybrany czas nachodzi na istniejące rezerwacje",
    bookingErrorMachineNotFound: "Nie znaleziono pralki",
    bookingErrorGeneric: "Rezerwacja nie powiodła się",
    bookingSuccess: "Rezerwacja potwierdzona",
    bookingActiveTitle: "Aktywna rezerwacja",
    bookingActiveNone: "Brak",
    landingOverviewTitle:
      "SmartLaundry to platforma webowa do zarządzania dostępnością pralek w przestrzeniach wspólnych: akademikach, osiedlach i innych pralniach.",
    landingOverviewIntro:
      "Zmniejsza kolejki i konflikty wokół „zajętych” pralek dzięki przejrzystemu mechanizmowi rezerwacji.",
    landingOverviewAlt:
      "Część pralek można zostawić poza systemem (np. ok. 1/4), aby użytkownicy zawsze mieli możliwość skorzystania bez rezerwacji.",
    landingAdminTitle: "Dla administratorów lokalizacji",
    landingAdminItem1:
      "Dodaj terytorium/lokalizację z pralkami, wpisz ich modele i nadaj numery zgodne z oznaczeniami na urządzeniach, aby użytkownik dokładnie wiedział, którą pralkę rezerwuje.",
    landingAdminItem2:
      "Dołącz instrukcję modelu lub znajdź ją i dodaj; platforma wyciąga programy prania i czasy cykli, więc grafiki tworzą się automatycznie, a użytkownik wybiera poprawne tryby.",
    landingAdminItem3:
      "Po konfiguracji system generuje kod terytorium. Przekaż go tylko realnym mieszkańcom, co ogranicza fałszywe rejestracje i rezerwacje.",
    landingUserTitle: "Dla użytkowników",
    landingUserItem1: "Dodaj kod terytorium w profilu, aby odblokować pralnię w swojej lokalizacji.",
    landingUserItem2:
      "Rezerwuj konkretną pralkę po numerze (np. #5) - ten sam numer zobaczysz na urządzeniu.",
    landingUserItem3:
      "Rezerwacje są tylko na bieżący dzień i maksymalnie 2 na osobę dziennie, aby dostęp był uczciwy.",
    landingUserItem4:
      "Przy tworzeniu rezerwacji wybierz program; system na podstawie instrukcji obliczy czas zakończenia i ułoży niepokrywające się okna automatycznie."
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
    if (browser === "pl") {
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
