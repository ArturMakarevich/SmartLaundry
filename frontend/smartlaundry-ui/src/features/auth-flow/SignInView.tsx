import { FormEvent, useEffect, useRef, useState } from "react";
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

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
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
    <form className="space-y-5" onSubmit={handleLogin}>
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
            name="password"
            autoComplete="current-password"
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "…" : t("signIn")}
      </button>

      <div className="flex flex-col gap-2 pt-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onSwitchToReset}
          className="text-left text-slate-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
        >
          {t("authForgotPassword")}
        </button>
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-left font-semibold text-blue-600 hover:underline dark:text-blue-400 sm:text-right"
        >
          {t("authNoAccountYet")}
        </button>
      </div>
    </form>
  );
}
