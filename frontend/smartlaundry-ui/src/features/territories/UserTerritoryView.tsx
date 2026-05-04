import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../app-shell/i18n-context";
import { LandingDescription } from "../../app-shell/LandingDescription";
import { apiClient } from "../../shared/apiClient";
import { InlineMachine } from "../../ui-kit/WashingMachineLoader";

type Program = { name: string; duration_minutes: number };
type Machine = {
  id: string;
  number: number;
  model_name: string;
  instruction_file?: string | null;
  status: string;
  programs: Program[];
  bookings: Booking[];
};
type Booking = {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
  user?: { id: number; email: string };
};
type Zone = { id: string; name: string; description?: string; machines: Machine[] };
type Territory = { id: string; name: string; code: string; zones: Zone[] };

type Props = {
  territoryId: number | null;
  onSelectTerritory: (id: number | null) => void;
};

type PendingBooking = {
  program: Program;
  start: Date;
  endRaw: Date;
  endSlot: Date;
};

const MINUTE_STEP = 10;
const BUFFER_MINUTES = 10;

const TODAY_OVERRIDE = { year: 2026, month: 0, date: 5 };

const nowWithOverride = () => {
  const real = new Date();
  real.setFullYear(TODAY_OVERRIDE.year, TODAY_OVERRIDE.month, TODAY_OVERRIDE.date);
  return real;
};

const ceilToStep = (date: Date, stepMinutes = MINUTE_STEP) => {
  const d = new Date(date);
  const remainder = d.getMinutes() % stepMinutes;
  if (remainder !== 0) {
    d.setMinutes(d.getMinutes() - remainder + stepMinutes, 0, 0);
  } else {
    d.setSeconds(0, 0);
    d.setMilliseconds(0);
  }
  return d;
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

const startOfToday = () => {
  const now = nowWithOverride();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const endOfToday = () => {
  const now = nowWithOverride();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });

const formatTimeLabel = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDateTimeLabel = (d: Date) => `${formatDateLabel(d)} ${formatTimeLabel(d)}`;

const formatTimeInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const parseTimeInput = (value: string) => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  const now = nowWithOverride();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
};

const parseMachineIdFromPath = () => {
  const match = window.location.pathname.match(/\/washers\/([^/]+)/);
  return match ? match[1] : null;
};

const withBufferEnd = (endTime: Date) => ceilToStep(addMinutes(endTime, BUFFER_MINUTES));

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 12 12"
    className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function UserTerritoryView({ territoryId, onSelectTerritory }: Props) {
  const { t } = useI18n();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [current, setCurrent] = useState<Territory | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [startCandidate, setStartCandidate] = useState<Date | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [territoryMenuOpen, setTerritoryMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(nowWithOverride());
  const [initialMachineFromPath, setInitialMachineFromPath] = useState<string | null>(null);
  const [territoriesLoading, setTerritoriesLoading] = useState(true);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = useMemo(() => {
    const id = window.localStorage.getItem("sl_user_id");
    return id ? Number(id) : null;
  }, []);

  useEffect(() => {
    loadTerritories();
  }, []);

  useEffect(() => {
    const match = parseMachineIdFromPath();
    if (match) {
      setInitialMachineFromPath(match);
    }
  }, []);

  useEffect(() => {
    if (current) {
      const map: Record<string, boolean> = {};
      current.zones.forEach(z => {
        map[z.id] = false;
      });
      setExpandedZones(map);
    }
  }, [current]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(nowWithOverride()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setTerritoryMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setTerritoryMenuOpen(false);
  }, [current?.id]);

  useEffect(() => {
    if (initialMachineFromPath && territories.length) {
      void handleSelectMachine(initialMachineFromPath, { replaceHistory: true });
      setInitialMachineFromPath(null);
    }
  }, [initialMachineFromPath, territories]);

  useEffect(() => {
    const onPopState = () => {
      const machineId = parseMachineIdFromPath();
      if (machineId) {
        void handleSelectMachine(machineId, { replaceHistory: true });
      } else {
        handleBackToList({ replaceHistory: true });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [territories]);

  const loadTerritories = async () => {
    try {
      setTerritoriesLoading(true);
      const response = await apiClient.get("territories/mine/");
      const items = Array.isArray(response.data)
        ? response.data
            .map((item: any) => item?.territory)
            .filter(Boolean)
        : [];
      for (const terr of items) {
        for (const zone of terr.zones || []) {
          for (const machine of zone.machines || []) {
            const bookings = await loadBookings(machine.id);
            machine.bookings = bookings;
          }
        }
      }
      setTerritories(items);
      if (items.length && !current) {
        setCurrent(items[0]);
        onSelectTerritory(Number(items[0].id));
        setSelectedMachineId(null);
      }
      if (items.length) {
        const map: Record<string, boolean> = {};
        items[0].zones.forEach((z: any) => {
          map[z.id] = false;
        });
        setExpandedZones(map);
      }
    } catch {
      // ignore
    } finally {
      setTerritoriesLoading(false);
    }
  };

  const loadBookings = async (machineId: string) => {
    try {
      const response = await apiClient.get("territories/bookings/", { params: { machine: machineId } });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  };

  const applyBookings = (machineId: string, bookings: Booking[]) => {
    setTerritories(prev =>
      prev.map(territory => ({
        ...territory,
        zones: territory.zones.map(zone => ({
          ...zone,
          machines: zone.machines.map(machine => (machine.id === machineId ? { ...machine, bookings } : machine))
        }))
      }))
    );
    setCurrent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        zones: prev.zones.map(zone => ({
          ...zone,
          machines: zone.machines.map(machine => (machine.id === machineId ? { ...machine, bookings } : machine))
        }))
      };
    });
  };

  const machineIndex = useMemo(() => {
    const map: Record<string, { machine: Machine; territoryId: string; zoneId: string }> = {};
    territories.forEach(territory => {
      territory.zones.forEach(zone => {
        zone.machines.forEach(machine => {
          map[machine.id] = { machine, territoryId: String(territory.id), zoneId: String(zone.id) };
        });
      });
    });
    return map;
  }, [territories]);

  useEffect(() => {
    if (territoryId && territories.length) {
      const terr = territories.find(t => String(t.id) === String(territoryId)) || null;
      setCurrent(terr);
      const currentSelection = selectedMachineId;
      if (currentSelection) {
        const entry = machineIndex[currentSelection];
        if (!entry || entry.territoryId !== String(territoryId)) {
          setSelectedMachineId(null);
        }
      }
    }
  }, [territoryId, territories, machineIndex, selectedMachineId]);

  const machineWithBookings = useMemo(() => {
    if (!current) return {};
    const result: Record<string, Machine> = {};
    current.zones.forEach(z => {
      z.machines.forEach(m => {
        result[m.id] = m as any;
      });
    });
    return result;
  }, [current]);

  const handleSelectMachine = async (machineId: string, options?: { replaceHistory?: boolean }) => {
    const entry = machineIndex[machineId];
    if (!entry) {
      setError(t("bookingErrorMachineNotFound"));
      return;
    }
    const needsSwitch = !current || String(current.id) !== entry.territoryId;
    if (needsSwitch) {
      const terr = territories.find(t => String(t.id) === entry.territoryId);
      if (terr) {
        setCurrent(terr);
        onSelectTerritory(Number(terr.id));
      }
    }
    setSelectedMachineId(machineId);
    setSelectedProgram("");
    setStartCandidate(ceilToStep(nowWithOverride()));
    setPendingBooking(null);
    setError(null);
    setInfo(null);
    if (options?.replaceHistory) {
      window.history.replaceState({ machineId }, "", `/washers/${machineId}`);
    } else {
      window.history.pushState({ machineId }, "", `/washers/${machineId}`);
    }
    const bookings = await loadBookings(machineId);
    applyBookings(machineId, bookings);
    const zoneId = entry.zoneId;
    if (zoneId) {
      setExpandedZones(prev => ({ ...prev, [zoneId]: true }));
    }
  };

  const handleBackToList = (options?: { replaceHistory?: boolean }) => {
    setSelectedMachineId(null);
    setSelectedProgram("");
    setStartCandidate(null);
    setPendingBooking(null);
    setError(null);
    setInfo(null);
    if (options?.replaceHistory) {
      window.history.replaceState({}, "", "/");
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  const toggleZone = (zoneId: string) => {
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const handlePickTerritory = (terr: Territory) => {
    onSelectTerritory(Number(terr.id));
    setCurrent(terr);
    setSelectedMachineId(null);
    setTerritoryMenuOpen(false);
  };

  const getActiveBookingsForMachine = (machine: Machine) =>
    (machine.bookings || [])
      .filter(b => b.status === "active")
      .slice()
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const userActiveBookingsCount = useMemo(() => {
    if (!currentUserId || !territories.length) return 0;
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    let count = 0;
    territories.forEach(territory => {
      territory.zones.forEach(zone => {
        zone.machines.forEach(machine => {
          (machine.bookings || []).forEach(b => {
            const start = new Date(b.start_time);
            if (
              b.status === "active" &&
              start >= todayStart &&
              start <= todayEnd &&
              b.user?.id === currentUserId
            ) {
              count += 1;
            }
          });
        });
      });
    });
    return count;
  }, [territories, currentUserId]);

  const getBookingTimes = (start: Date, durationMinutes: number) => {
    const endRaw = addMinutes(start, durationMinutes);
    const endSlot = withBufferEnd(endRaw);
    return { endRaw, endSlot };
  };

  const isSlotAvailable = (machine: Machine, start: Date, durationMinutes: number) => {
    const { endSlot } = getBookingTimes(start, durationMinutes);
    return !getActiveBookingsForMachine(machine).some(b => {
      const bStart = new Date(b.start_time);
      const bEndSlot = withBufferEnd(new Date(b.end_time));
      return start < bEndSlot && endSlot > bStart;
    });
  };

  const findNextAvailableSlot = (machine: Machine, durationMinutes: number) => {
    const stepMs = MINUTE_STEP * 60000;
    let candidate = ceilToStep(nowWithOverride());
    const endDay = endOfToday();
    while (candidate <= endDay) {
      if (isSlotAvailable(machine, candidate, durationMinutes)) {
        return candidate;
      }
      candidate = new Date(candidate.getTime() + stepMs);
    }
    return null;
  };

  const validateSelection = (machine: Machine | undefined, program: Program | undefined, start: Date | null) => {
    if (!machine) return t("bookingErrorMachineNotFound");
    if (!program) return t("bookingErrorProgram");
    if (!start) return t("bookingErrorStart");
    const nowCeil = ceilToStep(nowWithOverride());
    if (!isSameDay(start, nowCeil)) return t("bookingErrorTodayOnly");
    if (start < nowCeil) return t("bookingErrorFuture");
    if (start.getMinutes() % MINUTE_STEP !== 0) return t("bookingErrorStep");
    const existing = (machine.bookings || []).find(
      b => b.status === "active" && b.user?.id === currentUserId && isSameDay(new Date(b.start_time), start)
    );
    if (existing) return t("bookingErrorAlreadyBooked");
    if (userActiveBookingsCount >= 2) return t("bookingErrorDailyLimit");
    if (!isSlotAvailable(machine, start, program.duration_minutes)) return t("bookingErrorOverlap");
    return null;
  };

  const handleFindNearest = () => {
    if (!selectedMachineId) return;
    const machine = machineWithBookings[selectedMachineId];
    const program = machine?.programs.find(p => p.name === selectedProgram);
    if (!machine) {
      setError(t("bookingErrorMachineNotFound"));
      return;
    }
    if (!program) {
      setError(t("bookingErrorProgram"));
      return;
    }
    const validationBase = validateSelection(
      machine,
      program,
      startCandidate || ceilToStep(nowWithOverride())
    );
    if (validationBase) {
      setError(validationBase);
      return;
    }
    const next = findNextAvailableSlot(machine, program.duration_minutes);
    if (!next) {
      setError(t("bookingNoSlots"));
      return;
    }
    setError(null);
    setInfo(null);
    setPendingBooking(null);
    setStartCandidate(next);
  };

  const handleContinue = () => {
    if (!selectedMachineId) return;
    const machine = machineWithBookings[selectedMachineId];
    const program = machine?.programs.find(p => p.name === selectedProgram);
    const validation = validateSelection(machine, program, startCandidate);
    if (validation) {
      setError(validation);
      setPendingBooking(null);
      return;
    }
    if (!machine || !program || !startCandidate) return;
    const { endRaw, endSlot } = getBookingTimes(startCandidate, program.duration_minutes);
    setPendingBooking({ program, start: startCandidate, endRaw, endSlot });
    setError(null);
    setInfo(null);
  };

  const handleConfirmBooking = async () => {
    if (!pendingBooking || !selectedMachineId) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("territories/bookings/", {
        machine: selectedMachineId,
        start_time: pendingBooking.start.toISOString(),
        end_time: pendingBooking.endSlot.toISOString()
      });
      setInfo(t("bookingSuccess"));
      setPendingBooking(null);
      setSelectedProgram("");
      const bookings = await loadBookings(selectedMachineId);
      applyBookings(selectedMachineId, bookings);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data;
      setError(typeof detail === "string" ? detail : t("bookingErrorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const todayLabel = formatDateLabel(currentTime);

  if (!territories.length && territoriesLoading) {
    return (
      <div className="flex justify-center py-10">
        <InlineMachine />
      </div>
    );
  }

  if (!territories.length && !territoriesLoading) {
    return (
      <div className="space-y-6">
        <LandingDescription />
      </div>
    );
  }

  if (!current) {
    return <LandingDescription />;
  }

  const renderMachineCard = (machine: Machine, asHeader = false) => {
    const now = currentTime;
    const busy = (machine.bookings || []).some(b => {
      if (b.status !== "active") return false;
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      return s <= now && e >= now;
    });
    const isBroken = machine.status === "broken";
    const visibleBookings = getActiveBookingsForMachine(machine);
    const myBooking = visibleBookings.find(b => {
      const start = new Date(b.start_time);
      const endSlot = new Date(b.end_time);
      return b.user?.id === currentUserId && now < endSlot && isSameDay(start, startOfToday());
    });
    const nextActiveBooking = visibleBookings.find(b => new Date(b.end_time) > now);
    const statusColor = isBroken
      ? "text-red-700 dark:text-red-300"
      : busy
      ? "text-amber-700 dark:text-amber-300"
      : "text-green-700 dark:text-green-300";
    const statusText = isBroken ? "Niedostępna" : busy ? "Zajęta" : "Wolna";
    const cardTone = isBroken
      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/30"
      : busy
      ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900";

    return (
      <div
        key={machine.id}
        className={`p-4 rounded-lg border relative ${cardTone} ${
          asHeader ? "" : "cursor-pointer hover:shadow-md transition"
        }`}
        onClick={() => !asHeader && void handleSelectMachine(machine.id)}
      >
        <div className="sm:grid sm:grid-cols-[1.1fr,auto] sm:items-start sm:gap-6 flex flex-col gap-4">
          <div className="space-y-3">
            <div className="text-2xl font-semibold">Pralka {machine.number}</div>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                <div className={`font-semibold ${statusColor}`}>{statusText}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Aktualny czas</div>
                <div className="font-mono text-sm">
                  {now.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("bookingActiveTitle")}</div>
                {nextActiveBooking ? (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{formatTimeLabel(new Date(nextActiveBooking.start_time))}</span>
                    <span className="text-gray-400">-</span>
                    <span>{formatTimeLabel(new Date(nextActiveBooking.end_time))}</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">{t("bookingActiveNone")}</div>
                )}
              </div>
            </div>
            {!asHeader && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  void handleSelectMachine(machine.id);
                }}
                className="inline-flex mt-2 px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                {t("bookingCTA")}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center sm:w-70 sm:self-stretch sm:py-4">
            <InlineMachine size={200} />
          </div>
        </div>

        {myBooking && (
          <div className="mt-2 sm:mt-0 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:min-w-[260px] sm:max-w-md pointer-events-none">
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 shadow-sm">
              <div className="text-xs font-semibold text-blue-800 dark:text-blue-200">{t("bookingMy")}</div>
              <div className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                {formatTimeLabel(new Date(myBooking.start_time))} - {formatTimeLabel(new Date(myBooking.end_time))}
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-300">{t("bookingMyDailyLimit")}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedMachine = selectedMachineId
    ? machineWithBookings[selectedMachineId] || machineIndex[selectedMachineId]?.machine
    : null;

  if (selectedMachineId && selectedMachine) {
    const machine = selectedMachine;
    const activeBookings = getActiveBookingsForMachine(machine);
    const latestTodayEndSlot = activeBookings.reduce<Date | null>((acc, b) => {
      const bStart = new Date(b.start_time);
      if (!isSameDay(bStart, startOfToday())) return acc;
      const endSlot = withBufferEnd(new Date(b.end_time));
      if (!acc || endSlot > acc) return endSlot;
      return acc;
    }, null);
    const crossesToTomorrow = latestTodayEndSlot ? !isSameDay(latestTodayEndSlot, startOfToday()) : false;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBackToList()}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("bookingBackToList")}
          </button>
          <div className="text-xs text-gray-500">{t("bookingTodayOnly").replace("{date}", todayLabel)}</div>
        </div>

        {renderMachineCard(machine, true)}

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 bg-white dark:bg-gray-900">
          <div className="space-y-1">
            <div className="text-lg font-semibold">{t("bookingTitle")}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t("bookingTodayOnly").replace("{date}", todayLabel)}
            </div>
            {crossesToTomorrow && latestTodayEndSlot && (
              <div className="text-xs text-amber-700 dark:text-amber-300">
                {t("bookingWarningNextDay").replace("{time}", formatDateTimeLabel(latestTodayEndSlot))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t("bookingSelectProgram")}</label>
              <select
                value={selectedProgram}
                onChange={e => {
                  setSelectedProgram(e.target.value);
                  setPendingBooking(null);
                  setError(null);
                  setInfo(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">{t("bookingSelectProgramPlaceholder")}</option>
                {(machine.programs || []).map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.duration_minutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t("bookingManualStart")}</label>
              <input
                type="time"
                step={MINUTE_STEP * 60}
                value={startCandidate ? formatTimeInput(startCandidate) : ""}
                onChange={e => {
                  const parsed = parseTimeInput(e.target.value);
                  setStartCandidate(parsed ? ceilToStep(parsed) : null);
                  setPendingBooking(null);
                  setError(null);
                  setInfo(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("bookingManualHint")}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFindNearest}
              className="px-4 py-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
              disabled={!selectedProgram}
            >
              {t("bookingNearest")}
            </button>
            <button
              onClick={handleContinue}
              className="px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              disabled={!selectedProgram || !startCandidate}
            >
              {t("bookingContinue")}
            </button>
          </div>

          {pendingBooking && (
            <div className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2">
              <div className="text-sm font-semibold">{t("bookingSummaryTitle")}</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("bookingStartLabel")}: </span>
                  <span className="font-semibold">{formatDateTimeLabel(pendingBooking.start)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("bookingEndLabel")}: </span>
                  <span className="font-semibold">{formatDateTimeLabel(pendingBooking.endRaw)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("bookingNextAvailableLabel")}: </span>
                  <span className="font-semibold">{formatDateTimeLabel(pendingBooking.endSlot)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {t("bookingConfirm")}
                </button>
                <button
                  onClick={() => setPendingBooking(null)}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm font-semibold"
                >
                  {t("bookingChangeSelection")}
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
          {info && <div className="text-xs text-emerald-700 dark:text-emerald-300">{info}</div>}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900">
          <div className="text-sm font-semibold">{t("bookingListTitle")}</div>
          {activeBookings.length === 0 && (
            <div className="text-xs text-gray-500">{t("bookingListEmpty")}</div>
          )}
          {activeBookings.length > 0 && (
            <div className="space-y-2">
              {activeBookings.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-sm rounded-md border border-gray-100 dark:border-gray-800 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold">
                      {formatTimeLabel(new Date(b.start_time))} - {formatTimeLabel(new Date(b.end_time))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(b.start_time).toLocaleDateString([], { dateStyle: "medium" })}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {b.user?.email || t("bookingUnknownUser")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative flex flex-wrap items-center gap-3" ref={selectorRef}>
        <button
          className="relative flex items-center gap-2 text-lg font-semibold underline underline-offset-4"
          onClick={() => setTerritoryMenuOpen(prev => !prev)}
        >
          <span>{current.name}</span>
          <Chevron open={territoryMenuOpen} />
        </button>
        {territoryMenuOpen && (
          <div className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Twoje kody</div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {territories.map(terr => (
                <button
                  key={terr.id}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    terr.id === current.id ? "bg-gray-50 dark:bg-gray-800/60" : ""
                  }`}
                  onClick={() => handlePickTerritory(terr)}
                >
                  <div className="text-sm font-semibold">{terr.code || terr.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{terr.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {current.zones.map(zone => {
        const isZoneOpen = expandedZones[zone.id] !== false;
        return (
          <div key={zone.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <button
              className="flex items-center justify-between w-full text-sm font-semibold mb-2"
              onClick={() => toggleZone(zone.id)}
            >
              <span>{zone.name || `${t("territoryZoneLabel")} ${zone.id}`}</span>
              <span className="text-xs text-gray-500">
                <Chevron open={isZoneOpen} />
              </span>
            </button>
            {isZoneOpen && (
              <div className="flex flex-col gap-4">
                {zone.machines.map(machine => renderMachineCard(machine))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
