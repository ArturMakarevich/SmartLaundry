import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "../../shared/apiClient";
import { useI18n } from "../../app-shell/i18n-context";

type Props = {
  onSwitchToSignIn: () => void;
  onSuccess: () => void;
  initialEmail?: string;
  returnLabel?: string;
};

type Step = "request" | "confirm" | "done";

export function ResetPasswordView({ onSwitchToSignIn, onSuccess, initialEmail, returnLabel }: Props) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("request");

  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailReadonly = Boolean(initialEmail);

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

  const handleSendCode = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);
    setInfo(null);

    if (!validateEmail(email)) {
      setError(t("errorInvalidEmail"));
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("accounts/password-reset/request/", {
        email,
        ui_language: lang
      });
      setStep("confirm");
      setInfo(t("infoResetCodeSent"));
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = data?.detail || data;
      if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(t("errorResetRequestFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);
    setInfo(null);

    if (!code || code.length !== 6) {
      setError(t("errorCodeRequired"));
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
      await apiClient.post("accounts/password-reset/confirm/", {
        email,
        code,
        new_password: password
      });
      setStep("done");
      setPassword("");
      setRepeatPassword("");
      setCode("");
      setInfo(null);
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = data?.detail || data;
      if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(t("errorResetFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {t("authPasswordChangedText")}
        </p>
        <button
          onClick={() => {
            onSwitchToSignIn();
            onSuccess();
          }}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {returnLabel ?? t("authGoToSignIn")}
        </button>
      </div>
    );
  }

  if (step === "request") {
    return (
      <form className="space-y-4" onSubmit={handleSendCode}>
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
            name="username"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base"
            placeholder="you@example.com"
            readOnly={emailReadonly}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t("authBack")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t("authSendCode")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleChangePassword}>
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
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-base cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("authCodeLabel")}
        </label>
        <input
          type="text"
          name="one-time-code"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-center tracking-[0.3em] text-lg"
          placeholder="000000"
        />
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {t("authCodeSpamHint")}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("authPasswordLabel")}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base pr-12"
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
          name="confirm-password"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={e => setRepeatPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base"
        />
      </div>

      <div className="flex justify-between items-center text-xs">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t("authBack")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {t("authSave")}
        </button>
      </div>
    </form>
  );
}
