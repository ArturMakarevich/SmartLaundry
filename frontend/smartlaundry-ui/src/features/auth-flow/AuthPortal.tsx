import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { SignInView } from "./SignInView";
import { SignUpView } from "./SignUpView";
import { ResetPasswordView } from "./ResetPasswordView";
import { useI18n } from "../../app-shell/i18n-context";
import { UserInfo } from "../../shared/auth-types";

type Mode = "signin" | "signup" | "reset";

type AuthPortalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  initialEmail?: string;
  onAuthSuccess?: (user: UserInfo) => void;
  onResetReturn?: () => void;
  resetReturnLabel?: string;
};

export function AuthPortal({ open, onClose, initialMode = "signin", initialEmail, onAuthSuccess, onResetReturn, resetReturnLabel }: AuthPortalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const handleSuccess = () => {
    onClose();
  };

  const handleResetReturn = () => {
    if (onResetReturn) {
      onResetReturn();
      return;
    }
    setMode("signin");
  };

  const getTitle = () => {
    if (mode === "signin") return t("authTitleSignIn");
    if (mode === "signup") return t("authTitleSignUp");
    if (mode === "reset") return t("authTitleReset");
    return "";
  };

  if (!open) {
    return null;
  }

  return (
    <ModalShell open={open} onClose={onClose} size="xl" verticalAlign="center">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-start justify-between mb-6 pb-2 -mx-8 px-8 -mt-8 pt-8">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
          {getTitle()}
        </h2>
        <button
          onClick={onClose}
          aria-label="Zamknij"
          className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {mode === "signin" && (
        <SignInView
          onSwitchToSignUp={() => setMode("signup")}
          onSwitchToReset={() => setMode("reset")}
          onSuccess={handleSuccess}
          onAuthSuccess={onAuthSuccess}
        />
      )}

      {mode === "signup" && (
        <SignUpView
          onSwitchToSignIn={() => setMode("signin")}
          onSuccess={handleSuccess}
          onAuthSuccess={onAuthSuccess}
        />
      )}

      {mode === "reset" && (
        <ResetPasswordView
          initialEmail={initialEmail}
          onSwitchToSignIn={handleResetReturn}
          onSuccess={handleSuccess}
          returnLabel={resetReturnLabel}
        />
      )}
    </ModalShell>
  );
}
