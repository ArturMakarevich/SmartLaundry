import { useState } from "react";
import { X } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { UserRole } from "../../shared/auth-types";

type CodesModalProps = {
  open: boolean;
  onClose: () => void;
  role: UserRole;
};

type CodeItem = {
  code: string;
  name: string;
};

export function CodesModal({ open, onClose, role }: CodesModalProps) {
  const { t } = useI18n();
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleAdd = () => {
    const value = newCode.trim();
    if (value.length < 4) {
      setError(t("profileCodesErrorInvalid"));
      return;
    }
    if (codes.some(c => c.code.toLowerCase() === value.toLowerCase())) {
      setError(t("profileCodesErrorDuplicate"));
      return;
    }
    const item: CodeItem = {
      code: value,
      name: value
    };
    setCodes(prev => [...prev, item]);
    setNewCode("");
    setError(null);
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {t("profileCodesTitle")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("profileCodesDescription")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-1">
            {t("profileCodesCurrent")}
          </div>
          {codes.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("profileCodesEmpty")}
            </div>
          ) : (
            <ul className="space-y-2">
              {codes.map(item => (
                <li
                  key={item.code}
                  className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                >
                  <div>
                    <div className="font-mono text-sm">{item.code}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {item.name}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
            {t("profileCodesNewCodeLabel")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              placeholder={t("profileCodesNewCodePlaceholder")}
            />
            <button
              onClick={handleAdd}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              {t("profileCodesAdd")}
            </button>
          </div>
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {role !== "user" && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="font-semibold text-sm">
              {t("profileAdminTerritories")}
            </div>
            <div>{t("profileAdminUsers")}</div>
          </div>
        )}

        {role === "superadmin" && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div>{t("profileSuperAdminAllUsers")}</div>
            <div>{t("profileSuperAdminAllTerritories")}</div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
