import { useEffect, useState } from "react";
import { InlineMachine, FullscreenLoader } from "../ui-kit/WashingMachineLoader";
import { ThemeToggle } from "../ui-kit/ThemeToggle";
import { LanguageSelector } from "../ui-kit/LanguageSelector";
import { AuthPortal } from "../features/auth-flow/AuthPortal";
import { useI18n } from "./i18n-context";
import { useTheme } from "./theme-context";
import { AccountMenu } from "../features/account/AccountMenu";
import { UserInfo, UserRole } from "../shared/auth-types";

type AuthMode = "signin" | "signup" | "reset";

export function AppRoot() {
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [resetEmail, setResetEmail] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const { t } = useI18n();
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedEmail = window.localStorage.getItem("sl_user_email");
    const storedId = window.localStorage.getItem("sl_user_id");
    const storedRole = window.localStorage.getItem("sl_user_role") as UserRole | null;
    if (storedEmail && storedId) {
      const user: UserInfo = {
        id: Number(storedId) || 0,
        email: storedEmail,
        role: storedRole === "admin" || storedRole === "superadmin" ? storedRole : "user"
      };
      setCurrentUser(user);
    }
  }, []);

  if (!ready) {
    return <FullscreenLoader />;
  }

  const isDark = theme === "dark";
  const isAuthenticated = currentUser !== null;

  const openSignIn = () => {
    setAuthMode("signin");
    setResetEmail(undefined);
    setAuthOpen(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setResetEmail(undefined);
    setAuthOpen(true);
  };

  const openResetFromProfile = () => {
    if (currentUser) {
      setResetEmail(currentUser.email);
    } else {
      setResetEmail(undefined);
    }
    setAuthMode("reset");
    setAuthOpen(true);
  };

  const handleAuthSuccess = (user: UserInfo) => {
    setCurrentUser(user);
    window.localStorage.setItem("sl_user_id", String(user.id));
    window.localStorage.setItem("sl_user_email", user.email);
    window.localStorage.setItem("sl_user_role", user.role);
    setAuthOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.localStorage.removeItem("sl_access");
    window.localStorage.removeItem("sl_refresh");
    window.localStorage.removeItem("sl_user_id");
    window.localStorage.removeItem("sl_user_email");
    window.localStorage.removeItem("sl_user_role");
  };

  return (
    <div className={isDark ? "min-h-screen bg-gray-900 text-white" : "min-h-screen bg-gray-50 text-gray-900"}>
      <header className={isDark ? "border-b border-gray-800 bg-gray-900/90 backdrop-blur" : "border-b border-gray-200 bg-white/90 backdrop-blur"}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <InlineMachine />
            <div className="text-base md:text-lg font-bold truncate">
              {t("appTitle")}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <AccountMenu
                  user={currentUser as UserInfo}
                  onLogout={handleLogout}
                  onChangePassword={openResetFromProfile}
                />
                <ThemeToggle />
              </>
            ) : (
              <>
                <button
                  onClick={openSignIn}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  {t("signIn")}
                </button>
                <button
                  onClick={openSignUp}
                  className={isDark ? "px-3 py-2 rounded-lg border border-gray-600 text-sm font-semibold" : "px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold"}
                >
                  {t("signUp")}
                </button>
                <LanguageSelector />
                <ThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <section className="flex flex-col items-center text-center gap-6">
          <h1 className="text-3xl md:text-4xl font-bold">
            {t("heroTitle")}
          </h1>
          <p className={isDark ? "text-gray-300 text-sm md:text-base max-w-2xl" : "text-gray-700 text-sm md:text-base max-w-2xl"}>
            {t("heroText")}
          </p>
          {!isAuthenticated && (
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={openSignUp}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                {t("heroPrimaryCta")}
              </button>
              <button
                onClick={openSignIn}
                className={isDark ? "px-4 py-2 rounded-lg border border-gray-600 text-sm font-semibold" : "px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold"}
              >
                {t("heroSecondaryCta")}
              </button>
            </div>
          )}
        </section>
      </main>
      <AuthPortal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        initialEmail={resetEmail}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
