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
};

export function AuthPortal({ open, onClose, initialMode = "signin", initialEmail, onAuthSuccess }: AuthPortalProps) {
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
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-center flex-1">
          {getTitle()}
        </h2>
        <button
          onClick={onClose}
          className="ml-4 p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
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
          onSwitchToSignIn={() => setMode("signin")}
          onSuccess={handleSuccess}
        />
      )}
    </ModalShell>
  );
}
