import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "../../shared/apiClient";
import { useI18n } from "../../app-shell/i18n-context";
import { UserInfo } from "../../shared/auth-types";

type Props = {
  onSwitchToSignUp: () => void;
  onSwitchToReset: () => void;
  onSuccess: () => void;
  onAuthSuccess?: (user: UserInfo) => void;
};

export function SignInView({ onSwitchToSignUp, onSwitchToReset, onSuccess, onAuthSuccess }: Props) {
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError(t("errorEmailPasswordRequired"));
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("accounts/login/", { email, password });

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

      onSuccess();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data;
      if (typeof detail === "string") {
        if (detail.toLowerCase().includes("not verified")) {
          setError(t("errorLoginNotVerified"));
        } else {
          setError(t("errorLoginInvalid"));
        }
      } else {
        setError(t("errorLoginInvalid"));
      }
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
          {error}
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
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {t("authContinue")}
      </button>

      <div className="flex justify-between items-center text-xs mt-1">
        <button
          onClick={onSwitchToReset}
          className="text-blue-600 dark:text-blue-300 hover:underline"
        >
          {t("authForgotPassword")}
        </button>
        <div className="text-gray-500 dark:text-gray-400">
          {t("authNoAccountYet")}?{" "}
          <button
            onClick={onSwitchToSignUp}
            className="ml-1 text-blue-600 dark:text-blue-300 hover:underline"
          >
            {t("signUp")}
          </button>
        </div>
      </div>
    </div>
  );
}
