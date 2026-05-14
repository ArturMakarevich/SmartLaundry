import { Copy, Check, RefreshCw, X } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { UserRole } from "../../shared/auth-types";
import { Territory } from "./TerritoryFormModal";
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "../../shared/apiClient";

type InviteCodeState = {
  code: string | null;
  expires_at: string | null;
  is_active: boolean;
  loading: boolean;
  copied: boolean;
};

type CodesModalProps = {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  territories: Territory[];
  onEditTerritory: (territory: Territory) => void;
  onCreateTerritory: () => void;
  onDeleteTerritory?: (territory: Territory) => void;
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
  onDeleteTerritory,
  userCodes = [],
  onAddUserCode
}: CodesModalProps) {
  const { t } = useI18n();
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteCodes, setInviteCodes] = useState<Record<string, InviteCodeState>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  const getOrLoadInviteCode = useCallback(async (territoryId: string) => {
    if (inviteCodes[territoryId]) return;
    setInviteCodes(prev => ({ ...prev, [territoryId]: { code: null, expires_at: null, is_active: false, loading: true, copied: false } }));
    try {
      const res = await apiClient.get(`territories/admin/${territoryId}/invite-code/`);
      setInviteCodes(prev => ({ ...prev, [territoryId]: { ...res.data, loading: false, copied: false } }));
    } catch {
      setInviteCodes(prev => ({ ...prev, [territoryId]: { code: null, expires_at: null, is_active: false, loading: false, copied: false } }));
    }
  }, [inviteCodes]);

  const generateInviteCode = async (territoryId: string) => {
    setInviteCodes(prev => ({ ...prev, [territoryId]: { ...prev[territoryId], loading: true } }));
    try {
      const res = await apiClient.post(`territories/admin/${territoryId}/invite-code/`);
      setInviteCodes(prev => ({ ...prev, [territoryId]: { ...res.data, loading: false, copied: false } }));
    } catch {
      setInviteCodes(prev => ({ ...prev, [territoryId]: { ...prev[territoryId], loading: false } }));
    }
  };

  const copyCode = async (territoryId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setInviteCodes(prev => ({ ...prev, [territoryId]: { ...prev[territoryId], copied: true } }));
      setTimeout(() => setInviteCodes(prev => ({ ...prev, [territoryId]: { ...prev[territoryId], copied: false } })), 2000);
    } catch {}
  };

  const getCountdown = (expiresAt: string | null): { expired: boolean; label: string } => {
    if (!expiresAt) return { expired: true, label: "" };
    const diffMs = new Date(expiresAt).getTime() - now.getTime();
    if (diffMs <= 0) return { expired: true, label: t("inviteCodeExpired") };
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return { expired: false, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
  };

  if (!open) return null;

  const handleAddCode = async () => {
    const value = newCode.trim();
    if (value.length < 4) {
      setError(t("profileCodesErrorInvalid"));
      return;
    }
    if (onAddUserCode) {
      const maybeError = await onAddUserCode(value);
      if (maybeError) {
        if (maybeError.toLowerCase().includes("expired") || maybeError.toLowerCase().includes("wygasł")) {
          setError(t("joinTerritoryCodeExpired"));
        } else {
          setError(maybeError);
        }
        return;
      }
    }
    setNewCode("");
    setError(null);
  };

  const handleDeleteTerritory = (territory: Territory) => {
    const confirmed = window.confirm(
      t("adminDeleteTerritoryConfirm").replace("{name}", territory.name)
    );
    if (confirmed && onDeleteTerritory) {
      setDeletingId(territory.id);
      onDeleteTerritory(territory);
    }
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
              {t("adminAddTerritory")}
            </button>
          </div>
        )}

        {role !== "user" && territories.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
              {t("adminEmptyDashboard")}
            </p>
            <button
              onClick={onCreateTerritory}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {t("adminAddFirstTerritory")}
            </button>
          </div>
        )}

        {role !== "user" && territories.length > 0 && (
          <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {territories.map(item => {
              const ic = inviteCodes[item.id];
              if (!ic) {
                getOrLoadInviteCode(item.id);
              }
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onEditTerritory(item)}
                        className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {t("territoryEdit")}
                      </button>
                      {onDeleteTerritory && (
                        <button
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteTerritory(item)}
                          className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                        >
                          {t("adminDeleteTerritory")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                      {t("inviteCodeSectionTitle")}
                    </div>
                    {ic?.loading ? (
                      <div className="text-xs text-gray-400 animate-pulse">{t("inviteCodeGenerating")}</div>
                    ) : ic?.code && !getCountdown(ic.expires_at).expired ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm tracking-widest text-slate-900 dark:text-white">
                          {ic.code}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-300">
                          {getCountdown(ic.expires_at).label}
                        </span>
                        <button
                          onClick={() => copyCode(item.id, ic.code!)}
                          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-50"
                        >
                          {ic.copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          {ic.copied ? t("inviteCodeCopied") : t("inviteCodeCopy")}
                        </button>
                        <button
                          onClick={() => generateInviteCode(item.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-50"
                          title={t("inviteCodeGenerate")}
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {ic?.code ? t("inviteCodeExpired") : t("inviteCodeNoActive")}
                        </span>
                        <button
                          onClick={() => generateInviteCode(item.id)}
                          className="ml-auto px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        >
                          {t("inviteCodeGenerate")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {role === "user" && userCodes.length === 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("profileCodesDescription")}
          </div>
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

        {role === "user" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
              {t("profileCodesNewCodeLabel")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono"
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
