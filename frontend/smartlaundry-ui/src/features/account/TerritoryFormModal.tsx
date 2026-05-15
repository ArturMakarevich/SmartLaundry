import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertCircle, Upload, ExternalLink, ChevronDown, ListChecks, Lock, BookOpen } from "lucide-react";
import { ModalShell } from "../../ui-kit/ModalShell";
import { useI18n } from "../../app-shell/i18n-context";
import { apiClient } from "../../shared/apiClient";

type ModelSuggestion = { model_name: string; has_instructions: boolean };

function ModelAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (suggestion: ModelSuggestion) => void;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<ModelSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get("territories/instructions/", { params: { search: q } });
        const list: ModelSuggestion[] = res.data?.results ?? [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]); setOpen(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (s: ModelSuggestion) => {
    onChange(s.model_name);
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {suggestions.map((s, idx) => (
            <li
              key={s.model_name}
              onMouseDown={() => pick(s)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition ${
                idx === activeIdx
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="truncate font-medium text-gray-900 dark:text-white">{s.model_name}</span>
              {s.has_instructions && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
                  <BookOpen size={10} /> manual
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  slot_strategy?: "auto" | "fixed_120";
  booking_slot_minutes?: number;
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
  onDelete?: (territory: Territory) => Promise<string | null>;
  renderMode?: "modal" | "page";
};

const StepTitle = ({
  number,
  title,
  done,
  locked,
}: {
  number: number;
  title: string;
  done?: boolean;
  locked?: boolean;
}) => (
  <div className="mb-4 flex items-center gap-3">
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
        done ? "bg-emerald-500" : "bg-blue-600"
      }`}
    >
      {done ? <CheckCircle2 size={16} /> : number}
    </span>
    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">{title}</h3>
    {locked && <Lock size={14} className="ml-auto text-gray-400" />}
  </div>
);

const StepSection = ({
  step,
  highestStep,
  children,
  className = "",
}: {
  step: number;
  highestStep: number;
  children: React.ReactNode;
  className?: string;
}) => {
  const locked = step > highestStep;
  return (
    <section
      className={`relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-opacity duration-300 dark:border-gray-700 dark:bg-gray-900 ${
        locked ? "pointer-events-none select-none opacity-40" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
};

const ContinueButton = ({
  step,
  highestStep,
  advanceTo,
  disabled = false,
  label,
}: {
  step: number;
  highestStep: number;
  advanceTo: (next: number) => void;
  disabled?: boolean;
  label: string;
}) => {
  if (highestStep !== step) return null;
  return (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={() => advanceTo(step + 1)}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
          disabled ? "cursor-not-allowed bg-gray-300 dark:bg-gray-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {label} →
      </button>
    </div>
  );
};

function NumericInput({
  value,
  min = 1,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      className={className}
      onChange={e => {
        const filtered = e.target.value.replace(/[^0-9]/g, "");
        setRaw(filtered);
        if (filtered !== "") onChange(Math.max(min, Number(filtered)));
      }}
      onBlur={() => {
        const clamped = Math.max(min, Number(raw) || min);
        setRaw(String(clamped));
        onChange(clamped);
      }}
    />
  );
}

export function TerritoryFormModal({ open, onClose, initial, onSave, onDelete, renderMode = "modal" }: TerritoryFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [zonesCount, setZonesCount] = useState(1);
  const [machinesPerZone, setMachinesPerZone] = useState<number[]>([1]);
  const [zoneDescriptions, setZoneDescriptions] = useState<string[]>([""]);
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
  const [highestStep, setHighestStep] = useState(initial ? 5 : 1);
  const [machineLoading, setMachineLoading] = useState<Record<string, "checking" | "uploading" | null>>({});

  useEffect(() => {
    if (!initial) {
      setName("");
      setZonesCount(1);
      setMachinesPerZone([1]);
      setMachines([
        { id: "m-0-1", zoneIndex: 0, number: 1, model: "", found: false, programs: [] },
      ]);
      setZoneDescriptions([""]);
      setExpandedPrograms({});
      setErrors(null);
      setSaving(false);
      setHighestStep(1);
      setMachineLoading({});
      setDeleteConfirmOpen(false);
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
    setExpandedPrograms({});
    setErrors(null);
    setSaving(false);
    setHighestStep(5);
    setMachineLoading({});
    setDeleteConfirmOpen(false);
  }, [initial, open]);

  const advanceTo = (next: number) => setHighestStep(prev => Math.max(prev, next));
  const isLocked = (step: number) => step > highestStep;

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
            programs: [],
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
    for (let i = 0; i < 6; i += 1) result += alphabet[Math.floor(Math.random() * alphabet.length)];
    return result;
  };

  const handleModelChange = (machineId: string, value: string) => {
    setMachines(prev =>
      prev.map(m => (m.id === machineId ? { ...m, model: value, found: false, programs: [] } : m))
    );
    setMachineLoading(prev => ({ ...prev, [machineId]: null }));
  };

  const handleUploadInstruction = async (machine: MachineInfo, file: File) => {
    setMachineLoading(prev => ({ ...prev, [machine.id]: "uploading" }));
    const formData = new FormData();
    formData.append("model_name", machine.model);
    formData.append("file", file);
    try {
      const response = await apiClient.post("territories/instructions/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const programs = (response.data?.programs || []).map((p: { name: string; duration_minutes: number }) => ({
        name: p.name,
        duration_minutes: p.duration_minutes,
      }));
      setMachines(prev => prev.map(m => (m.id === machine.id ? { ...m, found: true, programs } : m)));
    } catch (err: unknown) {
      setMachines(prev => prev.map(m => (m.id === machine.id ? { ...m, found: false, programs: [] } : m)));
      setErrors((err as { message?: string })?.message || t("territoryErrorSaveFailed"));
    } finally {
      setMachineLoading(prev => ({ ...prev, [machine.id]: null }));
    }
  };

  const handleCheckExistingInstruction = async (machine: MachineInfo) => {
    if (!machine.model.trim()) return;
    setMachineLoading(prev => ({ ...prev, [machine.id]: "checking" }));
    try {
      const response = await apiClient.get("territories/instructions/", {
        params: { model_name: machine.model },
      });
      const programs = (response.data?.programs || []).map((p: { name: string; duration_minutes: number }) => ({
        name: p.name,
        duration_minutes: p.duration_minutes,
      }));
      setMachines(prev => prev.map(m => (m.id === machine.id ? { ...m, found: true, programs } : m)));
    } catch {
      setMachines(prev => prev.map(m => (m.id === machine.id ? { ...m, found: false, programs: [] } : m)));
    } finally {
      setMachineLoading(prev => ({ ...prev, [machine.id]: null }));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setErrors(t("territoryErrorNameRequired")); return; }
    if (zonesCount < 1) { setErrors(t("territoryErrorZoneCount")); return; }
    if (machinesPerZone.some(v => v < 1)) { setErrors(t("territoryErrorMachinesCount")); return; }
    const code = initial?.code || generateCode();
    const payload: Territory = {
      id: initial?.id || `terr-${Date.now()}`,
      name: name.trim(),
      code,
      slot_strategy: "auto",
      zones: zonesCount,
      machinesPerZone,
      zoneDescriptions,
      machines,
    };
    setErrors(null);
    setSaving(true);
    try {
      const maybeError = await onSave(payload);
      if (maybeError) { setErrors(maybeError); return; }
      onClose();
    } catch (err: unknown) {
      setErrors((err as { message?: string })?.message || t("territoryErrorSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial || !onDelete) return;
    setErrors(null);
    setDeleting(true);
    try {
      const maybeError = await onDelete(initial);
      if (maybeError) {
        setErrors(maybeError);
        return;
      }
      onClose();
    } catch (err: unknown) {
      setErrors((err as { message?: string })?.message || t("territoryErrorSaveFailed"));
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const totalMachines = machines.length;
  const totalDetectedPrograms = machines.reduce((sum, m) => sum + m.programs.length, 0);
  const machinesWithPrograms = machines.filter(m => m.programs.length > 0).length;
  const formatCount = (key: string, count: number) => t(key).replace("{count}", String(count));
  const continueLabel = t("authContinue");

  const content = (
    <>
      {renderMode === "modal" && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {initial ? t("territoryEdit") : t("adminCreateTerritoryTitle")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
              {t("adminTerritorySetupSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="space-y-4">

        <StepSection step={1} highestStep={highestStep}>
          <StepTitle number={1} title={t("adminBasicInfo")} done={highestStep > 1} locked={isLocked(1)} />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
              {t("territoryNameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900"
              placeholder={t("territoryNamePlaceholder")}
            />
          </div>
          <ContinueButton step={1} highestStep={highestStep} advanceTo={advanceTo} disabled={!name.trim()} label={continueLabel} />
        </StepSection>

        <StepSection step={2} highestStep={highestStep}>
          <StepTitle number={2} title={t("adminZonesStepTitle")} done={highestStep > 2} locked={isLocked(2)} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                {t("territoryZonesLabel")}
              </label>
              <NumericInput
                value={zonesCount}
                min={1}
                onChange={val => {
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2 px-0.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{t("territoryZoneLabel")}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center">{t("territoryMachinesPerZoneLabel")}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Array.from({ length: zonesCount }).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2">
                    <input
                      value={zoneDescriptions[idx] || ""}
                      onChange={e => {
                        const next = [...zoneDescriptions];
                        next[idx] = e.target.value;
                        setZoneDescriptions(next);
                      }}
                      className="min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-base dark:border-gray-600 dark:bg-gray-900"
                      placeholder={`${t("territoryZoneLabel")} ${idx + 1}`}
                    />
                    <NumericInput
                      value={machinesPerZone[idx] ?? 1}
                      min={1}
                      onChange={val => updateMachinesPerZone(idx, val)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-base text-center dark:border-gray-600 dark:bg-gray-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ContinueButton step={2} highestStep={highestStep} advanceTo={advanceTo} label={continueLabel} />
        </StepSection>

        <StepSection step={3} highestStep={highestStep}>
          <StepTitle number={3} title={t("territoryMachinesTitle")} done={highestStep > 3} locked={isLocked(3)} />
          <div className="space-y-3">
            {Array.from({ length: zonesCount }).map((_, zoneIdx) => {
              const zoneMachines = machines.filter(m => m.zoneIndex === zoneIdx);
              return (
                <div key={zoneIdx} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold">
                      {zoneDescriptions[zoneIdx] || `${t("territoryZoneLabel")} ${zoneIdx + 1}`}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {formatCount("adminMachinesCount", zoneMachines.length)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {zoneMachines.map(machine => (
                      <div key={machine.id} className="rounded-lg border border-gray-200 p-3 text-xs dark:border-gray-700">
                        <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:items-center">
                          <div className="font-bold text-gray-700 dark:text-gray-200">
                            {t("territoryMachineLabel")} {machine.number}
                          </div>
                          <ModelAutocomplete
                            value={machine.model}
                            onChange={v => handleModelChange(machine.id, v)}
                            onSelect={suggestion => {
                              if (suggestion.has_instructions) {
                                void handleCheckExistingInstruction({ ...machine, model: suggestion.model_name });
                              }
                            }}
                            placeholder={t("territoryMachinePlaceholder")}
                            className="min-w-0 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900"
                          />
                          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                            {machineLoading[machine.id] ? (
                              <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900">
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                </svg>
                                {machineLoading[machine.id] === "uploading"
                                  ? t("adminAnalysingPdf")
                                  : t("adminCheckingModel")}
                              </span>
                            ) : machine.programs.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 ring-1 ring-green-100 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-900">
                                <CheckCircle2 size={14} /> {formatCount("adminProgramsCount", machine.programs.length)}
                              </span>
                            ) : machine.found ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900">
                                <CheckCircle2 size={14} /> {t("adminModelFound")}
                              </span>
                            ) : machine.model.trim() ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900">
                                <AlertCircle size={14} /> {t("adminNoManual")}
                              </span>
                            ) : null}
                            {!machineLoading[machine.id] && machine.programs.length === 0 && machine.model.trim() && (
                              <a
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                href={`https://www.google.com/search?q=${encodeURIComponent(`${machine.model} manual wash programs`)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink size={14} /> {t("adminSearch")}
                              </a>
                            )}
                            <label className={`inline-flex h-9 items-center gap-1 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition dark:border-blue-800 dark:text-blue-300 ${machineLoading[machine.id] ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30"}`}>
                              <Upload size={14} />
                              <span>{machine.programs.length > 0 ? t("adminReplacePdf") : t("adminUploadPdf")}</span>
                              <input
                                type="file"
                                accept=".pdf,.txt"
                                className="hidden"
                                disabled={!!machineLoading[machine.id]}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadInstruction(machine, file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {machine.programs.length > 0 && (
                          <div className="mt-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPrograms(prev => ({ ...prev, [machine.id]: !prev[machine.id] }))
                              }
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200"
                            >
                              <span className="inline-flex items-center gap-2">
                                <ListChecks size={15} />
                                {t("adminDetectedPrograms")}
                              </span>
                              <ChevronDown
                                size={15}
                                className={`transition ${expandedPrograms[machine.id] ? "rotate-180" : ""}`}
                              />
                            </button>
                            {expandedPrograms[machine.id] && (
                              <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {machine.programs.map((p, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]">
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="font-mono text-gray-500 dark:text-gray-400">{p.duration_minutes} min</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <ContinueButton step={3} highestStep={highestStep} advanceTo={advanceTo} label={continueLabel} />
        </StepSection>

        <StepSection step={4} highestStep={highestStep}>
          <StepTitle number={4} title={t("adminBookingRulesTitle")} done={highestStep > 4} locked={isLocked(4)} />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">{t("adminSlotPatternTitle")}</div>
              <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t("adminSlotPatternText")}</div>
            </div>
            <div className="rounded-lg border border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">{t("adminUserLimitTitle")}</div>
              <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t("adminUserLimitText")}</div>
            </div>
            <div className="rounded-lg border border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">{t("adminConfirmationRuleTitle")}</div>
              <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t("adminConfirmationRuleText")}</div>
            </div>
          </div>
          <ContinueButton step={4} highestStep={highestStep} advanceTo={advanceTo} label={continueLabel} />
        </StepSection>

        <StepSection step={5} highestStep={highestStep}>
          <StepTitle number={5} title={t("adminReviewTitle")} locked={isLocked(5)} />
          <div className="grid gap-3 text-sm md:grid-cols-4">
            {(
              [
                [t("adminReviewTerritory"), name.trim() || t("adminNotNamed")],
                [t("adminReviewZones"), zonesCount],
                [t("adminReviewMachines"), totalMachines],
                [
                  t("adminReviewPrograms"),
                  t("adminProgramsAcrossMachines")
                    .replace("{programs}", String(totalDetectedPrograms))
                    .replace("{machines}", String(machinesWithPrograms)),
                ],
              ] as [string, string | number][]
            ).map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-950/50">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</div>
                <div className="mt-1 font-bold text-gray-950 dark:text-white">{value}</div>
              </div>
            ))}
          </div>
        </StepSection>

        {errors && <div className="text-xs text-red-600 dark:text-red-400">{errors}</div>}

        {initial && onDelete && deleteConfirmOpen && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="text-sm font-bold text-red-700 dark:text-red-300">
              {t("adminDeleteTerritory")}
            </div>
            <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-200">
              {t("adminDeleteTerritoryConfirm").replace("{name}", initial.name)}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {t("territoryRemoveCancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "…" : t("adminDeleteTerritory")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {initial && onDelete && !deleteConfirmOpen && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving || deleting}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {t("adminDeleteTerritory")}
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            {t("authBack")}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || isLocked(5)}
            className={`rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${
              saving || isLocked(5) ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {initial ? t("territorySave") : t("territorySaveGenerate")}
          </button>
          </div>
        </div>

      </div>
    </>
  );

  if (renderMode === "page") {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="w-full max-w-6xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl p-5 sm:p-6 overflow-y-auto"
    >
      {content}
    </ModalShell>
  );
}
