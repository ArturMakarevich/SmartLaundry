import { useEffect, useRef, useState } from "react";
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
  const [info, setInfo] = useState<string | null>(null);

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

  const handleRegister = async () => {
    setError(null);
    setInfo(null);

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
      setInfo(t("infoVerificationCodeSent"));
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

  const handleVerify = async () => {
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

      const rawId = response.data?.user?.id ?? response.data?.user_id ?? 0;
      const rawRole = response.data?.user?.role ?? response.data?.role ?? "user";
      const user: UserInfo = {
        id: Number(rawId) || 0,
        email,
        role: rawRole === "admin" || rawRole === "superadmin" ? rawRole : "user"
      };

      window.localStorage.setItem("sl_user_id", String(user.id));
      window.localStorage.setItem("sl_user_email", user.email);
      window.localStorage.setItem("sl_user_role", user.role);

      if (onAuthSuccess) {
        onAuthSuccess(user);
      }

      setInfo(null);
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
      setInfo(t("infoVerificationCodeResent"));
    } catch {
      setError(t("errorRegistrationGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {t("authAccountCreatedText")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {email}
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSuccess}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
          >
            {t("authBack")}
          </button>
          <button
            onClick={onSwitchToSignIn}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {email}
        </p>

        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {info && !error && (
          <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
            {info}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
            {t("authCodeLabel")}
          </label>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-center tracking-[0.3em] text-lg"
            placeholder="000000"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t("authContinue")}
          </button>
          <button
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `${t("authSendCode")} (${resendCooldown})` : t("authSendCode")}
          </button>
        </div>

        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
          {t("authAlreadyHaveAccount")}?{" "}
          <button
            onClick={onSwitchToSignIn}
            className="ml-1 text-blue-600 dark:text-blue-300 hover:underline"
          >
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
          {info}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("authEmailLabel")}
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("authPasswordLabel")}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm pr-12"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-transform hover:scale-110"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {t("authPasswordHint")}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("authRepeatPasswordLabel")}
        </label>
        <input
          type="password"
          value={repeatPassword}
          onChange={e => setRepeatPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {t("authContinue")}
      </button>

      <div className="text-xs text-left text-gray-500 dark:text-gray-400">
        {t("authAlreadyHaveAccount")}?{" "}
        <button
          onClick={onSwitchToSignIn}
          className="ml-1 text-blue-600 dark:text-blue-300 hover:underline"
        >
          {t("signIn")}
        </button>
      </div>
    </div>
  );
}
