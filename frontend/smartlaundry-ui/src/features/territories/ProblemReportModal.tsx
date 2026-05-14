import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { apiClient } from "../../shared/apiClient";

type Props = {
  open: boolean;
  onClose: () => void;
  territoryId: number;
  zoneId?: number;
  machineId?: number;
  machineLabel?: string;
};

export function ProblemReportModal({ open, onClose, territoryId, zoneId, machineId, machineLabel }: Props) {
  const { t } = useI18n();
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDescription("");
    setSubmitting(false);
    setSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("territories/problem-reports/", {
        territory_id: territoryId,
        zone_id: zoneId || null,
        machine_id: machineId || null,
        type: "other",
        description: description.trim(),
      });
      setSuccess(true);
    } catch {
      setError(t("problemReportError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell open={open} onClose={handleClose}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("problemReportTitle")}</h2>
          {machineLabel && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{machineLabel}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      {success ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {t("problemReportSuccess")}
          </p>
          <button
            onClick={handleClose}
            className="h-10 w-full rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
          >
            {t("authBack")}
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200">
              {t("problemReportDescription")}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="…"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "…" : t("problemReportSubmit")}
          </button>
        </form>
      )}
    </ModalShell>
  );
}
