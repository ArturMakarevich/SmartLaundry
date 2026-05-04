import { X } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { UserRole } from "../../shared/auth-types";
import { Territory } from "./TerritoryFormModal";
import { useState } from "react";

type CodesModalProps = {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  territories: Territory[];
  onEditTerritory: (territory: Territory) => void;
  onCreateTerritory: () => void;
  userCodes?: string[];
  onAddUserCode?: (code: string) => Promise<string | null>;
};

export function CodesModal({
  open,
  onClose,
  role,
  territories,
  onEditTerritory,
  onCreateTerritory,
  userCodes = [],
  onAddUserCode
}: CodesModalProps) {
  const { t } = useI18n();
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleAddCode = async () => {
    const value = newCode.trim();
    if (value.length < 4) {
      setError(t("profileCodesErrorInvalid"));
      return;
    }
    if (onAddUserCode) {
      const maybeError = await onAddUserCode(value);
      if (maybeError) {
        setError(maybeError);
        return;
      }
    }
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
          className="p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {role !== "user" && (
          <div className="flex justify-end">
            <button
              onClick={onCreateTerritory}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {t("territoryFormTitle")}
            </button>
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-1">
            {t("profileCodesCurrent")}
          </div>
          {role === "user" && userCodes.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("profileCodesDescription")}
            </div>
          )}
          {role !== "user" && territories.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("profileCodesEmpty")}
            </div>
          )}
          {role !== "user" && territories.length > 0 && (
            <ul className="space-y-2 max-h-52 overflow-y-auto">
              {territories.map(item => (
                <li
                  key={item.id}
                  className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-400">{item.code}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditTerritory(item)}
                      className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-xs"
                    >
                      {t("territoryEdit")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {role === "user" && userCodes.length > 0 && (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {userCodes.map(item => (
                <li
                  key={item}
                  className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                >
                  <div className="font-mono text-sm">{item}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {role === "user" && (
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
                onClick={handleAddCode}
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
        )}
      </div>
    </ModalShell>
  );
}
