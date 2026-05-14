import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type LanguageCode = "en" | "pl";

export type TranslationKey = KnownTranslationKey | (string & {});

/*
 * Translation keys are intentionally string-based because several feature
 * screens evolve quickly during the prototype stage. Missing keys fall back to
 * the key itself, while the dictionaries below keep the actual UI copy.
 */
export type KnownTranslationKey =
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
  | "authCodeSpamHint"
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
  | "profileUsersSearch"
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
  | "landingUserItem4"
  | "machineCardFreeNow"
  | "machineCardOccupied"
  | "machineCardBroken"
  | "machineCardInactive"
  | "machineCardUserBooking"
  | "machineNextFreeAt"
  | "machineCurrentSlotEnd"
  | "actionManageBooking"
  | "navTerritories"
  | "myTerritoriesTitle"
  | "myTerritoriesSubtitle"
  | "noTerritoriesTitle"
  | "noTerritoriesHint"
  | "joinTerritoryTitle"
  | "joinTerritoryCodeLabel"
  | "joinTerritoryCodePlaceholder"
  | "joinTerritoryButton"
  | "joinTerritorySuccess"
  | "joinTerritorySuccessNamed"
  | "joinTerritoryErrorGeneric"
  | "nearestFreeSlotZoneInfo"
  | "howItWorksPageTitle"
  | "howItWorks1Title" | "howItWorks1Text"
  | "howItWorks2Title" | "howItWorks2Text"
  | "howItWorks3Title" | "howItWorks3Text"
  | "howItWorks4Title" | "howItWorks4Text"
  | "howItWorks5Title" | "howItWorks5Text"
  | "howItWorks6Title" | "howItWorks6Text"
  | "howItWorks7Title" | "howItWorks7Text"
  | "howItWorks8Title" | "howItWorks8Text"
  | "howItWorks9Title" | "howItWorks9Text"
  | "howItWorks10Title" | "howItWorks10Text"
  | "howItWorks11Title" | "howItWorks11Text"
  | "howItWorks12Title" | "howItWorks12Text"
  | "howItWorks13Title" | "howItWorks13Text"
  | "landingHeroSubtitle"
  | "landingHeroDescription"
  | "landingHeroCtaHowItWorks"
  | "landingAboutTitle"
  | "landingAboutText1"
  | "landingAboutText2"
  | "landingAboutText3"
  | "landingStepsTitle"
  | "landingStep1Title" | "landingStep1Text"
  | "landingStep2Title" | "landingStep2Text"
  | "landingStep3Title" | "landingStep3Text"
  | "landingStep4Title" | "landingStep4Text"
  | "landingStep5Title" | "landingStep5Text"
  | "landingStep6Title" | "landingStep6Text"
  | "landingStep7Title" | "landingStep7Text"
  | "landingBenefitsTitle"
  | "landingBenefit1" | "landingBenefit2" | "landingBenefit3"
  | "landingBenefit4" | "landingBenefit5" | "landingBenefit6"
  | "landingAdminSectionTitle"
  | "landingAdminSectionText"
  | "landingAdminRoleSubtitle"
  | "landingAdminRoleText"
  | "landingAdminContactHint"
  | "inviteCodeLabel"
  | "inviteCodeExpires"
  | "inviteCodeExpired"
  | "inviteCodeNoActive"
  | "inviteCodeGenerate"
  | "inviteCodeGenerating"
  | "inviteCodeCopied"
  | "inviteCodeCopy"
  | "inviteCodeSectionTitle"
  | "problemReportTitle"
  | "problemReportType"
  | "problemReportDescription"
  | "problemReportSubmit"
  | "problemReportSuccess"
  | "problemReportError"
  | "problemReportTypeMachineBroken"
  | "problemReportTypeWaterLeak"
  | "problemReportTypeNoise"
  | "problemReportTypeOther"
  | "adminProblemReports"
  | "adminProblemReportOpen"
  | "adminProblemReportInProgress"
  | "adminProblemReportResolved"
  | "adminProblemReportMarkResolved"
  | "adminOpenReportsCount"
  | "adminProblemReportsNone"
  | "adminDeleteTerritory"
  | "adminDeleteTerritoryConfirm"
  | "adminAddFirstTerritory"
  | "adminEmptyDashboard"
  | "joinTerritoryCodeExpired"
  | "territoryRemove"
  | "territoryRemoveConfirm"
  | "territoryRemoveTitle"
  | "territoryRemoveBody"
  | "territoryRemoveCancel"
  | "territoryRemoveConfirmAction"
  | "territoriesAddAnother"
  | "joinTerritoryInstruction"
  | "actionReserveAnother"
  | "joinTerritoryOnlyOne"
  | "joinTerritoryLeaveFirst"
  | "joinTerritoryAdminHint"
  | "bookingFilterByTerritory"
  | "bookingFilterAllTerritories"
  | "bookingFilterByUser"
  | "bookingFilterUserPlaceholder"
  | "bookingFilterReset"
  | "loadingProgress"
  | "adminBasicInfo"
  | "adminAnalysingPdf"
  | "adminCheckingModel";

type Dictionary = Record<TranslationKey, string>;

// ─── Słowniki tłumaczeń ───────────────────────────────────────────────────────
const dictionaries: Record<LanguageCode, Dictionary> = {

  // Angielski
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
    infoVerificationCodeSent: "Verification code was sent to your email.",
    infoVerificationCodeResent: "New verification code was sent to your email.",
    infoResetCodeSent: "Reset code was sent to your email.",
    infoResetCodeResent: "New reset code was sent to your email.",
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
    authCodeSpamHint: "If you do not see the code, check your Spam folder.",
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
    profileUsersSearch: "Search by email or ID…",
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
    adminTerritoriesMenu: "Territories",
    adminDashboardTerritoriesTab: "Dashboard (Territories)",
    adminTerritoryTab: "Territory",
    adminAllTerritories: "All territories",
    adminAddTerritory: "Add territory",
    adminCreateTerritoryTitle: "Create territory",
    adminTerritorySetupSubtitle: "Set up laundry zones, machines, booking rules, and instruction manuals.",
    adminAllTerritoriesSubtitle: "Manage laundry territories, zones, machine models, and access codes.",
    adminTerritoriesPanelTitle: "Territories",
    adminTerritoriesPanelSubtitle: "Codes, zones, machines, and detected wash programs.",
    adminAllTerritoriesWashers: "All territories and washers",
    adminSystemOverviewSubtitle: "Full system overview with current reservation counts.",
    adminManageAllSubtitle: "Manage all territories, washing machines, users, and reservations.",
    adminTerritoriesLoading: "Loading territories...",
    adminTerritoriesEmpty: "No territories yet.",
    adminReservationsSubtitle: "Review and manage reservations across all users and territories.",
    bookingConfirmWindowOpens: "Confirmation opens at {time} and stays available for 15 minutes.",
    bookingConfirmWindowExpired: "Confirmation window expired.",
    adminBookingRulesTitle: "Booking rules",
    adminSlotPatternTitle: "Slot pattern",
    adminSlotPatternText: "1h, 1h, 2h, 2h repeats through the day. Long programs reserve consecutive slots.",
    adminUserLimitTitle: "User limit",
    adminUserLimitText: "Maximum 3 active bookings in the next 3 days.",
    adminConfirmationRuleTitle: "Confirmation",
    adminConfirmationRuleText: "User confirms arrival during the first 15 minutes.",
    adminLegacySlotsTitle: "Use legacy fixed 2-hour booking slots",
    adminLegacySlotsText: "Leave disabled for the current dynamic recommendation flow.",
    adminZonesStepTitle: "Zones",
    adminZoneNamesMachineCounts: "Zone names and machine counts",
    adminZonesCount: "{count} zones",
    adminMachinesCount: "{count} machines",
    adminProgramsCount: "{count} programs",
    adminModelFound: "Model found",
    adminNoManual: "No manual",
    adminReplacePdf: "Replace PDF",
    adminUploadPdf: "Upload PDF",
    adminDetectedPrograms: "Detected programs",
    adminReviewTitle: "Review",
    adminReviewTerritory: "Territory",
    adminReviewZones: "Zones",
    adminReviewMachines: "Machines",
    adminReviewPrograms: "Programs",
    adminNotNamed: "Not named",
    adminProgramsAcrossMachines: "{programs} across {machines} machines",
    adminEdit: "Edit",
    adminNoModel: "No model",
    adminSearch: "Search",
    adminDashboardTitle: "Admin dashboard",
    adminAllUsers: "All users",
    adminAllReservations: "All reservations",
    adminCode: "Code",
    adminCodeSuperadmin: "Superadmin code",
    adminCreatedBy: "Created by",
    adminActiveUsers: "Active users",
    adminActiveReservations: "Active reservations",
    adminTerritoryUsers: "Territory users",
    adminNoUsers: "No users in this territory.",
    adminUserBlocked: "Blocked",
    adminUserActive: "Active",
    adminBlockUser: "Block user",
    adminUnblockUser: "Unblock user",
    adminLastActivity: "Last activity",
    adminMarkActive: "Mark active",
    adminMarkInactive: "Mark inactive",
    adminMarkBroken: "Mark broken",
    adminActionFailed: "Could not complete this action.",
    machineStatusActive: "Active",
    machineStatusBusy: "Busy",
    machineStatusInactive: "Inactive",
    machineStatusBroken: "Broken",
    adminUsersTitle: "All users",
    adminUsersSubtitle: "Manage users and administrators.",
    adminSearchUserPlaceholder: "Search user or email",
    adminTableUser: "User",
    adminTableEmail: "E-mail",
    adminTableRole: "Role",
    adminTableStatus: "Status",
    adminTableActions: "Actions",
    adminActiveAccount: "Active account",
    adminBlockedAccount: "Blocked",
    adminMakeUser: "Make user",
    adminMakeAdmin: "Make administrator",
    adminUsersLoadError: "Could not load users.",
    adminUsersUpdateError: "Could not update user.",
    adminActiveReservationsSystem: "Active reservations across system",
    bookingConfirmedShort: "Booking confirmed.",
    bookingModeLabel: "Mode",
    estimatedFinish: "Estimated finish",
    confirmWithin: "Confirm within",
    quickWash: "Quick wash",
    normalWash: "Normal wash",
    confirmWithoutMode: "Confirm without mode",
    couldNotConfirmBooking: "Could not confirm this booking. The 15-minute confirmation window may have expired.",
    territoryJoinCodeTitle: "Enter territory code",
    territoryJoinCodePlaceholder: "6-character code",
    territoryJoinCodeAdd: "Add code",
    bookingTitle: "Booking",
    bookingCTA: "Book",
    bookingBackToList: "Back to all washers",
    bookingTodayOnly: "Booking available only today: {date}",
    bookingWarningNextDay: "Laundry will continue tomorrow. Tomorrow you can book from {time}.",
    bookingSelectProgram: "Select washing program",
    bookingSelectProgramPlaceholder: "Choose washing program",
    bookingProgramFirst: "Choose washing program",
    bookingProgramHelper: "Choose a washing mode to see the recommended booking length.",
    bookingProgramRequiredForReservation: "Choose a washing program to book a time slot.",
    bookingRecommendationSingle: "Recommendation: program “{programName}” lasts {duration}. The highlighted {hours}-hour slot is enough for this program.",
    bookingRecommendationMultiple: "Recommendation: program “{programName}” lasts {duration}. The highlighted slots cover the required washing time.",
    bookingRecommendationNoSlots: "No available sequence covers {duration}.",
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
    bookingUnknownUser: "Unknown user",
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
    navDashboard: "Dashboard",
    navMyBookings: "My bookings",
    navNotifications: "Notifications",
    navSupport: "Support",
    navHowItWorks: "How it works",
    sidebarPromo: "Clean clothes,\nhappy you.",
    notificationsAria: "Notifications",
    closeNotifications: "Close notifications",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    notificationsTitle: "Notifications",
    latestNotifications: "Latest notifications",
    notificationsSubtitle: "All booking and laundry status updates.",
    markAllRead: "Mark all read",
    showAll: "Show all",
    noNotifications: "No notifications yet.",
    bookingsPageTitle: "My bookings",
    bookingsPageSubtitle: "Manage active reservations and review previous bookings.",
    refresh: "Refresh",
    couldNotLoadBookings: "Could not load bookings.",
    couldNotCancelBooking: "Could not cancel booking.",
    activeReservations: "Active reservations",
    activeCount: "active",
    loadingBookings: "Loading bookings...",
    noActiveReservations: "No active reservations.",
    reservationRules: "Reservation rules",
    reservationRule1: "You can have up to 3 active bookings within the next 3 days.",
    reservationRule2: "Cancelled and past bookings do not count toward the active limit.",
    reservationRule3: "Cancel only reservations you no longer plan to use.",
    bookingHistory: "Booking history",
    bookingHistorySubtitle: "Completed, cancelled, and expired reservations.",
    loadingHistory: "Loading history...",
    noBookingHistory: "No booking history yet.",
    cancel: "Cancel",
    cancelling: "Cancelling...",
    activeStatus: "Active",
    expiredStatus: "Expired",
    territoryFallback: "Territory",
    dayToday: "Today",
    dayTomorrow: "Tomorrow",
    dayInTwoDays: "In 2 days",
    laundryBookingTitle: "Laundry Booking",
    territoryLabel: "Territory:",
    yourTerritories: "Your territories",
    dashboardSubtitle: "Find and book an available machine in a few steps.",
    selectDay: "Select day",
    bookingLimitInfo: "You can have up to 3 active bookings within the next 3 days.",
    findNearestFreeSlot: "Find nearest free slot",
    findNearestFreeSlotDescription: "Get the earliest available time across all machines.",
    machineSingular: "Machine",
    machinePlural: "Machines",
    activeBookings: "Active bookings",
    howItWorks: "How it works?",
    stepSelectDate: "Select date",
    stepChooseMachine: "Choose machine",
    stepPickTimeSlot: "Pick a time slot",
    stepConfirmBooking: "Confirm booking",
    machineBookingTitle: "Machine booking",
    backToMachines: "Back to machines",
    washerFallback: "SmartLaundry washer",
    selectedDate: "Selected date",
    availableNow: "Available now",
    canBookSlots: "You can book one of the available time slots below.",
    availableSlots: "Available slots",
    noFreeSlotsSelectedDay: "No free slots for the selected day.",
    selectedSlot: "Selected:",
    reservationConfirmationHint: "Reservation can be confirmed within the first 15 minutes after the slot starts.",
    bookingLimitReachedShort: "Booking limit reached",
    bookingLimitReachedLong: "Booking limit reached. You already have 3 active bookings in the next 3 days.",
    bookSelectedSlot: "Book selected slot",
    programNotSelected: "Not selected",
    slotPast: "Past",
    slotNow: "Now",
    slotBooked: "Booked",
    slotFree: "{duration} free",
    noBookingsForWasherDay: "No bookings for this washer on the selected day.",
    information: "Information",
    status: "Status",
    accessType: "Access type",
    reservationRequired: "Reservation required",
    bookingConfirmation: "Booking confirmation",
    onWebsite: "On website",
    confirmationWindow: "Confirmation window",
    first15Minutes: "First 15 minutes",
    recommendedSlot: "Recommended slot",
    rules: "Rules",
    ruleChooseProgram: "Choose the washing program you want to use. Based on it, the system will suggest suitable time slots.",
    ruleMultipleSlots: "If the program duration does not fit into one slot, the system will suggest several consecutive slots.",
    ruleConfirmArrival: "Start the reservation within the first 15 minutes after the slot begins. Otherwise, it may be cancelled as no-show.",
    ruleReportOccupied: "If the machine is occupied despite your reservation, report the problem. We will immediately suggest the nearest available time slot.",
    ruleNoShow: "If you do not confirm, the reservation may be cancelled as no-show.",
    ruleProgramAfterConfirmation: "Washing program can be selected after reservation confirmation at the machine.",
    confirmBookingTitle: "Confirm booking",
    confirmBookingSubtitle: "Please review your reservation details before continuing.",
    machineLabel: "Machine",
    locationLabel: "Location",
    dateLabel: "Date",
    timeLabel: "Time",
    confirmationWindowValue: "Within the first 15 minutes of your slot",
    important: "Important",
    confirmationImportantText: "Confirm your arrival within the first 15 minutes of the slot. Otherwise, the booking may be released for other users.",
    confirmationProgramText: "Washing program selection will be available after confirmation.",
    back: "Back",
    confirming: "Confirming...",
    confirmBooking: "Confirm booking",
    userTagFallback: "User",
    statusAvailable: "Available",
    statusBusy: "Busy",
    statusMaintenance: "Maintenance",
    machineStatusFreeWithSlots: "Free - slots available",
    machineStatusBusyWithSlots: "Busy - later slots available",
    machineStatusBusyNoSlots: "Busy - no free slots",
    machineInactive: "Inactive",
    actionBookNow: "Book now",
    actionBookFor: "Book for {time}",
    actionUnavailable: "Unavailable",
    nearestFreeSlotInfo: "Nearest free slot: Machine #{machine} at {time}.",
    bookingLimitUsed: "{used}/3",
    hoursUnit: "hours",
    bookingSelectedDayOnly: "Bookings are only available for the selected day.",
    closeConfirmation: "Close confirmation",
    availableBookingsLabel: "Available bookings:",
    noAvailableBookings: "No available bookings",
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
      "When creating a booking, choose a wash program; the system calculates finish time from the manual and builds non-overlapping slots automatically.",
    machineCardFreeNow: "Free now",
    machineCardOccupied: "Occupied",
    machineCardBroken: "Broken",
    machineCardInactive: "Inactive",
    machineCardUserBooking: "Your booking",
    machineNextFreeAt: "Free from: {time}",
    machineCurrentSlotEnd: "Free until: {time}",
    actionManageBooking: "Manage",
    navTerritories: "Territories",
    myTerritoriesTitle: "My territories",
    myTerritoriesSubtitle: "Manage your laundry room access",
    noTerritoriesTitle: "No territories yet",
    noTerritoriesHint: "Ask your building administrator for the access code and enter it below to unlock your laundry room.",
    joinTerritoryTitle: "Join a laundry room",
    joinTerritoryCodeLabel: "Access code",
    joinTerritoryCodePlaceholder: "e.g. ABC123",
    joinTerritoryButton: "Join",
    joinTerritorySuccess: "Territory added!",
    joinTerritorySuccessNamed: "Territory \"{name}\" was added successfully.",
    joinTerritoryErrorGeneric: "Invalid code or territory not found.",
    nearestFreeSlotZoneInfo: "Machine #{machine} in {zone} – free at {time}",
    howItWorksPageTitle: "How it works",
    howItWorks1Title: "Booking system",
    howItWorks1Text: "SmartLaundry is an online platform for managing washing machine reservations in dormitories and shared buildings. It eliminates queues through a transparent booking system.",
    howItWorks2Title: "Who can use it?",
    howItWorks2Text: "Access requires a territory code from your building administrator. Administrators configure machines and manage resident access.",
    howItWorks3Title: "How to join?",
    howItWorks3Text: "Go to the Territories tab in the left menu and enter the access code from your administrator. Once added, you will see available machines on the dashboard.",
    howItWorks4Title: "Machine statuses",
    howItWorks4Text: "Free now (green) – available to book. Occupied (orange) – in use, but later slots available. Your booking (blue) – you have an active reservation. Inactive (gray) – temporarily unavailable. Broken (red) – under maintenance.",
    howItWorks5Title: "Selecting a wash program",
    howItWorks5Text: "Before booking, select the wash program that matches your laundry. The system will automatically find a time slot long enough for the full wash cycle.",
    howItWorks6Title: "Time slots",
    howItWorks6Text: "Bookings are available in 60 or 120-minute blocks. The slot pattern depends on the machine number and repeats every 6 hours. Long programs may span consecutive slots.",
    howItWorks7Title: "How to book?",
    howItWorks7Text: "1. Select a day (today, tomorrow, or the day after). 2. Click on a machine. 3. Choose a wash program. 4. Select an available slot. 5. Confirm the booking.",
    howItWorks8Title: "Arrival confirmation",
    howItWorks8Text: "After your slot starts, you have 15 minutes to confirm your presence at the machine. Go to My Bookings and select a wash program to confirm.",
    howItWorks9Title: "No-show – missed confirmation",
    howItWorks9Text: "If you do not confirm within 15 minutes, the booking is automatically cancelled as a no-show. After 1 no-show the booking limit drops to 2; after 2 no-shows the limit becomes 1. The restriction lasts 3 days.",
    howItWorks10Title: "Booking limits",
    howItWorks10Text: "You can have up to 3 active bookings within the next 3 days. Cancelled and completed bookings do not count toward the limit.",
    howItWorks11Title: "My bookings",
    howItWorks11Text: "The My Bookings tab shows active and past reservations. Confirm arrival and select a program, or cancel bookings you no longer need.",
    howItWorks12Title: "Cancelling a booking",
    howItWorks12Text: "You can cancel a booking at any time before it ends. Cancelling frees the slot for other users. Frequent last-minute cancellations may affect your access.",
    howItWorks13Title: "Notifications",
    howItWorks13Text: "The system notifies you about automatic cancellations, machine status changes, and system updates. Find notifications in the Notifications tab or the bell icon in the header.",
    landingHeroSubtitle: "Book washing machines without queues or conflicts.",
    landingHeroDescription: "Add your territory, choose a machine, select a wash program and an available slot. SmartLaundry will remind you of your booking and start a wash timer when it begins.",
    landingHeroCtaHowItWorks: "How does it work?",
    landingAboutTitle: "What is SmartLaundry?",
    landingAboutText1: "SmartLaundry is a system for managing access to washing machines in shared spaces such as dormitories, residential buildings and shared laundry rooms.",
    landingAboutText2: "Instead of checking on-site whether a machine is free, users can view available slots online, choose a machine, book a slot and receive a notification before the booking starts.",
    landingAboutText3: "The system helps reduce conflicts, phantom bookings and situations where multiple people want to use the same machine at the same time.",
    landingStepsTitle: "How does it work?",
    landingStep1Title: "Create an account",
    landingStep1Text: "Register or sign in to the system. After registration, email confirmation may be required.",
    landingStep2Title: "Add a territory",
    landingStep2Text: "Enter the access code provided by your building, dormitory or laundry administrator.",
    landingStep3Title: "Choose a zone and machine",
    landingStep3Text: "Select the appropriate zone, e.g. Zone 1 (Room 205), then choose a machine. The machine number in the system should match the number on the physical machine.",
    landingStep4Title: "Select a wash program",
    landingStep4Text: "Choose the program you plan to use. Based on the program duration, the system will suggest suitable time slots.",
    landingStep5Title: "Book a slot",
    landingStep5Text: "For short programs the system may suggest a 1-hour slot. For longer programs it may suggest a 2-hour slot or several consecutive slots.",
    landingStep6Title: "Start your booking",
    landingStep6Text: "When your booking time approaches, you will receive a notification. After the slot starts, confirm your presence at the machine within the first 15 minutes.",
    landingStep7Title: "Start the timer",
    landingStep7Text: "After confirming the booking, confirm or change the wash program. SmartLaundry will start a timer and send a notification when the laundry should be ready.",
    landingBenefitsTitle: "What does SmartLaundry offer?",
    landingBenefit1: "Check machine availability online",
    landingBenefit2: "Book slots without queues",
    landingBenefit3: "Notifications before your booking starts",
    landingBenefit4: "Wash timer after the booking begins",
    landingBenefit5: "Help matching slots to wash programs",
    landingBenefit6: "Report machine issues",
    landingAdminSectionTitle: "For administrators",
    landingAdminSectionText: "Are you an administrator of a building, dormitory or laundry? SmartLaundry lets you create territories, add zones, manage machines, handle user reports and monitor bookings.",
    landingAdminRoleSubtitle: "How to get the administrator role?",
    landingAdminRoleText: "To obtain the administrator role, please contact the system administration.",
    landingAdminContactHint: "In your message please include the name of the building or laundry, the email address of your SmartLaundry account and a brief description of why you need administrator access.",
    inviteCodeLabel: "Invite code",
    inviteCodeExpires: "Expires: {time}",
    inviteCodeExpired: "Code expired",
    inviteCodeNoActive: "No active code",
    inviteCodeGenerate: "Generate new code",
    inviteCodeGenerating: "Generating…",
    inviteCodeCopied: "Copied!",
    inviteCodeCopy: "Copy",
    inviteCodeSectionTitle: "Invite code (12 h)",
    problemReportTitle: "Report a problem",
    problemReportType: "Problem type",
    problemReportDescription: "Description",
    problemReportSubmit: "Submit report",
    problemReportSuccess: "Report submitted successfully.",
    problemReportError: "Failed to submit report.",
    problemReportTypeMachineBroken: "Machine not working",
    problemReportTypeWaterLeak: "Water leak",
    problemReportTypeNoise: "Unusual noise",
    problemReportTypeOther: "Other issue",
    adminProblemReports: "Problem reports",
    adminProblemReportOpen: "Open",
    adminProblemReportInProgress: "In progress",
    adminProblemReportResolved: "Resolved",
    adminProblemReportMarkResolved: "Mark resolved",
    adminOpenReportsCount: "{count} open reports",
    adminProblemReportsNone: "No reports",
    adminDeleteTerritory: "Delete territory",
    adminDeleteTerritoryConfirm: "Are you sure you want to delete \"{name}\"? All users will be notified.",
    adminAddFirstTerritory: "Add first territory",
    adminEmptyDashboard: "You have no territories yet.",
    joinTerritoryCodeExpired: "This code has expired. Ask your administrator for a new one.",
    territoryRemove: "Leave",
    territoryRemoveConfirm: "Remove access to \"{name}\"? Your bookings will not be affected.",
    territoryRemoveTitle: "Remove territory access",
    territoryRemoveBody: "Remove access to \"{name}\"? Your existing bookings will stay in the system.",
    territoryRemoveCancel: "Cancel",
    territoryRemoveConfirmAction: "Remove access",
    territoriesAddAnother: "Add another laundry room",
    joinTerritoryInstruction: "Ask your building administrator for the access code and enter it below.",
    actionReserveAnother: "Reserve another",
    joinTerritoryOnlyOne: "You can only be in one laundry room at a time.",
    joinTerritoryLeaveFirst: "To join a new laundry room, leave the current one first.",
    joinTerritoryAdminHint: "You can get the access code from your laundry room administrator.",
    bookingFilterByTerritory: "Filter by territory",
    bookingFilterAllTerritories: "All territories",
    bookingFilterByUser: "Filter by user",
    bookingFilterUserPlaceholder: "User email…",
    bookingFilterReset: "Reset filter",
    loadingProgress: "Loading {progress}%",
    adminBasicInfo: "Basic information",
    adminAnalysingPdf: "Analysing PDF…",
    adminCheckingModel: "Checking…",
  },

  // Polski
  pl: {
    appTitle: "SmartLaundry",
    signIn: "Zaloguj się",
    signUp: "Utwórz konto",
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
    infoVerificationCodeSent: "Kod weryfikacyjny został wysłany na Twój adres e-mail.",
    infoVerificationCodeResent: "Nowy kod weryfikacyjny został wysłany na Twój adres e-mail.",
    infoResetCodeSent: "Kod do resetu hasła został wysłany na Twój adres e-mail.",
    infoResetCodeResent: "Nowy kod do resetu hasła został wysłany na Twój adres e-mail.",
    authChoiceTitle: "Witaj w SmartLaundry",
    authChoiceSubtitle: "Wybierz, co chcesz zrobić",
    authChoiceSignIn: "Mam już konto",
    authChoiceSignUp: "Chcę utworzyć nowe konto",
    authTitleSignIn: "Zaloguj się",
    authTitleSignUp: "Utwórz konto",
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
    authCodeSpamHint: "Jeśli nie widzisz kodu, sprawdź folder Spam.",
    authForgotPassword: "Nie pamiętasz hasła?",
    authNoAccountYet: "Nie masz konta? Utwórz konto",
    authAlreadyHaveAccount: "Masz już konto? Zaloguj się",
    authPasswordHint:
      "Co najmniej 8 znaków, w tym małe i wielkie litery, cyfra oraz znak specjalny.",
    authBack: "Wróć",
    authAccountCreatedText: "Twoje konto zostało pomyślnie utworzone.",
    heroTitle: "Inteligentna kolejka do współdzielonych pralek",
    heroText:
      "System rezerwacji online dla pralni w akademikach i budynkach współdzielonych. Przejrzysta kolejka, status pralek w czasie rzeczywistym, powiadomienia i ochrona przed spamującymi rezerwacjami.",
    heroPrimaryCta: "Utwórz konto",
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
    profileUsersSearch: "Szukaj po e-mailu lub ID…",
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
    adminTerritoriesMenu: "Lokalizacje",
    adminDashboardTerritoriesTab: "Panel (Lokalizacje)",
    adminTerritoryTab: "Terytorium",
    adminAllTerritories: "Wszystkie lokalizacje",
    adminAddTerritory: "Dodaj lokalizację",
    adminCreateTerritoryTitle: "Utwórz lokalizację",
    adminTerritorySetupSubtitle: "Skonfiguruj strefy pralni, pralki, zasady rezerwacji i instrukcje obsługi.",
    adminAllTerritoriesSubtitle: "Zarządzaj lokalizacjami, strefami, modelami pralek i kodami dostępu.",
    adminTerritoriesPanelTitle: "Lokalizacje",
    adminTerritoriesPanelSubtitle: "Kody, strefy, pralki i wykryte programy prania.",
    adminAllTerritoriesWashers: "Wszystkie lokalizacje i pralki",
    adminSystemOverviewSubtitle: "Pełny przegląd systemu z aktualną liczbą rezerwacji.",
    adminManageAllSubtitle: "Zarządzaj wszystkimi lokalizacjami, pralkami, użytkownikami i rezerwacjami.",
    adminTerritoriesLoading: "Wczytywanie lokalizacji...",
    adminTerritoriesEmpty: "Nie ma jeszcze lokalizacji.",
    adminReservationsSubtitle: "Przeglądaj i zarządzaj rezerwacjami wszystkich użytkowników i lokalizacji.",
    bookingConfirmWindowOpens: "Potwierdzenie będzie dostępne od {time} przez 15 minut.",
    bookingConfirmWindowExpired: "Czas na potwierdzenie minął.",
    adminBookingRulesTitle: "Zasady rezerwacji",
    adminSlotPatternTitle: "Układ slotów",
    adminSlotPatternText: "W ciągu dnia powtarza się układ: 1 godz., 1 godz., 2 godz., 2 godz. Długie programy zajmują kolejne sloty.",
    adminUserLimitTitle: "Limit użytkownika",
    adminUserLimitText: "Maksymalnie 3 aktywne rezerwacje w najbliższych 3 dniach.",
    adminConfirmationRuleTitle: "Potwierdzenie",
    adminConfirmationRuleText: "Użytkownik potwierdza przyjście w ciągu pierwszych 15 minut.",
    adminLegacySlotsTitle: "Użyj starszego trybu stałych slotów 2-godzinnych",
    adminLegacySlotsText: "Pozostaw wyłączone dla aktualnego trybu dynamicznych rekomendacji.",
    adminZonesStepTitle: "Strefy",
    adminZoneNamesMachineCounts: "Nazwy stref i liczba pralek",
    adminZonesCount: "{count} stref",
    adminMachinesCount: "{count} pralek",
    adminProgramsCount: "{count} programów",
    adminModelFound: "Model znaleziony",
    adminNoManual: "Brak instrukcji",
    adminReplacePdf: "Zamień PDF",
    adminUploadPdf: "Prześlij PDF",
    adminDetectedPrograms: "Wykryte programy",
    adminReviewTitle: "Podsumowanie",
    adminReviewTerritory: "Lokalizacja",
    adminReviewZones: "Strefy",
    adminReviewMachines: "Pralki",
    adminReviewPrograms: "Programy",
    adminNotNamed: "Bez nazwy",
    adminProgramsAcrossMachines: "{programs} na {machines} pralkach",
    adminEdit: "Edytuj",
    adminNoModel: "Brak modelu",
    adminSearch: "Szukaj",
    adminDashboardTitle: "Panel administratora",
    adminAllUsers: "Wszyscy użytkownicy",
    adminAllReservations: "Wszystkie rezerwacje",
    adminCode: "Kod",
    adminCodeSuperadmin: "Kod superadmina",
    adminCreatedBy: "Utworzone przez",
    adminActiveUsers: "Aktywni użytkownicy",
    adminActiveReservations: "Aktywne rezerwacje",
    adminTerritoryUsers: "Użytkownicy lokalizacji",
    adminNoUsers: "Brak użytkowników w tej lokalizacji.",
    adminUserBlocked: "Zablokowany",
    adminUserActive: "Aktywny",
    adminBlockUser: "Zablokuj użytkownika",
    adminUnblockUser: "Odblokuj użytkownika",
    adminLastActivity: "Ostatnia aktywność",
    adminMarkActive: "Oznacz jako aktywną",
    adminMarkInactive: "Oznacz jako nieaktywną",
    adminMarkBroken: "Oznacz jako uszkodzoną",
    adminActionFailed: "Nie udało się wykonać akcji.",
    machineStatusActive: "Aktywna",
    machineStatusBusy: "Zajęta",
    machineStatusInactive: "Nieaktywna",
    machineStatusBroken: "Uszkodzona",
    adminUsersTitle: "Wszyscy użytkownicy",
    adminUsersSubtitle: "Zarządzaj użytkownikami i administratorami.",
    adminSearchUserPlaceholder: "Szukaj użytkownika lub e-maila",
    adminTableUser: "Użytkownik",
    adminTableEmail: "E-mail",
    adminTableRole: "Rola",
    adminTableStatus: "Status",
    adminTableActions: "Akcje",
    adminActiveAccount: "Aktywne konto",
    adminBlockedAccount: "Zablokowane",
    adminMakeUser: "Zmień na użytkownika",
    adminMakeAdmin: "Zmień na administratora",
    adminUsersLoadError: "Nie udało się wczytać użytkowników.",
    adminUsersUpdateError: "Nie udało się zaktualizować użytkownika.",
    adminActiveReservationsSystem: "Aktywne rezerwacje w systemie",
    bookingConfirmedShort: "Rezerwacja potwierdzona.",
    bookingModeLabel: "Program",
    estimatedFinish: "Szacowany koniec",
    confirmWithin: "Potwierdź w ciągu",
    quickWash: "Szybkie pranie",
    normalWash: "Zwykłe pranie",
    confirmWithoutMode: "Potwierdź bez programu",
    couldNotConfirmBooking: "Nie udało się potwierdzić rezerwacji. Okno 15 minut mogło już minąć.",
    territoryJoinCodeTitle: "Wpisz kod lokalizacji",
    territoryJoinCodePlaceholder: "6-znakowy kod",
    territoryJoinCodeAdd: "Dodaj kod",
    bookingTitle: "Rezerwacja",
    bookingCTA: "Zarezerwuj",
    bookingBackToList: "Wróć do wszystkich pralek",
    bookingTodayOnly: "Rezerwacja dostępna tylko na dziś: {date}",
    bookingWarningNextDay: "Pranie przejdzie na jutro. Jutro rezerwacje od {time}.",
    bookingSelectProgram: "Wybierz program prania",
    bookingSelectProgramPlaceholder: "Wybierz program prania",
    bookingProgramFirst: "Wybierz program prania",
    bookingProgramHelper: "Najpierw wybierz program prania. Na jego podstawie system zaproponuje odpowiednie terminy.",
    bookingProgramRequiredForReservation: "Wybierz program prania, aby zarezerwować termin.",
    bookingRecommendationSingle: "Rekomendacja: program „{programName}” trwa {duration}. Podświetlony slot {hours}-godzinny wystarczy dla tego programu.",
    bookingRecommendationMultiple: "Rekomendacja: program „{programName}” trwa {duration}. Podświetlone sloty pokrywają wymagany czas prania.",
    bookingRecommendationNoSlots: "Brak dostępnej sekwencji slotów, która pokrywa {duration}.",
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
    bookingUnknownUser: "Nieznany użytkownik",
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
    navDashboard: "Panel",
    navMyBookings: "Moje rezerwacje",
    navNotifications: "Powiadomienia",
    navSupport: "Pomoc",
    navHowItWorks: "Jak to działa",
    sidebarPromo: "Czyste ubrania,\ndobry dzień.",
    notificationsAria: "Powiadomienia",
    closeNotifications: "Zamknij powiadomienia",
    expandSidebar: "Rozwiń menu boczne",
    collapseSidebar: "Zwiń menu boczne",
    notificationsTitle: "Powiadomienia",
    latestNotifications: "Ostatnie powiadomienia",
    notificationsSubtitle: "Wszystkie aktualizacje dotyczące rezerwacji i prania.",
    markAllRead: "Oznacz wszystkie jako przeczytane",
    showAll: "Pokaż wszystkie",
    noNotifications: "Nie masz jeszcze powiadomień.",
    bookingsPageTitle: "Moje rezerwacje",
    bookingsPageSubtitle: "Zarządzaj aktywnymi rezerwacjami i sprawdzaj historię.",
    refresh: "Odśwież",
    couldNotLoadBookings: "Nie udało się wczytać rezerwacji.",
    couldNotCancelBooking: "Nie udało się anulować rezerwacji.",
    activeReservations: "Aktywne rezerwacje",
    activeCount: "aktywne",
    loadingBookings: "Ładowanie rezerwacji...",
    noActiveReservations: "Brak aktywnych rezerwacji.",
    reservationRules: "Zasady rezerwacji",
    reservationRule1: "Możesz mieć maksymalnie 3 aktywne rezerwacje w ciągu najbliższych 3 dni.",
    reservationRule2: "Anulowane i zakończone rezerwacje nie wliczają się do limitu.",
    reservationRule3: "Anuluj rezerwację, jeśli nie planujesz z niej skorzystać.",
    bookingHistory: "Historia rezerwacji",
    bookingHistorySubtitle: "Zakończone, anulowane i wygasłe rezerwacje.",
    loadingHistory: "Ładowanie historii...",
    noBookingHistory: "Brak historii rezerwacji.",
    cancel: "Anuluj",
    cancelling: "Anulowanie...",
    activeStatus: "Aktywna",
    expiredStatus: "Wygasła",
    territoryFallback: "Lokalizacja",
    dayToday: "Dzisiaj",
    dayTomorrow: "Jutro",
    dayInTwoDays: "Pojutrze",
    laundryBookingTitle: "Rezerwacja prania",
    territoryLabel: "Lokalizacja:",
    yourTerritories: "Twoje lokalizacje",
    dashboardSubtitle: "Znajdź i zarezerwuj dostępną pralkę w kilku krokach.",
    selectDay: "Wybierz dzień",
    bookingLimitInfo: "Możesz mieć maksymalnie 3 aktywne rezerwacje w ciągu najbliższych 3 dni.",
    findNearestFreeSlot: "Znajdź najbliższy wolny termin",
    findNearestFreeSlotDescription: "Znajdź najwcześniejszy dostępny termin we wszystkich pralkach.",
    machineSingular: "Pralka",
    machinePlural: "Pralki",
    activeBookings: "Aktywne rezerwacje",
    howItWorks: "Jak to działa?",
    stepSelectDate: "Wybierz dzień",
    stepChooseMachine: "Wybierz pralkę",
    stepPickTimeSlot: "Wybierz godzinę",
    stepConfirmBooking: "Potwierdź rezerwację",
    machineBookingTitle: "Rezerwacja pralki",
    backToMachines: "Wróć do pralek",
    washerFallback: "Pralka SmartLaundry",
    selectedDate: "Wybrany dzień",
    availableNow: "Dostępna teraz",
    canBookSlots: "Wybierz jeden z dostępnych terminów poniżej.",
    availableSlots: "Dostępne terminy",
    noFreeSlotsSelectedDay: "Brak wolnych terminów w wybranym dniu.",
    selectedSlot: "Wybrano:",
    reservationConfirmationHint: "Rezerwację można potwierdzić w ciągu pierwszych 15 minut od rozpoczęcia terminu.",
    bookingLimitReachedShort: "Osiągnięto limit rezerwacji",
    bookingLimitReachedLong: "Osiągnięto limit rezerwacji. Masz już 3 aktywne rezerwacje w najbliższych 3 dniach.",
    bookSelectedSlot: "Zarezerwuj wybrany termin",
    programNotSelected: "Nie wybrano",
    slotPast: "Minął",
    slotNow: "Teraz",
    slotBooked: "Zajęty",
    slotFree: "Wolne {duration}",
    noBookingsForWasherDay: "Brak rezerwacji tej pralki w wybranym dniu.",
    information: "Informacje",
    status: "Status",
    accessType: "Typ dostępu",
    reservationRequired: "Wymagana rezerwacja",
    bookingConfirmation: "Potwierdzenie rezerwacji",
    onWebsite: "Na stronie",
    confirmationWindow: "Czas na potwierdzenie",
    first15Minutes: "Pierwsze 15 minut",
    recommendedSlot: "Zalecany termin",
    rules: "Zasady",
    ruleChooseProgram: "Wybierz program prania, którego chcesz użyć. Na jego podstawie system zaproponuje odpowiednie terminy.",
    ruleMultipleSlots: "Jeśli czas programu nie mieści się w jednym slocie, system zaproponuje kilka kolejnych slotów.",
    ruleConfirmArrival: "Rezerwację trzeba rozpocząć w ciągu pierwszych 15 minut od startu terminu. W przeciwnym razie może zostać anulowana jako no-show.",
    ruleReportOccupied: "Jeśli pralka jest zajęta mimo rezerwacji, zgłoś problem. Od razu zaproponujemy najbliższy dostępny termin.",
    ruleNoShow: "Jeśli nie potwierdzisz rezerwacji, może zostać anulowana jako no-show.",
    ruleProgramAfterConfirmation: "Program prania można wybrać po potwierdzeniu rezerwacji przy pralce.",
    confirmBookingTitle: "Potwierdź rezerwację",
    confirmBookingSubtitle: "Sprawdź szczegóły rezerwacji przed kontynuacją.",
    machineLabel: "Pralka",
    locationLabel: "Lokalizacja",
    dateLabel: "Data",
    timeLabel: "Godzina",
    confirmationWindowValue: "W ciągu pierwszych 15 minut terminu",
    important: "Ważne",
    confirmationImportantText: "Potwierdź przyjście w ciągu pierwszych 15 minut terminu. W przeciwnym razie rezerwacja może zostać zwolniona dla innych użytkowników.",
    confirmationProgramText: "Wybór programu prania będzie dostępny po potwierdzeniu.",
    back: "Wróć",
    confirming: "Potwierdzanie...",
    confirmBooking: "Potwierdź rezerwację",
    userTagFallback: "Użytkownik",
    statusAvailable: "Dostępna",
    statusBusy: "Zajęta",
    statusMaintenance: "Serwis",
    machineStatusFreeWithSlots: "Wolna - są dostępne terminy",
    machineStatusBusyWithSlots: "Zajęta - są późniejsze terminy",
    machineStatusBusyNoSlots: "Zajęta - brak wolnych terminów",
    machineInactive: "Nieaktywna",
    actionBookNow: "Zarezerwuj",
    actionBookFor: "Zarezerwuj na {time}",
    actionUnavailable: "Niedostępna",
    nearestFreeSlotInfo: "Najbliższy wolny termin: pralka #{machine} o {time}.",
    bookingLimitUsed: "{used}/3",
    hoursUnit: "godz.",
    bookingSelectedDayOnly: "Rezerwacje są dostępne tylko na wybrany dzień.",
    closeConfirmation: "Zamknij potwierdzenie",
    availableBookingsLabel: "Dostępne rezerwacje:",
    noAvailableBookings: "Brak dostępnych rezerwacji",
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
      "Przy tworzeniu rezerwacji wybierz program; system na podstawie instrukcji obliczy czas zakończenia i ułoży niepokrywające się okna automatycznie.",
    machineCardFreeNow: "Wolna teraz",
    machineCardOccupied: "Zajęta teraz",
    machineCardBroken: "Awaria",
    machineCardInactive: "Nieaktywna",
    machineCardUserBooking: "Twoja rezerwacja",
    machineNextFreeAt: "Wolna od: {time}",
    machineCurrentSlotEnd: "Wolna do: {time}",
    actionManageBooking: "Zarządzaj",
    navTerritories: "Terytoria",
    myTerritoriesTitle: "Moje terytoria",
    myTerritoriesSubtitle: "Zarządzaj dostępem do pralni",
    noTerritoriesTitle: "Nie masz jeszcze terytoriów",
    noTerritoriesHint: "Poproś administratora budynku o kod dostępu i wpisz go poniżej, aby odblokować dostęp do pralni.",
    joinTerritoryTitle: "Dołącz do pralni",
    joinTerritoryCodeLabel: "Kod dostępu",
    joinTerritoryCodePlaceholder: "np. ABC123",
    joinTerritoryButton: "Dołącz",
    joinTerritorySuccess: "Terytorium dodane!",
    joinTerritorySuccessNamed: "Terytorium \"{name}\" zostało pomyślnie dodane.",
    joinTerritoryErrorGeneric: "Nieprawidłowy kod lub nie znaleziono terytorium.",
    nearestFreeSlotZoneInfo: "Pralka #{machine} w {zone} – wolna od {time}",
    howItWorksPageTitle: "Jak to działa?",
    howItWorks1Title: "System rezerwacji",
    howItWorks1Text: "SmartLaundry to platforma online do zarządzania rezerwacjami pralek w akademikach i budynkach wielorodzinnych. Eliminuje kolejki i konflikty dzięki przejrzystemu systemowi rezerwacji.",
    howItWorks2Title: "Kto może korzystać?",
    howItWorks2Text: "Dostęp do systemu wymaga kodu terytorium od administratora budynku. Administratorzy konfigurują pralki i zarządzają dostępem mieszkańców.",
    howItWorks3Title: "Jak dołączyć?",
    howItWorks3Text: "Przejdź do zakładki Terytoria w lewym menu i wpisz kod dostępu od administratora. Po dodaniu kodu zobaczysz dostępne pralki na panelu głównym.",
    howItWorks4Title: "Statusy pralek",
    howItWorks4Text: "Wolna teraz (zielony) – dostępna do zarezerwowania. Zajęta teraz (pomarańczowy) – trwa pranie, ale dostępne są późniejsze terminy. Twoja rezerwacja (niebieski) – masz aktywną rezerwację. Nieaktywna (szary) – tymczasowo niedostępna. Awaria (czerwony) – pralka w serwisie.",
    howItWorks5Title: "Wybór programu prania",
    howItWorks5Text: "Przed rezerwacją wybierz program prania odpowiadający twoim ubraniom. System automatycznie znajdzie slot czasowy wystarczający na pełny cykl prania.",
    howItWorks6Title: "Sloty czasowe",
    howItWorks6Text: "Rezerwacje są dostępne w blokach 60 lub 120 minut. Rozkład slotów zależy od numeru pralki i powtarza się co 6 godzin. Długie programy mogą zajmować kilka kolejnych slotów.",
    howItWorks7Title: "Jak zarezerwować?",
    howItWorks7Text: "1. Wybierz dzień (dziś, jutro lub pojutrze). 2. Kliknij na pralkę. 3. Wybierz program prania. 4. Wybierz dostępny slot. 5. Potwierdź rezerwację.",
    howItWorks8Title: "Potwierdzenie przybycia",
    howItWorks8Text: "Po rozpoczęciu twojego slotu masz 15 minut na potwierdzenie obecności przy pralce. Przejdź do zakładki Moje rezerwacje i wybierz program prania, aby potwierdzić.",
    howItWorks9Title: "Brak potwierdzenia – no-show",
    howItWorks9Text: "Jeśli nie potwierdzisz w ciągu 15 minut, rezerwacja zostanie automatycznie anulowana. Po 1 no-show limit rezerwacji spada do 2; po 2 no-show do 1. Ograniczenie obowiązuje przez 3 dni.",
    howItWorks10Title: "Limity rezerwacji",
    howItWorks10Text: "Możesz mieć maksymalnie 3 aktywne rezerwacje w ciągu najbliższych 3 dni. Anulowane i zakończone rezerwacje nie wliczają się do limitu.",
    howItWorks11Title: "Moje rezerwacje",
    howItWorks11Text: "Zakładka Moje rezerwacje zawiera aktywne i historyczne rezerwacje. Możesz tam potwierdzić przybycie (w ciągu 15 min od startu slotu) oraz anulować rezerwacje, z których nie planujesz korzystać.",
    howItWorks12Title: "Anulowanie rezerwacji",
    howItWorks12Text: "Możesz anulować rezerwację w dowolnym momencie przed jej zakończeniem. Anulowanie zwalnia slot dla innych użytkowników. Częste anulacje w ostatniej chwili mogą wpłynąć na twój dostęp do systemu.",
    howItWorks13Title: "Powiadomienia",
    howItWorks13Text: "System informuje cię o automatycznym anulowaniu rezerwacji, zmianach statusu pralki i ważnych aktualizacjach. Powiadomienia znajdziesz w zakładce Powiadomienia lub w ikonie dzwonka w nagłówku.",
    landingHeroSubtitle: "Rezerwuj pralki bez kolejek i nieporozumień.",
    landingHeroDescription: "Dodaj swoje terytorium, wybierz pralkę, program prania i dostępny termin. SmartLaundry przypomni Ci o rezerwacji i uruchomi timer prania po jej rozpoczęciu.",
    landingHeroCtaHowItWorks: "Jak to działa?",
    landingAboutTitle: "Czym jest SmartLaundry?",
    landingAboutText1: "SmartLaundry to system do zarządzania dostępem do pralek w przestrzeniach wspólnych, takich jak akademiki, budynki mieszkalne i wspólne pralnie.",
    landingAboutText2: "Zamiast sprawdzać na miejscu, czy pralka jest wolna, użytkownik może zobaczyć dostępne terminy online, wybrać pralkę, zarezerwować slot i otrzymać powiadomienie przed rozpoczęciem rezerwacji.",
    landingAboutText3: "System pomaga ograniczyć konflikty, puste rezerwacje i sytuacje, w których kilka osób chce użyć tej samej pralki w tym samym czasie.",
    landingStepsTitle: "Jak to działa?",
    landingStep1Title: "Utwórz konto",
    landingStep1Text: "Zarejestruj się lub zaloguj do systemu. Po rejestracji może być wymagane potwierdzenie adresu e-mail.",
    landingStep2Title: "Dodaj terytorium",
    landingStep2Text: "Wprowadź kod dostępu otrzymany od administratora budynku, akademika lub pralni.",
    landingStep3Title: "Wybierz strefę i pralkę",
    landingStep3Text: "Wybierz odpowiednią strefę, np. Strefa 1 (Pokój 205), a następnie pralkę. Numer pralki w systemie powinien odpowiadać numerowi umieszczonemu fizycznie na pralce.",
    landingStep4Title: "Wybierz program prania",
    landingStep4Text: "Wybierz program, na którym planujesz prać. Na podstawie czasu trwania programu system zaproponuje odpowiednie terminy.",
    landingStep5Title: "Zarezerwuj termin",
    landingStep5Text: "Dla krótkich programów system może zaproponować slot 1-godzinny. Dla dłuższych programów może zaproponować slot 2-godzinny lub kilka kolejnych slotów.",
    landingStep6Title: "Rozpocznij rezerwację",
    landingStep6Text: "Gdy zbliża się czas rezerwacji, otrzymasz powiadomienie. Po rozpoczęciu terminu rozpocznij rezerwację w systemie w ciągu pierwszych 15 minut.",
    landingStep7Title: "Uruchom timer",
    landingStep7Text: "Po rozpoczęciu rezerwacji potwierdź lub zmień program prania. SmartLaundry uruchomi timer i wyśle powiadomienie, gdy pranie powinno być gotowe.",
    landingBenefitsTitle: "Co daje SmartLaundry?",
    landingBenefit1: "Sprawdzanie dostępności pralek online",
    landingBenefit2: "Rezerwacja terminów bez kolejek",
    landingBenefit3: "Powiadomienia przed rozpoczęciem rezerwacji",
    landingBenefit4: "Timer prania po rozpoczęciu rezerwacji",
    landingBenefit5: "Pomoc w doborze slotu do programu prania",
    landingBenefit6: "Zgłaszanie problemów z pralką",
    landingAdminSectionTitle: "Dla administratorów",
    landingAdminSectionText: "Jesteś administratorem budynku, akademika lub pralni? SmartLaundry pozwala tworzyć terytoria, dodawać strefy, zarządzać pralkami, obsługiwać zgłoszenia użytkowników i kontrolować rezerwacje.",
    landingAdminRoleSubtitle: "Jak uzyskać rolę administratora?",
    landingAdminRoleText: "Aby uzyskać rolę administratora, skontaktuj się z administracją systemu.",
    landingAdminContactHint: "W wiadomości podaj nazwę budynku lub pralni, adres e-mail konta w SmartLaundry oraz krótki opis, dlaczego potrzebujesz dostępu administratora.",
    inviteCodeLabel: "Kod zaproszenia",
    inviteCodeExpires: "Wygasa: {time}",
    inviteCodeExpired: "Kod wygasł",
    inviteCodeNoActive: "Brak aktywnego kodu",
    inviteCodeGenerate: "Generuj nowy kod",
    inviteCodeGenerating: "Generowanie…",
    inviteCodeCopied: "Skopiowano!",
    inviteCodeCopy: "Kopiuj",
    inviteCodeSectionTitle: "Kod zaproszenia (12 godz.)",
    problemReportTitle: "Zgłoś problem",
    problemReportType: "Typ problemu",
    problemReportDescription: "Opis",
    problemReportSubmit: "Wyślij zgłoszenie",
    problemReportSuccess: "Zgłoszenie zostało wysłane.",
    problemReportError: "Nie udało się wysłać zgłoszenia.",
    problemReportTypeMachineBroken: "Pralka nie działa",
    problemReportTypeWaterLeak: "Wyciek wody",
    problemReportTypeNoise: "Nietypowy hałas",
    problemReportTypeOther: "Inny problem",
    adminProblemReports: "Zgłoszenia problemów",
    adminProblemReportOpen: "Otwarte",
    adminProblemReportInProgress: "W toku",
    adminProblemReportResolved: "Rozwiązane",
    adminProblemReportMarkResolved: "Oznacz jako rozwiązane",
    adminOpenReportsCount: "{count} otwartych zgłoszeń",
    adminProblemReportsNone: "Brak zgłoszeń",
    adminDeleteTerritory: "Usuń terytorium",
    adminDeleteTerritoryConfirm: "Czy na pewno chcesz usunąć \"{name}\"? Wszyscy użytkownicy zostaną powiadomieni.",
    adminAddFirstTerritory: "Dodaj pierwsze terytorium",
    adminEmptyDashboard: "Nie masz jeszcze żadnych terytoriów.",
    joinTerritoryCodeExpired: "Ten kod wygasł. Poproś administratora o nowy.",
    territoryRemove: "Opuść",
    territoryRemoveConfirm: "Usunąć dostęp do \"{name}\"? Twoje rezerwacje nie zostaną anulowane.",
    territoryRemoveTitle: "Usuń dostęp do terytorium",
    territoryRemoveBody: "Usunąć dostęp do \"{name}\"? Twoje istniejące rezerwacje pozostaną w systemie.",
    territoryRemoveCancel: "Anuluj",
    territoryRemoveConfirmAction: "Usuń dostęp",
    territoriesAddAnother: "Dodaj kolejną pralnię",
    joinTerritoryInstruction: "Poproś administratora budynku o kod dostępu i wpisz go poniżej.",
    actionReserveAnother: "Zarezerwuj kolejną",
    joinTerritoryOnlyOne: "Możesz być tylko w jednej pralni jednocześnie.",
    joinTerritoryLeaveFirst: "Aby dołączyć do nowej pralni, najpierw opuść obecną.",
    joinTerritoryAdminHint: "Kod dostępu możesz otrzymać od administratora pralni.",
    bookingFilterByTerritory: "Filtruj po lokalizacji",
    bookingFilterAllTerritories: "Wszystkie lokalizacje",
    bookingFilterByUser: "Filtruj po użytkowniku",
    bookingFilterUserPlaceholder: "E-mail użytkownika…",
    bookingFilterReset: "Wyczyść filtr",
    loadingProgress: "Ładowanie {progress}%",
    adminBasicInfo: "Podstawowe informacje",
    adminAnalysingPdf: "Analizowanie PDF…",
    adminCheckingModel: "Sprawdzanie…",
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
