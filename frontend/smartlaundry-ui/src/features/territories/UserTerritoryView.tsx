import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../app-shell/i18n-context";

import { apiClient } from "../../shared/apiClient";
import { InlineMachine } from "../../ui-kit/WashingMachineLoader";
import { CalendarDays, Clock3, Info, MapPin, MapPinned, Search, Timer, WashingMachine, Wrench, X } from "lucide-react";
import { ProblemReportModal } from "./ProblemReportModal";

type Program = { name: string; duration_minutes: number };
type Machine = {
  id: string | number;
  number: number;
  model_name: string;
  instruction_file?: string | null;
  status: string;
  programs: Program[];
  bookings: Booking[];
};
type Booking = {
  id: number;
  machine: string | number;
  start_time: string;
  end_time: string;
  status: string;
  user?: { id: number; email: string };
};
type Zone = { id: string | number; name: string; description?: string; machines: Machine[] };
type Territory = {
  id: string | number;
  name: string;
  code: string;
  slot_strategy?: "auto" | "fixed_120";
  booking_slot_minutes?: number;
  zones: Zone[];
};
type TerritoryAccessResponse = { territory?: Territory | null };
const isTerritory = (value: Territory | null | undefined): value is Territory => Boolean(value);
type ApiErrorPayload = {
  detail?: unknown;
  non_field_errors?: unknown;
  [key: string]: unknown;
};
type ApiClientError = { response?: { data?: unknown } };

type Props = {
  territoryId: number | null;
  onSelectTerritory: (id: number | null) => void;
  onTerritoriesLoaded?: (count: number) => void;
};

type PendingBooking = {
  program: Program;
  start: Date;
  endRaw: Date;
  endSlot: Date;
};

type BookingConfirmation = {
  machine: Machine;
  start: Date;
  end: Date;
  location: string;
  program: Program | null;
  slots: { start: Date; end: Date; duration: number }[];
};

const MINUTE_STEP = 30;
const SHORT_SLOT_MINUTES = 60;
const LONG_SLOT_MINUTES = 120;

// Wzorzec slotów na dobę: nieparzyste pralki zaczynają od krótkich (60 min),
// parzyste od długich (120 min) — żeby unikać że wszyscy rezerwują ten sam slot.
const SLOT_PATTERN_MINUTES = [SHORT_SLOT_MINUTES, SHORT_SLOT_MINUTES, LONG_SLOT_MINUTES, LONG_SLOT_MINUTES];
const OPPOSITE_SLOT_PATTERN_MINUTES = [LONG_SLOT_MINUTES, LONG_SLOT_MINUTES, SHORT_SLOT_MINUTES, SHORT_SLOT_MINUTES];

type BookingSlot = {
  start: Date;
  end: Date;
  duration: number;
  state: "past" | "current" | "booked" | "free";
};

// Zaokrągla datę w górę do najbliższego wielokrotności stepMinutes (np. 10:05 → 10:30)
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

const ceilToBookingSlot = (date: Date, slotMinutes: number) => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const minutesFromStart = Math.max(0, Math.ceil((date.getTime() - dayStart.getTime()) / 60000));
  const slotIndex = Math.ceil(minutesFromStart / slotMinutes);
  return addMinutes(dayStart, slotIndex * slotMinutes);
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDateLabel = (d: Date, locale?: string) =>
  d.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });

const formatTimeLabel = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const formatDateTimeLabel = (d: Date) => `${formatDateLabel(d)} ${formatTimeLabel(d)}`;

const formatDurationLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} godz. ${restMinutes} min` : `${hours} godz.`;
};

const formatUserTag = (user?: Booking["user"], fallback = "User") => user?.id ? `${fallback} #${user.id}` : fallback;

// Wyciąga czytelny komunikat błędu z odpowiedzi API (Django zwraca różne struktury)
const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as ApiClientError)?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data !== "object") return fallback;
  const payload = data as ApiErrorPayload;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length) {
    return String(payload.non_field_errors[0]);
  }
  const firstValue = Object.values(payload)[0];
  if (Array.isArray(firstValue) && firstValue.length) return String(firstValue[0]);
  if (typeof firstValue === "string") return firstValue;
  return fallback;
};

const formatTimeInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const applyTimeToDate = (date: Date, value: string) => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h || 0, m || 0, 0, 0);
};

const parseMachineIdFromPath = () => {
  const match = window.location.pathname.match(/\/washers\/([^/]+)/);
  return match ? match[1] : null;
};

const withBufferEnd = (endTime: Date) => ceilToStep(endTime, 30);

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

type MachineUiStatus = "free_now" | "occupied" | "broken" | "inactive" | "user_booking";

const isMachineUnavailable = (status: string) =>
  ["broken", "inactive", "maintenance", "unavailable", "offline"].includes(status);

export function UserTerritoryView({ territoryId, onSelectTerritory, onTerritoriesLoaded }: Props) {
  const { t, lang } = useI18n();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [current, setCurrent] = useState<Territory | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [startCandidate, setStartCandidate] = useState<Date | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem("sl_zones") ?? "{}"); } catch { return {}; }
  });
  const [territoryMenuOpen, setTerritoryMenuOpen] = useState(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState(() => {
    try { const v = sessionStorage.getItem("sl_day_offset"); return v ? Math.max(0, Math.min(2, parseInt(v, 10))) : 0; } catch { return 0; }
  });
  const [highlightedMachineId, setHighlightedMachineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!highlightedMachineId) return;
    const el = document.getElementById(`machine-card-${highlightedMachineId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedMachineId]);
  const [initialMachineFromPath, setInitialMachineFromPath] = useState<string | null>(null);
  const [territoriesLoading, setTerritoriesLoading] = useState(true);
  const [programPromptActive, setProgramPromptActive] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ territoryId: number; machineId: number; zoneId: number; machineLabel: string } | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem("sl_zones", JSON.stringify(expandedZones)); } catch {}
  }, [expandedZones]);

  useEffect(() => {
    try { sessionStorage.setItem("sl_day_offset", String(selectedDayOffset)); } catch {}
  }, [selectedDayOffset]);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const programSelectorRef = useRef<HTMLDivElement | null>(null);
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
      current.zones.forEach((z, index) => {
        map[String(z.id)] = index === 0;
      });
      setExpandedZones(map);
    }
  }, [current]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!bookingConfirmation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [bookingConfirmation]);

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
    if (initialMachineFromPath && territories.length && selectedMachineId !== initialMachineFromPath) {
      void handleSelectMachine(initialMachineFromPath, { replaceHistory: true });
      setInitialMachineFromPath(null);
    }
  }, [initialMachineFromPath, territories, selectedMachineId]);

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

  const loadTerritoryBookingsBulk = async (territoryId: string | number): Promise<Booking[]> => {
    try {
      const response = await apiClient.get("territories/bookings/", { params: { territory_id: territoryId } });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  };

  const distributeBookings = (items: Territory[], bookingsByTerritory: Record<string, Booking[]>): Territory[] =>
    items.map(terr => ({
      ...terr,
      zones: terr.zones.map(zone => ({
        ...zone,
        machines: zone.machines.map(machine => ({
          ...machine,
          bookings: (bookingsByTerritory[String(terr.id)] || []).filter(b => String(b.machine) === String(machine.id)),
        })),
      })),
    }));

  const loadTerritories = async () => {
    try {
      setTerritoriesLoading(true);
      const response = await apiClient.get("territories/mine/");
      const items = Array.isArray(response.data)
        ? response.data
            .map((item: TerritoryAccessResponse) => item?.territory)
            .filter(isTerritory)
        : [];
      const bookingsByTerritory: Record<string, Booking[]> = {};
      await Promise.all(
        items.map(async (terr: Territory) => {
          bookingsByTerritory[String(terr.id)] = await loadTerritoryBookingsBulk(terr.id);
        })
      );
      const itemsWithBookings = distributeBookings(items, bookingsByTerritory);
      setTerritories(itemsWithBookings);
      onTerritoriesLoaded?.(items.length);
      if (itemsWithBookings.length && !current) {
        const machineIdFromPath = parseMachineIdFromPath();
        const firstTerritory = itemsWithBookings[0];
        if (!firstTerritory) return;
        let nextTerritory: Territory = firstTerritory;
        let nextZoneId: string | null = null;
        if (machineIdFromPath) {
          for (const terr of itemsWithBookings) {
            for (const zone of terr.zones || []) {
              if ((zone.machines || []).some((machine: Machine) => String(machine.id) === String(machineIdFromPath))) {
                nextTerritory = terr;
                nextZoneId = String(zone.id);
              }
            }
          }
        }
        setCurrent(nextTerritory);
        onSelectTerritory(Number(nextTerritory.id));
        if (machineIdFromPath && nextZoneId) {
          setSelectedMachineId(machineIdFromPath);
          setInitialMachineFromPath(null);
          const slotMinutes = nextTerritory.booking_slot_minutes || 120;
          const base = isSameDay(selectedDayStart, startOfToday()) ? new Date() : selectedDayStart;
          setStartCandidate(ceilToBookingSlot(base, slotMinutes));
        } else {
          setSelectedMachineId(null);
        }
      }
      if (itemsWithBookings.length) {
        const machineIdFromPath = parseMachineIdFromPath();
        const zoneIdFromPath = machineIdFromPath
          ? itemsWithBookings.flatMap(terr => terr.zones).find(zone =>
              (zone.machines || []).some(machine => String(machine.id) === String(machineIdFromPath))
            )?.id
          : null;
        if (zoneIdFromPath) {
          setExpandedZones(prev => ({ ...prev, [String(zoneIdFromPath)]: true }));
        } else {
          setExpandedZones(prev => {
            const hasAnyOpen = Object.values(prev).some(Boolean);
            if (hasAnyOpen) return prev;
            const firstZone = itemsWithBookings[0]?.zones[0];
            return firstZone ? { [String(firstZone.id)]: true } : prev;
          });
        }
      }
    } catch {
      setTerritories([]);
      setCurrent(null);
      onSelectTerritory(null);
    } finally {
      setTerritoriesLoading(false);
    }
  };

  const loadBookings = async (machineId: string | number): Promise<Booking[]> => {
    try {
      const response = await apiClient.get("territories/bookings/", { params: { machine: machineId } });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  };

  const applyBookings = (machineId: string | number, bookings: Booking[]) => {
    setTerritories(prev =>
      prev.map(territory => ({
        ...territory,
        zones: territory.zones.map(zone => ({
          ...zone,
          machines: zone.machines.map(machine => (String(machine.id) === String(machineId) ? { ...machine, bookings } : machine))
        }))
      }))
    );
    setCurrent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        zones: prev.zones.map(zone => ({
          ...zone,
          machines: zone.machines.map(machine => (String(machine.id) === String(machineId) ? { ...machine, bookings } : machine))
        }))
      };
    });
  };

  const machineIndex = useMemo(() => {
    const map: Record<string, { machine: Machine; territoryId: string; zoneId: string }> = {};
    territories.forEach(territory => {
      territory.zones.forEach(zone => {
        zone.machines.forEach(machine => {
          map[String(machine.id)] = { machine, territoryId: String(territory.id), zoneId: String(zone.id) };
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
        result[String(m.id)] = m;
      });
    });
    return result;
  }, [current]);

  const handleSelectMachine = async (machineIdValue: string | number, options?: { replaceHistory?: boolean }) => {
    const machineId = String(machineIdValue);
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
    setHighlightedMachineId(null);
    setSelectedProgram("");
    const slotMinutes = current?.booking_slot_minutes || 120;
    const base = isSameDay(selectedDayStart, startOfToday()) ? new Date() : selectedDayStart;
    setStartCandidate(ceilToBookingSlot(base, slotMinutes));
    setPendingBooking(null);
    setBookingConfirmation(null);
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
    setBookingConfirmation(null);
    setError(null);
    setInfo(null);
    if (options?.replaceHistory) {
      window.history.replaceState({}, "", "/");
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  const toggleZone = (zoneIdValue: string | number) => {
    const zoneId = String(zoneIdValue);
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const handlePickTerritory = (terr: Territory) => {
    onSelectTerritory(Number(terr.id));
    setCurrent(terr);
    setSelectedMachineId(null);
    setTerritoryMenuOpen(false);
  };

  const handleSelectDay = (offset: number) => {
    setSelectedDayOffset(offset);
    setHighlightedMachineId(null);
    setPendingBooking(null);
    setBookingConfirmation(null);
    setError(null);
    setInfo(null);
    const slotMinutes = current?.booking_slot_minutes || 120;
    const nextDay = addMinutes(startOfToday(), offset * 24 * 60);
    const base = offset === 0 ? new Date() : nextDay;
    setStartCandidate(ceilToBookingSlot(base, slotMinutes));
  };

  const getActiveBookingsForMachine = (machine: Machine) =>
    (machine.bookings || [])
      .filter(b => b.status === "active")
      .slice()
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const selectedDayStart = useMemo(() => addMinutes(startOfToday(), selectedDayOffset * 24 * 60), [selectedDayOffset, currentTime]);
  const selectedDayEnd = useMemo(() => addMinutes(selectedDayStart, 24 * 60), [selectedDayStart]);
  const bookingWindowStart = useMemo(() => startOfToday(), [currentTime]);
  const bookingWindowEnd = useMemo(() => addMinutes(bookingWindowStart, 3 * 24 * 60), [bookingWindowStart]);

  // Zlicza aktywne rezerwacje użytkownika w oknie 3 dni (limit = 3 jednoczesne rezerwacje)
  const userWindowBookings = useMemo(() => {
    if (!currentUserId || !territories.length) return [];
    const map = new Map<number, { booking: Booking; machine: Machine }>();
    territories.forEach(territory => {
      territory.zones.forEach(zone => {
        zone.machines.forEach(machine => {
          (machine.bookings || []).forEach(b => {
            const start = new Date(b.start_time);
            if (
              b.status === "active" &&
              start >= bookingWindowStart &&
              start < bookingWindowEnd &&
              b.user?.id === currentUserId
            ) {
              map.set(b.id, { booking: b, machine });
            }
          });
        });
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime()
    );
  }, [territories, currentUserId, bookingWindowStart, bookingWindowEnd]);

  const userActiveBookingsCount = userWindowBookings.length;
  const bookingLimitReached = userActiveBookingsCount >= 3;

  // Parzyste pralki mają odwrócony wzorzec — wyrównuje obciążenie między maszynami
  const getMachineSlotPattern = (machine: Machine) =>
    machine.number % 2 === 0 ? OPPOSITE_SLOT_PATTERN_MINUTES : SLOT_PATTERN_MINUTES;

  // Sprawdza czy nikt nie ma rezerwacji nakładającej się na podany czas.
  // withBufferEnd dodaje bufor do końca istniejącej rezerwacji (zaokrągla w górę do 30 min)
  const isRangeAvailable = (machine: Machine, start: Date, end: Date) =>
    !getActiveBookingsForMachine(machine).some(b => {
      const bStart = new Date(b.start_time);
      const bEndSlot = withBufferEnd(new Date(b.end_time));
      return start < bEndSlot && end > bStart;
    });

  // Generuje wszystkie sloty na wybrany dzień według wzorca pralki.
  // Każdy slot dostaje stan: past / current / booked / free
  const getSlotsForMachine = (machine: Machine): BookingSlot[] => {
    const slots: BookingSlot[] = [];
    const pattern = getMachineSlotPattern(machine);
    let slotCursor = selectedDayStart;
    let patternIndex = 0;
    while (slotCursor < selectedDayEnd) {
      const duration = pattern[patternIndex % pattern.length];
      const slotEnd = addMinutes(slotCursor, duration);
      if (slotEnd > selectedDayEnd) break;
      const booked = !isRangeAvailable(machine, slotCursor, slotEnd);
      const state =
        slotEnd <= currentTime
          ? "past"
          : slotCursor <= currentTime && currentTime < slotEnd
          ? "current"
          : booked
          ? "booked"
          : "free";
      slots.push({ start: slotCursor, end: slotEnd, duration, state });
      slotCursor = slotEnd;
      patternIndex += 1;
    }
    return slots;
  };

  // Checks if a program fits in the given slot or consecutive free slots.
  // Short programs (≤60 min) → 60-min slot only; medium (≤120) → 120-min slot only;
  // long (>120) → combines consecutive free slots, but a SHORT starting slot is only
  // allowed when slot+next already covers the program (prevents wasteful 1+1+2 patterns).
  const getCoveredSlotsForProgram = (slots: BookingSlot[], slot: BookingSlot, durationMinutes: number) => {
    if (!durationMinutes || slot.state !== "free") return null;
    if (durationMinutes <= SHORT_SLOT_MINUTES) {
      return slot.duration === SHORT_SLOT_MINUTES ? [slot] : null;
    }
    if (durationMinutes <= LONG_SLOT_MINUTES) {
      return slot.duration === LONG_SLOT_MINUTES ? [slot] : null;
    }
    const slotIndex = slots.findIndex(item => item.start.getTime() === slot.start.getTime());
    if (slotIndex < 0) return null;
    // Starting from a short slot: only allow if this slot + the next one already covers
    // the program (avoids 1+1+2 h patterns — prefer 1+2 or 2+2 instead)
    if (slot.duration === SHORT_SLOT_MINUTES) {
      const next = slots[slotIndex + 1];
      if (!next || next.state !== "free" || slot.duration + next.duration < durationMinutes) return null;
    }
    const coveredSlots: BookingSlot[] = [];
    let coveredMinutes = 0;
    let expectedStart = slot.start.getTime();
    for (const candidate of slots.slice(slotIndex)) {
      if (candidate.state !== "free" || candidate.start.getTime() !== expectedStart) return null;
      coveredSlots.push(candidate);
      coveredMinutes += candidate.duration;
      expectedStart = candidate.end.getTime();
      if (coveredMinutes >= durationMinutes) {
        return coveredSlots;
      }
    }
    return null;
  };

  const findNextAvailableSlot = (machine: Machine, durationMinutes: number) => {
    const slots = getSlotsForMachine(machine);
    return slots.find(slot => getCoveredSlotsForProgram(slots, slot, durationMinutes) !== null)?.start || null;
  };

  // Jeśli bieżący slot jest wolny i zostało w nim ≥30 min → zwróć teraz (można zacząć od razu).
  // W przeciwnym razie szuka najbliższego przyszłego wolnego slotu.
  const findNearestSlotForMachine = (machine: Machine) => {
    if (isMachineUnavailable(machine.status)) return null;
    const slots = getSlotsForMachine(machine);
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const currentFree = slots.find(
      s =>
        s.state === "current" &&
        isRangeAvailable(machine, s.start, s.end) &&
        s.end.getTime() - currentTime.getTime() >= THIRTY_MIN_MS
    );
    if (currentFree) return currentTime;
    const durationMinutes = current?.booking_slot_minutes || machine.programs.reduce(
      (max, program) => Math.max(max, program.duration_minutes || 0),
      120
    );
    return findNextAvailableSlot(machine, durationMinutes);
  };

  // Szuka najwcześniejszego wolnego slotu spośród WSZYSTKICH pralek na terytorium.
  // Sortuje po czasie, a przy remisie — po numerze pralki (mniejszy numer = priorytet).
  const handleFindNearestAcrossMachines = () => {
    if (!current) return;
    if (bookingLimitReached) {
      setError(t("bookingLimitReachedLong"));
      setHighlightedMachineId(null);
      return;
    }

    const candidates = current.zones.flatMap(zone =>
      zone.machines
        .map(machine => ({ machine, slot: findNearestSlotForMachine(machine), zoneId: String(zone.id), zoneName: zone.name }))
        .filter((item): item is { machine: Machine; slot: Date; zoneId: string; zoneName: string } => item.slot !== null)
    );

    candidates.sort((a, b) => {
      const byTime = a.slot.getTime() - b.slot.getTime();
      if (byTime !== 0) return byTime;
      return a.machine.number - b.machine.number;
    });

    const best = candidates[0];
    if (!best) {
      setError(t("bookingNoSlots"));
      setHighlightedMachineId(null);
      return;
    }

    setExpandedZones(prev => ({ ...prev, [best.zoneId]: true }));
    setHighlightedMachineId(String(best.machine.id));
    setError(null);
    setInfo(
      t("nearestFreeSlotZoneInfo")
        .replace("{machine}", String(best.machine.number).padStart(2, "0"))
        .replace("{zone}", best.zoneName)
        .replace("{time}", formatTimeLabel(best.slot))
    );
  };

  const validateSelection = (machine: Machine | undefined, program: Program | undefined, start: Date | null) => {
    if (!machine) return t("bookingErrorMachineNotFound");
    if (!program) return t("bookingErrorProgram");
    if (!start) return t("bookingErrorStart");
    if (!isSameDay(start, selectedDayStart)) return t("bookingSelectedDayOnly");
    const slots = getSlotsForMachine(machine);
    const selectedSlot = slots.find(slot => slot.start.getTime() === start.getTime()) || null;
    const coveredSlots = selectedSlot ? getCoveredSlotsForProgram(slots, selectedSlot, program.duration_minutes) : null;
    const existing = (machine.bookings || []).find(
      b => b.status === "active" && b.user?.id === currentUserId && isSameDay(new Date(b.start_time), start)
    );
    if (existing) return t("bookingErrorAlreadyBooked");
    if (bookingLimitReached) {
      return t("bookingLimitReachedLong");
    }
    if (!selectedSlot || selectedSlot.state === "past" || selectedSlot.state === "current") return t("bookingErrorFuture");
    if (!coveredSlots) return t("bookingNoSlots");
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
    if (bookingLimitReached) {
      setError(t("bookingLimitReachedLong"));
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
    const slots = getSlotsForMachine(machine);
    const selectedSlot = slots.find(slot => slot.start.getTime() === startCandidate.getTime()) || null;
    const coveredSlots = selectedSlot ? getCoveredSlotsForProgram(slots, selectedSlot, program.duration_minutes) : null;
    const endSlot = coveredSlots?.[coveredSlots.length - 1]?.end || addMinutes(startCandidate, LONG_SLOT_MINUTES);
    const endRaw = endSlot;
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
        end_time: pendingBooking.endSlot.toISOString(),
        client_timezone_offset: pendingBooking.start.getTimezoneOffset()
      });
      setInfo(t("bookingSuccess"));
      setPendingBooking(null);
      setSelectedProgram("");
      const bookings = await loadBookings(selectedMachineId);
      applyBookings(selectedMachineId, bookings);
    } catch (err: unknown) {
      setError(extractApiError(err, t("bookingErrorGeneric")));
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelectedSlot = async (
    machine: Machine,
    start: Date,
    slotMinutes = SHORT_SLOT_MINUTES,
    program: Program | null = null
  ) => {
    if (bookingLimitReached) {
      setError(t("bookingLimitReachedLong"));
      return;
    }
    const end = addMinutes(start, slotMinutes);
    if (!isRangeAvailable(machine, start, end)) {
      setError(t("bookingErrorOverlap"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await apiClient.post<{ id: number }>("territories/bookings/", {
        machine: machine.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        client_timezone_offset: start.getTimezoneOffset(),
        selected_program_name: program?.name || "",
        selected_program_duration_minutes: program?.duration_minutes || null
      });
      setPendingBooking(null);
      setBookingConfirmation(null);
      window.history.pushState({}, "", `/bookings?booking=${created.data.id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err: unknown) {
      setError(extractApiError(err, t("bookingErrorGeneric")));
    } finally {
      setLoading(false);
    }
  };

  if (!territories.length && territoriesLoading) {
    return (
      <div className="flex justify-center py-10">
        <InlineMachine />
      </div>
    );
  }

  if (!territories.length && !territoriesLoading) {
    return null;
  }

  if (!current) {
    return null;
  }

  const getMachineUiStatus = (machine: Machine): MachineUiStatus => {
    if (machine.status === "broken") return "broken";
    if (isMachineUnavailable(machine.status)) return "inactive";
    const userHasBooking = (machine.bookings || []).some(b =>
      b.status === "active" &&
      b.user?.id === currentUserId &&
      isSameDay(new Date(b.start_time), selectedDayStart) &&
      new Date(b.end_time) > currentTime
    );
    if (userHasBooking) return "user_booking";
    if (isSameDay(selectedDayStart, startOfToday())) {
      const now = currentTime;
      const occupied = (machine.bookings || []).some(b => {
        if (b.status !== "active") return false;
        const s = new Date(b.start_time);
        const e = new Date(b.end_time);
        return s <= now && e >= now;
      });
      if (occupied) return "occupied";
    }
    return "free_now";
  };

  const getMachineStatusMeta = (status: MachineUiStatus): { drum: string; badge: string; label: string } => {
    switch (status) {
      case "free_now":    return { drum: "#22c55e", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800", label: t("machineCardFreeNow") };
      case "occupied":   return { drum: "#f59e0b", badge: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800", label: t("machineCardOccupied") };
      case "broken":     return { drum: "#ef4444", badge: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800", label: t("machineCardBroken") };
      case "inactive":   return { drum: "#9ca3af", badge: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700", label: t("machineCardInactive") };
      case "user_booking": return { drum: "#3b82f6", badge: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800", label: t("machineCardUserBooking") };
    }
  };

  const getNextFreeSlot = (machine: Machine): { start: Date; end: Date } | null => {
    const slot = getSlotsForMachine(machine).find(s => s.state === "free");
    return slot ? { start: slot.start, end: slot.end } : null;
  };

  const getZoneDisplayName = (zone?: Zone) => {
    if (!zone) return t("territoryZoneLabel");
    const baseName = (zone.name || `${t("territoryZoneLabel")} ${zone.id}`).trim();
    const description = zone.description?.trim();
    if (!description || baseName.includes(description)) return baseName;
    return `${baseName} (${description})`;
  };

  const openBookingInMyBookings = (bookingId: number) => {
    window.history.pushState({}, "", `/bookings?booking=${bookingId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const getMyZoneBookingsForSelectedDay = (zone: Zone) =>
    zone.machines
      .flatMap(machine =>
        getActiveBookingsForMachine(machine).map(booking => ({ booking, machine }))
      )
      .filter(({ booking }) => {
        const start = new Date(booking.start_time);
        return (
          booking.user?.id === currentUserId &&
          booking.status === "active" &&
          start >= selectedDayStart &&
          start < selectedDayEnd
        );
      })
      .sort((a, b) => new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime());

  const renderMachineCard = (machine: Machine, asHeader = false) => {
    const status = getMachineUiStatus(machine);
    const meta = getMachineStatusMeta(status);
    const nextFree = getNextFreeSlot(machine);
    const unavailable = status === "broken" || status === "inactive";

    const userBooking = status === "user_booking"
      ? (machine.bookings || []).find(b => b.status === "active" && b.user?.id === currentUserId && isSameDay(new Date(b.start_time), selectedDayStart))
      : null;

    const availabilityInfo = unavailable || status === "user_booking"
      ? null
      : status === "free_now"
      ? { label: t("machineCurrentSlotEnd").replace("{time}", nextFree ? formatTimeLabel(nextFree.end) : ""), valueClass: "text-emerald-600 dark:text-emerald-300" }
      : nextFree
      ? { label: t("machineNextFreeAt").replace("{time}", formatTimeLabel(nextFree.start)), valueClass: "text-orange-600 dark:text-orange-300" }
      : null;

    const handleCardClick = () => {
      if (asHeader) return;
      if (unavailable) return;
      if (status === "user_booking") { void handleSelectMachine(machine.id); return; }
      if (!bookingLimitReached) void handleSelectMachine(machine.id);
    };

    const ctaLabel = bookingLimitReached && status !== "user_booking"
      ? t("bookingLimitReachedShort")
      : unavailable
      ? t("actionUnavailable")
      : status === "occupied" && nextFree
      ? t("actionBookFor").replace("{time}", formatTimeLabel(nextFree.start))
      : t("actionBookNow");

    const ctaClass = unavailable
      ? "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-500"
      : bookingLimitReached && status !== "user_booking"
      ? "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-500"
      : status === "occupied"
      ? "border border-blue-600 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-950/30"
      : "bg-blue-600 text-white shadow-sm hover:bg-blue-700";

    return (
      <div
        id={`machine-card-${machine.id}`}
        key={machine.id}
        className={`relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
          asHeader
            ? ""
            : highlightedMachineId === String(machine.id)
            ? "cursor-pointer border-emerald-400 animate-pulse shadow-[0_0_0_2px_rgba(16,185,129,0.4),0_0_24px_rgba(16,185,129,0.6),0_0_48px_rgba(16,185,129,0.3)] dark:border-emerald-400 dark:shadow-[0_0_0_2px_rgba(52,211,153,0.5),0_0_28px_rgba(52,211,153,0.7),0_0_56px_rgba(16,185,129,0.4)]"
            : unavailable
            ? "opacity-70"
            : bookingLimitReached && status !== "user_booking"
            ? "cursor-not-allowed opacity-80"
            : "cursor-pointer transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800"
        }`}
        onClick={handleCardClick}
      >
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4">
            <InlineMachine size={78} drumColor={meta.drum} className="drop-shadow-md" />
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-slate-950 dark:text-white">
                {t("machineLabel")} #{String(machine.number).padStart(2, "0")}
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-gray-400">
                {machine.model_name || t("washerFallback")}
              </div>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}>
                {meta.label}
              </span>
              {userBooking && (
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <Clock3 size={13} className="shrink-0 text-blue-400 dark:text-blue-500" />
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {formatTimeLabel(new Date(userBooking.start_time))} – {formatTimeLabel(new Date(userBooking.end_time))}
                  </span>
                </div>
              )}
              {availabilityInfo && (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  <Clock3 size={13} className="shrink-0 text-slate-400 dark:text-gray-500" />
                  <span className={`font-semibold ${availabilityInfo.valueClass}`}>
                    {availabilityInfo.label}
                  </span>
                </div>
              )}
              {unavailable && (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  <Wrench size={13} className="shrink-0 text-slate-400 dark:text-gray-500" />
                  <span className="font-semibold text-slate-500 dark:text-gray-400">{meta.label}</span>
                </div>
              )}
            </div>
          </div>

          {!asHeader && status === "user_booking" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  openBookingInMyBookings(userBooking?.id ?? 0);
                }}
                className="h-10 flex-1 rounded-md border border-blue-600 bg-white text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-950/30"
              >
                {t("actionManageBooking")}
              </button>
              <button
                onClick={e => { e.stopPropagation(); void handleSelectMachine(machine.id); }}
                className="h-10 flex-1 rounded-md bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {t("actionReserveAnother")}
              </button>
            </div>
          )}

          {!asHeader && status !== "user_booking" && (
            <button
              onClick={e => { e.stopPropagation(); handleCardClick(); }}
              disabled={unavailable || bookingLimitReached}
              className={`mt-2 h-10 w-full rounded-md text-sm font-semibold transition ${ctaClass}`}
            >
              {ctaLabel}
            </button>
          )}

        </div>
      </div>
    );
  };

  const selectedMachine = selectedMachineId
    ? machineWithBookings[selectedMachineId] || machineIndex[selectedMachineId]?.machine
    : null;

  if (selectedMachineId && selectedMachine) {
    const machine = selectedMachine;
    const activeBookings = getActiveBookingsForMachine(machine).filter(booking => {
      const start = new Date(booking.start_time);
      return start >= selectedDayStart && start < selectedDayEnd;
    });
    const status = getMachineUiStatus(machine);
    const selectedProgramForRecommendation =
      machine.programs.find(program => program.name === selectedProgram) || null;
    const requiredBookingMinutes = selectedProgramForRecommendation?.duration_minutes || 0;
    const selectedEntry = machineIndex[String(machine.id)];
    const selectedZone = current.zones.find(zone => String(zone.id) === selectedEntry?.zoneId);
    const allSlots = getSlotsForMachine(machine);
    const getCoveredSlotsForSlot = (slot: BookingSlot) =>
      getCoveredSlotsForProgram(allSlots, slot, requiredBookingMinutes);
    const isSlotSelectable = (slot: BookingSlot) => getCoveredSlotsForSlot(slot) !== null;
    const selectableSlots = allSlots.filter(isSlotSelectable);
    const coveredSlotStarts = new Set<number>();
    const selectedAvailableSlot =
      startCandidate &&
      isSameDay(startCandidate, selectedDayStart) &&
      selectableSlots.some(slot => slot.start.getTime() === startCandidate.getTime())
        ? startCandidate
        : selectableSlots[0]?.start || null;
    const selectedSlotInfo = selectedAvailableSlot
      ? allSlots.find(slot => slot.start.getTime() === selectedAvailableSlot.getTime()) || null
      : null;
    const selectedCoveredSlots = selectedSlotInfo ? getCoveredSlotsForSlot(selectedSlotInfo) : null;
    const selectedAvailableSlotEnd = selectedCoveredSlots?.[selectedCoveredSlots.length - 1]?.end || null;
    if (selectedCoveredSlots) {
      selectedCoveredSlots.forEach(slot => coveredSlotStarts.add(slot.start.getTime()));
    }
    const recommendationText = selectedProgramForRecommendation
      ? selectedCoveredSlots
        ? selectedCoveredSlots.length === 1
          ? t("bookingRecommendationSingle")
              .replace("{programName}", selectedProgramForRecommendation.name)
              .replace("{duration}", formatDurationLabel(requiredBookingMinutes))
              .replace("{hours}", String((selectedCoveredSlots[0]?.duration || SHORT_SLOT_MINUTES) / 60))
          : t("bookingRecommendationMultiple")
              .replace("{programName}", selectedProgramForRecommendation.name)
              .replace("{duration}", formatDurationLabel(requiredBookingMinutes))
        : t("bookingRecommendationNoSlots").replace("{duration}", formatDurationLabel(requiredBookingMinutes))
      : t("bookingProgramHelper");
    const currentDateLabel = selectedDayOffset === 0 ? t("dayToday") : selectedDayOffset === 1 ? t("dayTomorrow") : t("dayInTwoDays");
    const locationLabel = getZoneDisplayName(selectedZone);
    const statusMeta = getMachineStatusMeta(status);
    const machineStatusLabel = statusMeta.label;
    const machineStatusBadgeClass = statusMeta.badge;
    const promptForProgramSelection = () => {
      setError(t("bookingProgramRequiredForReservation"));
      setProgramPromptActive(true);
      programSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setProgramPromptActive(false), 1600);
    };
    const openBookingConfirmation = () => {
      if (!selectedProgramForRecommendation) {
        promptForProgramSelection();
        return;
      }
      if (!selectedAvailableSlot || !selectedAvailableSlotEnd || !selectedCoveredSlots) return;
      setBookingConfirmation({
        machine,
        start: selectedAvailableSlot,
        end: selectedAvailableSlotEnd,
        location: locationLabel,
        program: selectedProgramForRecommendation,
        slots: selectedCoveredSlots
      });
      setError(null);
      setInfo(null);
    };

    return (
      <>
      <div className="space-y-6">
        {bookingConfirmation && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-slate-950/35 px-4 py-6 backdrop-blur-sm dark:bg-black/55">
            <div className="my-auto max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{t("confirmBookingTitle")}</h2>
                  <p className="mt-3 text-base font-medium text-slate-600 dark:text-gray-300">
                    {t("confirmBookingSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingConfirmation(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  aria-label={t("closeConfirmation")}
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-gray-800">
                {[
                  {
                    icon: WashingMachine,
                    label: t("machineLabel"),
                    value: `${t("machineLabel")} #${String(bookingConfirmation.machine.number).padStart(2, "0")}`
                  },
                  { icon: MapPin, label: t("locationLabel"), value: bookingConfirmation.location },
                  {
                    icon: CalendarDays,
                    label: t("dateLabel"),
                    value: `${currentDateLabel}, ${formatDateLabel(bookingConfirmation.start, lang)}`
                  },
                  {
                    icon: Timer,
                    label: t("bookingSelectProgram"),
                    value: bookingConfirmation.program
                      ? `${bookingConfirmation.program.name} · ${formatDurationLabel(bookingConfirmation.program.duration_minutes)}`
                      : t("programNotSelected")
                  }
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(150px,auto)] items-center gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 dark:border-gray-800"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon size={21} className="shrink-0 text-slate-500 dark:text-gray-400" />
                      <span className="font-bold text-slate-700 dark:text-gray-200">{label}</span>
                    </div>
                    <div className="text-right font-bold text-slate-950 dark:text-white">{value}</div>
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,auto)] items-start gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 dark:border-gray-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <Clock3 size={21} className="shrink-0 text-slate-500 dark:text-gray-400" />
                    <span className="font-bold text-slate-700 dark:text-gray-200">{t("timeLabel")}</span>
                  </div>
                  <div className="text-right font-bold text-slate-950 dark:text-white">
                    {bookingConfirmation.slots
                      .map(slot => `${formatTimeLabel(slot.start)}-${formatTimeLabel(slot.end)}`)
                      .join(", ")}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
                <div className="flex items-center gap-2 text-base font-bold">
                  <Info size={20} />
                  <span>{t("important")}</span>
                </div>
                <p className="mt-3 text-sm font-medium leading-6">
                  {t("confirmationImportantText")}
                </p>
                <p className="mt-3 text-sm font-medium leading-6">
                  {t("confirmationProgramText")}
                </p>
              </div>

              {error && <div className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{error}</div>}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBookingConfirmation(null)}
                  className="h-12 rounded-md border border-slate-200 bg-white text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-950 dark:text-blue-300 dark:hover:bg-blue-950/30"
                >
                  {t("back")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleBookSelectedSlot(
                      bookingConfirmation.machine,
                      bookingConfirmation.start,
                      Math.round((bookingConfirmation.end.getTime() - bookingConfirmation.start.getTime()) / 60000),
                      bookingConfirmation.program
                    )
                  }
                  disabled={loading}
                  className="h-12 rounded-md bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                >
                  {loading ? t("confirming") : t("confirmBooking")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center">
          <button
            onClick={() => handleBackToList()}
            className="inline-flex items-center gap-2 rounded-md px-1 py-2 text-sm font-bold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <span aria-hidden="true">&lt;</span>
            {t("backToMachines")}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
              {t("machineBookingTitle")}
            </h1>
            <div className="text-sm font-semibold text-slate-500 dark:text-gray-400 sm:pt-3 sm:text-right">
              <span>{formatDateLabel(currentTime, lang)}</span>
              <span className="mx-2 text-slate-300 dark:text-gray-700">|</span>
              <span>{formatTimeLabel(currentTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <InlineMachine size={112} drumColor={statusMeta.drum} className="drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-2xl font-bold text-slate-950 dark:text-white">
                  {t("machineLabel")} #{String(machine.number).padStart(2, "0")}
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${machineStatusBadgeClass}`}>
                  {machineStatusLabel}
                </span>
              </div>
              <div className="mt-2 text-base font-semibold text-slate-600 dark:text-gray-300">
                {locationLabel}
              </div>
              <div className="mt-2 text-base text-slate-600 dark:text-gray-400">
                {machine.model_name || t("washerFallback")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.85fr)]">
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-lg border border-blue-100 bg-blue-50/70 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-300">
                <CalendarDays size={25} />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{t("selectedDate")}</div>
                <div className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {currentDateLabel}, {formatDateLabel(selectedDayStart, lang)}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-7">
              <p className="text-base font-medium text-slate-700 dark:text-gray-300">
                {t("canBookSlots")}
              </p>

              <div
                ref={programSelectorRef}
                className={`mt-6 rounded-lg border bg-slate-50 p-4 transition dark:bg-gray-950/60 ${
                  programPromptActive
                    ? "border-blue-500 shadow-[0_0_0_3px_rgba(37,99,235,0.16)] dark:border-blue-500"
                    : "border-slate-100 dark:border-gray-800"
                }`}
              >
                <div className="text-sm font-bold text-slate-950 dark:text-white">{t("bookingSelectProgram")}</div>
                <div className="mt-3">
                  <select
                    value={selectedProgram}
                    onChange={event => {
                      setSelectedProgram(event.target.value);
                      setStartCandidate(null);
                      setPendingBooking(null);
                      setError(null);
                      setInfo(null);
                    }}
                    className="h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">{t("bookingSelectProgramPlaceholder")}</option>
                    {machine.programs.map(program => (
                      <option key={program.name} value={program.name}>
                        {program.name} · {formatDurationLabel(program.duration_minutes)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    {selectedProgramForRecommendation
                      ? `${selectedProgramForRecommendation.name}: ${formatDurationLabel(selectedProgramForRecommendation.duration_minutes)}`
                      : t("bookingProgramFirst")}
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-600 dark:text-gray-300">
                  {recommendationText}
                </div>
              </div>

              <div className="mt-7">
                <div className="text-lg font-bold text-slate-950 dark:text-white">{t("availableSlots")}</div>
                {allSlots.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    {t("noFreeSlotsSelectedDay")}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allSlots.map(slot => {
                      const active = selectedAvailableSlot?.getTime() === slot.start.getTime();
                      const covered = coveredSlotStarts.has(slot.start.getTime());
                      const selectable = isSlotSelectable(slot);
                      const needsProgram = !selectedProgramForRecommendation && slot.state === "free";
                      const disabled = selectedProgramForRecommendation ? !selectable : slot.state !== "free";
                      const stateClass =
                        slot.state === "past"
                          ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"
                          : slot.state === "current"
                          ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200"
                          : slot.state === "booked"
                          ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
                          : covered
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.14)] dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-200"
                          : active
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(37,99,235,0.14)] dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200";
                      return (
                        <button
                          key={`${slot.start.toISOString()}-${slot.duration}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (needsProgram) {
                              promptForProgramSelection();
                              return;
                            }
                            setStartCandidate(slot.start);
                            setPendingBooking(null);
                            setError(null);
                            setInfo(null);
                          }}
                          className={`h-16 rounded-md border text-base font-bold transition disabled:cursor-not-allowed ${stateClass}`}
                        >
                          <span className="block">{formatTimeLabel(slot.start)}-{formatTimeLabel(slot.end)}</span>
                          <span className="block text-xs font-semibold capitalize">
                            {slot.state === "past"
                              ? t("slotPast")
                              : slot.state === "current"
                              ? t("slotNow")
                              : slot.state === "booked"
                              ? t("slotBooked")
                              : t("slotFree").replace("{duration}", formatDurationLabel(slot.duration))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedAvailableSlot && selectedAvailableSlotEnd && (
                <div className="mt-7 text-base font-bold text-slate-950 dark:text-white">
                  {t("selectedSlot")}{" "}
                  <span className="text-blue-700 dark:text-blue-300">
                    {selectedCoveredSlots
                      ?.map(slot => `${formatTimeLabel(slot.start)}-${formatTimeLabel(slot.end)}`)
                      .join(", ")}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={openBookingConfirmation}
                disabled={loading || bookingLimitReached || status === "broken" || status === "inactive" || (!!selectedProgramForRecommendation && (!selectedAvailableSlot || !selectedCoveredSlots))}
                aria-disabled={!selectedProgramForRecommendation || !selectedAvailableSlot || !selectedCoveredSlots || loading || bookingLimitReached || status === "broken" || status === "inactive"}
                className="mt-7 h-14 w-full rounded-md bg-blue-600 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              >
                {bookingLimitReached ? t("bookingLimitReachedShort") : t("bookSelectedSlot")}
              </button>

              {bookingLimitReached && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {t("bookingLimitReachedLong")}
                </div>
              )}

              {error && <div className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{error}</div>}
              {info && <div className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{info}</div>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-base font-bold text-slate-950 dark:text-white">{t("bookingListTitle")}</div>
              {activeBookings.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {activeBookings.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-gray-100">
                          {formatTimeLabel(new Date(b.start_time))} - {formatTimeLabel(new Date(b.end_time))}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">
                          {formatDateLabel(new Date(b.start_time), lang)}
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-slate-600 dark:text-gray-300">
                        {formatUserTag(b.user, t("userTagFallback"))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-slate-100 px-3 py-3 text-sm font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-400">
                  {t("noBookingsForWasherDay")}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{t("rules")}</h2>
              <ul className="mt-6 space-y-4 text-base font-medium leading-relaxed text-slate-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-gray-200" />
                  <span>{t("ruleChooseProgram")}</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-gray-200" />
                  <span>{t("ruleMultipleSlots")}</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-gray-200" />
                  <span>{t("ruleReportOccupied")}</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-gray-200" />
                  <span>{t("ruleConfirmArrival")}</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setReportTarget({
                territoryId: Number(selectedEntry?.territoryId ?? current?.id ?? 0),
                machineId: Number(machine.id),
                zoneId: selectedEntry ? Number(selectedEntry.zoneId) : 0,
                machineLabel: `${t("machineLabel")} #${String(machine.number).padStart(2, "0")}`,
              })}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-red-800 dark:hover:text-red-400"
            >
              {t("problemReportTitle")}
            </button>

          </div>
        </div>
      </div>

      {reportTarget && (
        <ProblemReportModal
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          territoryId={reportTarget.territoryId}
          zoneId={reportTarget.zoneId}
          machineId={reportTarget.machineId}
          machineLabel={reportTarget.machineLabel}
        />
      )}
      </>
    );
  }

  const quickDateFormatter = new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" });
  const quickDates = [
    { title: t("dayToday"), date: currentTime },
    { title: t("dayTomorrow"), date: addMinutes(currentTime, 24 * 60) },
    {
      title: t("dayInTwoDays"),
      date: addMinutes(currentTime, 48 * 60)
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
            {t("laundryBookingTitle")}
          </h1>
          <div className="mt-4 flex flex-col gap-3 text-base font-semibold text-slate-600 dark:text-gray-300 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0" ref={selectorRef}>
              <button
                className="flex max-w-full items-center gap-2 text-left transition hover:text-blue-700 dark:hover:text-blue-200"
                onClick={() => setTerritoryMenuOpen(prev => !prev)}
                type="button"
              >
                <MapPinned size={22} className="shrink-0 text-blue-600" />
                <span className="shrink-0">{t("territoryLabel")}</span>
                <span className="min-w-0 truncate text-blue-700 dark:text-blue-300">{current.name}</span>
              </button>
              {territoryMenuOpen && (
                <div className="absolute left-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400">{t("yourTerritories")}</div>
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {territories.map(terr => (
                      <button
                        key={terr.id}
                        className={`w-full px-3 py-3 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/30 ${
                          terr.id === current.id ? "bg-blue-50 dark:bg-blue-950/30" : ""
                        }`}
                        onClick={() => handlePickTerritory(terr)}
                        type="button"
                      >
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">{terr.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="hidden h-6 w-px bg-slate-300 dark:bg-gray-700 sm:block" />
            <p className="text-slate-600 dark:text-gray-300">{t("dashboardSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex h-full min-h-[148px] flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="text-sm font-bold text-slate-950 dark:text-white">{t("selectDay")}</div>
            <span className="group relative inline-flex cursor-help items-center gap-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${
                bookingLimitReached
                  ? "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800"
                  : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
              }`}>
                {t("bookingLimitUsed").replace("{used}", String(userActiveBookingsCount))}
              </span>
              <span className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-600 shadow-lg group-hover:block dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {t("bookingLimitInfo")}
              </span>
            </span>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            {quickDates.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => handleSelectDay(index)}
                className={`flex min-h-[68px] items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition ${
                  selectedDayOffset === index
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-800"
                }`}
              >
                <span>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-slate-500 dark:text-gray-400">
                    {quickDateFormatter.format(item.date)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="flex h-full min-h-[148px] flex-col rounded-lg border border-emerald-200 bg-white p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_12px_30px_rgba(16,185,129,0.16)] dark:border-emerald-800/80 dark:bg-gray-900 dark:shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_0_28px_rgba(16,185,129,0.3)]">
          <div className="text-sm font-bold text-slate-950 dark:text-white">{t("findNearestFreeSlot")}</div>
          <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-gray-300">
            {t("findNearestFreeSlotDescription")}
          </p>
          <button
            type="button"
            onClick={handleFindNearestAcrossMachines}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/60"
          >
            <Search size={18} />
            <span>{t("findNearestFreeSlot")}</span>
          </button>
        </section>
      </div>

      <div className="space-y-3">
        {current.zones.map(zone => {
          const isZoneOpen = expandedZones[String(zone.id)] === true;
          const zoneMyBookings = getMyZoneBookingsForSelectedDay(zone);
          return (
            <section key={zone.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <button
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left"
                onClick={() => toggleZone(zone.id)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span className="text-slate-950 dark:text-white">
                    <Chevron open={isZoneOpen} />
                  </span>
                  <span className="truncate text-lg font-bold text-slate-950 dark:text-white">
                    {getZoneDisplayName(zone)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {!isZoneOpen && (
                  <span className="shrink-0 flex items-center gap-2">
                    {zoneMyBookings.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {t("machineCardUserBooking")} ✓
                      </span>
                    )}
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {zone.machines.length} {zone.machines.length === 1 ? t("machineSingular") : t("machinePlural")}
                    </span>
                  </span>
                  )}
                </span>
              </button>
              {isZoneOpen && (
                <div className="grid gap-4 border-t border-slate-100 p-4 dark:border-gray-800 sm:grid-cols-2 xl:grid-cols-4">
                  {zone.machines.map(machine => renderMachineCard(machine))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {reportTarget && (
        <ProblemReportModal
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          territoryId={reportTarget.territoryId}
          zoneId={reportTarget.zoneId}
          machineId={reportTarget.machineId}
          machineLabel={reportTarget.machineLabel}
        />
      )}
    </div>
  );
}
