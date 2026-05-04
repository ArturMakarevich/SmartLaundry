import { useEffect, useState } from "react";
import { X, CheckCircle2, AlertCircle, Upload, ExternalLink } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { apiClient } from "../../shared/apiClient";

export type MachineInfo = {
  id: string;
  zoneIndex: number;
  number: number;
  model: string;
  found: boolean;
  programs: WashProgramInfo[];
};

export type WashProgramInfo = {
  name: string;
  duration_minutes: number;
};

export type Territory = {
  id: string;
  name: string;
  code: string;
  zones: number;
  machinesPerZone: number[];
  zoneDescriptions?: string[];
  machines: MachineInfo[];
};

type TerritoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Territory | null;
  onSave: (territory: Territory) => Promise<string | null>;
};

export function TerritoryFormModal({ open, onClose, initial, onSave }: TerritoryFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [zonesCount, setZonesCount] = useState(1);
  const [machinesPerZone, setMachinesPerZone] = useState<number[]>([1]);
  const [zoneDescriptions, setZoneDescriptions] = useState<string[]>([""]);
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) {
      setName("");
      setZonesCount(1);
      setMachinesPerZone([1]);
      setMachines([
        {
          id: "m-0-1",
          zoneIndex: 0,
          number: 1,
          model: "",
          found: false,
          programs: []
        }
      ]);
      setZoneDescriptions([""]);
      setErrors(null);
      setSaving(false);
      return;
    }
    setName(initial.name);
    setZonesCount(initial.zones);
    setMachinesPerZone(initial.machinesPerZone);
    setMachines(initial.machines);
    setZoneDescriptions(
      initial.zoneDescriptions && initial.zoneDescriptions.length
        ? initial.zoneDescriptions
        : Array.from({ length: initial.zones }).map(() => "")
    );
    setErrors(null);
    setSaving(false);
  }, [initial, open]);

  const ensureMachinesShape = (zones: number, perZone: number[]) => {
    const nextMachines: MachineInfo[] = [];
    for (let z = 0; z < zones; z += 1) {
      const count = perZone[z] ?? 1;
      for (let i = 0; i < count; i += 1) {
        const existing = machines.find(m => m.zoneIndex === z && m.number === i + 1);
        nextMachines.push(
          existing || {
            id: `m-${z}-${i + 1}-${Math.random().toString(16).slice(2, 8)}`,
            zoneIndex: z,
            number: i + 1,
            model: "",
            found: false,
            programs: []
          }
        );
      }
    }
    setMachines(nextMachines);
    setZoneDescriptions(prev => {
      const copy = [...prev];
      while (copy.length < zones) copy.push("");
      copy.length = zones;
      return copy;
    });
  };

  const updateMachinesPerZone = (index: number, value: number) => {
    const next = [...machinesPerZone];
    next[index] = value;
    setMachinesPerZone(next);
    ensureMachinesShape(zonesCount, next);
  };

  const generateCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i += 1) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
  };

  const handleModelChange = (machineId: string, value: string) => {
    setMachines(prev =>
      prev.map(m =>
        m.id === machineId
          ? {
              ...m,
              model: value,
              found: value.trim().length > 3,
              programs: []
            }
          : m
      )
    );
  };

  const handleUploadInstruction = async (machine: MachineInfo, file: File) => {
    const formData = new FormData();
    formData.append("model_name", machine.model);
    formData.append("file", file);
    try {
      const response = await apiClient.post("territories/instructions/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const programs = (response.data?.programs || []).map((p: any) => ({
        name: p.name,
        duration_minutes: p.duration_minutes
      }));
      setMachines(prev =>
        prev.map(m =>
          m.id === machine.id
            ? {
                ...m,
                found: true,
                programs
              }
            : m
        )
      );
    } catch (err: any) {
      setMachines(prev =>
        prev.map(m =>
          m.id === machine.id
            ? { ...m, found: false, programs: [] }
            : m
        )
      );
      setErrors(err?.message || t("territoryErrorSaveFailed"));
    }
  };

  const handleCheckExistingInstruction = async (machine: MachineInfo) => {
    if (!machine.model.trim()) return;
    try {
      const response = await apiClient.get("territories/instructions/", {
        params: { model_name: machine.model }
      });
      const programs = (response.data?.programs || []).map((p: any) => ({
        name: p.name,
        duration_minutes: p.duration_minutes
      }));
      setMachines(prev =>
        prev.map(m =>
          m.id === machine.id
            ? {
                ...m,
                found: true,
                programs
              }
            : m
        )
      );
    } catch (err: any) {
      setMachines(prev =>
        prev.map(m =>
          m.id === machine.id
            ? { ...m, found: false, programs: [] }
            : m
        )
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors(t("territoryErrorNameRequired"));
      return;
    }
    if (zonesCount < 1) {
      setErrors(t("territoryErrorZoneCount"));
      return;
    }
    if (machinesPerZone.some(v => v < 1)) {
      setErrors(t("territoryErrorMachinesCount"));
      return;
    }
    const code = initial?.code || generateCode();
    const payload: Territory = {
      id: initial?.id || `terr-${Date.now()}`,
      name: name.trim(),
      code,
      zones: zonesCount,
      machinesPerZone,
      zoneDescriptions,
      machines
    };
    setErrors(null);
    setSaving(true);
    try {
      const maybeError = await onSave(payload);
      if (maybeError) {
        setErrors(maybeError);
        return;
      }
      onClose();
    } catch (err: any) {
      setErrors(err?.message || t("territoryErrorSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {initial ? t("territoryEdit") : t("territoryFormTitle")}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
            {t("territoryNameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            placeholder={t("territoryNamePlaceholder")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
              {t("territoryZonesLabel")}
            </label>
            <input
              type="number"
              min={1}
              value={zonesCount}
              onChange={e => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setZonesCount(val);
                const nextPerZone = [...machinesPerZone];
                if (val > machinesPerZone.length) {
                  while (nextPerZone.length < val) nextPerZone.push(1);
                } else {
                  nextPerZone.length = val;
                }
                setMachinesPerZone(nextPerZone);
                ensureMachinesShape(val, nextPerZone);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
              {t("territoryMachinesPerZoneLabel")}
            </label>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {Array.from({ length: zonesCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-gray-500 dark:text-gray-400">
                    {t("territoryZoneLabel")} {idx + 1}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={machinesPerZone[idx] ?? 1}
                    onChange={e => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      updateMachinesPerZone(idx, val);
                    }}
                    className="flex-1 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">
            {t("territoryMachinesTitle")}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {Array.from({ length: zonesCount }).map((_, zoneIdx) => {
              const zoneMachines = machines.filter(m => m.zoneIndex === zoneIdx);
              return (
                <div key={zoneIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  <div className="text-xs font-medium mb-2">
                    {t("territoryZoneLabel")} {zoneIdx + 1}
                  </div>
                  <div className="mb-2">
                    <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                      {t("territoryZoneLabel")} {zoneIdx + 1} description
                    </label>
                    <textarea
                      value={zoneDescriptions[zoneIdx] || ""}
                      onChange={e => {
                        const next = [...zoneDescriptions];
                        next[zoneIdx] = e.target.value;
                        setZoneDescriptions(next);
                      }}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[11px]"
                      placeholder="Optional note"
                    />
                  </div>
                  <div className="space-y-2">
                    {zoneMachines.map(machine => (
                      <div
                        key={machine.id}
                        className="flex flex-col gap-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-gray-600 dark:text-gray-400">
                            {t("territoryMachineLabel")} {machine.number}
                          </span>
                          <input
                            type="text"
                            value={machine.model}
                            onChange={e => handleModelChange(machine.id, e.target.value)}
                            onBlur={() => handleCheckExistingInstruction(machine)}
                            className="flex-1 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                            placeholder={t("territoryMachinePlaceholder")}
                          />
                          <a
                            className="text-blue-600 dark:text-blue-300 flex items-center gap-1"
                            href={`https://www.google.com/search?q=${encodeURIComponent(`${machine.model || ""} manual wash programs`)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={14} /> {t("territorySearchInstruction")}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 cursor-pointer">
                            <Upload size={14} />
                            <span>{t("territoryUploadInstruction")}</span>
                            <input
                              type="file"
                              accept=".pdf,.txt"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadInstruction(machine, file);
                                }
                              }}
                            />
                          </label>
                          {machine.found ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 size={14} /> {t("territoryMachineFound")}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertCircle size={14} /> {t("territoryMachineNotFound")}
                            </span>
                          )}
                        </div>
                        {machine.found && machine.programs.length === 0 && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t("territoryUploadHint")}
                          </div>
                        )}
                        {machine.programs.length > 0 && (
                          <div className="space-y-1">
                            {machine.programs.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span>{p.name}</span>
                                <span className="font-mono">{p.duration_minutes} min</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {errors && (
          <div className="text-xs text-red-600 dark:text-red-400">
            {errors}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm"
          >
            {t("authBack")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold ${
              saving ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {initial ? t("territorySave") : t("territorySaveGenerate")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
