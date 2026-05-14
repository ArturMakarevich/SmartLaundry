import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "../../shared/apiClient";
import { useI18n } from "../../app-shell/i18n-context";
import { UserInfo } from "../../shared/auth-types";

type Props = {
  onSwitchToSignIn: () => void;
  onSuccess: () => void;
  onAuthSuccess?: (user: UserInfo) => void;
};

type Step = "form" | "code" | "success";

export function SignUpView({ onSwitchToSignIn, onSuccess, onAuthSuccess }: Props) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const togglePasswordVisibility = () => {
    if (!showPassword) {
      setShowPassword(true);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setShowPassword(false);
        hideTimerRef.current = null;
      }, 5000);
    } else {
      setShowPassword(false);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }
  };

  const validateEmail = (value: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value);
  };

  const validatePasswordDetailed = (value: string): string | null => {
    if (value.length < 8) {
      return t("errorPasswordMinLength");
    }
    if (!/[A-Z]/.test(value)) {
      return t("errorPasswordMissingUpper");
    }
    if (!/[a-z]/.test(value)) {
      return t("errorPasswordMissingLower");
    }
    if (!/[0-9]/.test(value)) {
      return t("errorPasswordMissingDigit");
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return t("errorPasswordMissingSpecial");
    }
    return null;
  };

  const handleRegister = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError(t("errorInvalidEmail"));
      return;
    }

    const passwordError = validatePasswordDetailed(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== repeatPassword) {
      setError(t("errorPasswordsNotMatch"));
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("accounts/register/", {
        email,
        password,
        ui_language: lang
      });
      setStep("code");
      setResendCooldown(15);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.suggest_login) {
        setError(t("errorEmailAlreadyRegistered"));
      } else if (data?.email) {
        const msg = Array.isArray(data.email) ? data.email[0] : data.email;
        setError(String(msg));
      } else if (data?.password) {
        const msg = Array.isArray(data.password) ? data.password[0] : data.password;
        setError(String(msg));
      } else {
        setError(t("errorRegistrationGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);

    if (!code || code.length !== 6) {
      setError(t("errorCodeRequired"));
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("accounts/verify-email/", {
        email,
        code
      });

      const access = response.data?.access;
      const refresh = response.data?.refresh;
      if (access && refresh) {
        window.localStorage.setItem("sl_access", access);
        window.localStorage.setItem("sl_refresh", refresh);
      }

      const responseUser = response.data?.user;
      const rawId = responseUser?.id ?? response.data?.user_id ?? 0;
      const rawRole = responseUser?.role ?? response.data?.role ?? "user";
      const resolvedEmail = responseUser?.email ?? email;
      const user: UserInfo = {
        id: Number(rawId) || 0,
        email: resolvedEmail,
        role: rawRole === "admin" || rawRole === "superadmin" ? rawRole : "user"
      };

      window.localStorage.setItem("sl_user_id", String(user.id));
      window.localStorage.setItem("sl_user_email", user.email);
      window.localStorage.setItem("sl_user_role", user.role);

      if (onAuthSuccess) {
        onAuthSuccess(user);
      }

      setStep("success");
    } catch {
      setError(t("errorCodeInvalidOrExpired"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      return;
    }
    setError(null);
    try {
      setLoading(true);
      await apiClient.post("accounts/register/resend-code/", {
        email,
        ui_language: lang
      });
      setResendCooldown(15);
    } catch {
      setError(t("errorRegistrationGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-5 text-center">
        <p className="text-base font-semibold text-slate-700 dark:text-gray-200">
          {t("authAccountCreatedText")}
        </p>
        <p className="text-sm text-slate-500 dark:text-gray-400">{email}</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSuccess}
            className="h-12 flex-1 rounded-lg border border-slate-300 text-sm font-semibold transition hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {t("authBack")}
          </button>
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="h-12 flex-1 rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form className="space-y-5" onSubmit={handleVerify}>
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{email}</p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
            {t("authCodeLabel")}
          </label>
          <input
            type="text"
            name="one-time-code"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="000000"
          />
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
            {t("authCodeSpamHint")}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="h-12 flex-1 rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "…" : t("authContinue")}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="h-12 rounded-lg border border-slate-300 px-4 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {resendCooldown > 0 ? `${t("authSendCode")} (${resendCooldown})` : t("authSendCode")}
          </button>
        </div>

        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {t("authAlreadyHaveAccount")}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleRegister}>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
          {t("authEmailLabel")}
        </label>
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
          {t("authPasswordLabel")}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700 dark:hover:text-gray-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-400">{t("authPasswordHint")}</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
          {t("authRepeatPasswordLabel")}
        </label>
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={e => setRepeatPassword(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "…" : t("signUp")}
      </button>

      <button
        type="button"
        onClick={onSwitchToSignIn}
        className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        {t("authAlreadyHaveAccount")}
      </button>
    </form>
  );
}
