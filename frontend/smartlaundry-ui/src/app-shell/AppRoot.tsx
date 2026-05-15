import { useEffect, useRef, useState } from "react";
import { InlineMachine, FullscreenLoader } from "../ui-kit/WashingMachineLoader";
import { ThemeToggle } from "../ui-kit/ThemeToggle";
import { LanguageSelector } from "../ui-kit/LanguageSelector";
import { AuthPortal } from "../features/auth-flow/AuthPortal";
import { useI18n } from "./i18n-context";
import { useTheme } from "./theme-context";
import { AccountMenu } from "../features/account/AccountMenu";
import { TerritoryFormModal, type Territory as TerritoryFormValue } from "../features/account/TerritoryFormModal";
import { AdminUserItem, UserInfo, UserRole } from "../shared/auth-types";
import { UserTerritoryView } from "../features/territories/UserTerritoryView";
import { apiClient } from "../shared/apiClient";
import { ModalShell } from "../ui-kit/ModalShell";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Home,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X
} from "lucide-react";

type AuthMode = "signin" | "signup" | "reset";
type LaundryNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  booking?: number | null;
  territory_id?: number | null;
};
type UserBooking = {
  id: number;
  machine: string | number;
  machine_number?: number;
  machine_model?: string;
  zone_name?: string;
  zone_description?: string;
  territory_name?: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  selected_program_name?: string;
  selected_program_duration_minutes?: number | null;
  confirmed_at?: string | null;
  wash_started_at?: string | null;
  estimated_wash_end_at?: string | null;
  user?: { id: number; email: string; role?: UserRole };
};

type AdminMachine = {
  id: string | number;
  number: number;
  model_name: string;
  status: string;
  programs?: { name: string; duration_minutes: number }[];
  active_reservations_count?: number;
  current_reservations_count?: number;
};

type AdminZone = {
  id: string | number;
  name: string;
  description?: string;
  machines: AdminMachine[];
};

type AdminTerritory = {
  id: number | string;
  name: string;
  code: string;
  slot_strategy?: "auto" | "fixed_120";
  booking_slot_minutes?: number;
  active_users_count?: number;
  current_reservations_count?: number;
  created_by_email?: string | null;
  active_invite_code?: { code: string; expires_at: string; id: number } | null;
  users?: AdminTerritoryUser[];
  reservations?: UserBooking[];
  zones: AdminZone[];
};

type AdminTerritoryUser = {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
  is_active: boolean;
  blocked: boolean;
  active_reservations: number;
  last_activity?: string;
};

type TerritoryProblemReport = {
  id: number;
  type: string;
  description: string;
  status: string;
  zone_name: string | null;
  machine_number: number | null;
  reported_by_id: number;
  created_at: string;
  resolved_at: string | null;
};

const buildMachineFaviconHref = (isDark: boolean, hasUnreadNotifications: boolean) => {
  const bodyFill = isDark ? "#374151" : "#f3f4f6";
  const bodyStroke = isDark ? "#4b5563" : "#d1d5db";
  const panelFill = isDark ? "#1f2937" : "#e5e7eb";
  const ringStroke = isDark ? "#4b5563" : "#9ca3af";
  const glassFill = isDark ? "#111827" : "#ffffff";
  const drumStroke = isDark ? "#6b7280" : "#9ca3af";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <rect x="10" y="20" width="100" height="94" rx="8" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="2"/>
      <rect x="15" y="25" width="90" height="15" rx="4" fill="${panelFill}"/>
      <circle cx="25" cy="32" r="3" fill="#2563eb"/>
      <circle cx="35" cy="32" r="3" fill="#10b981"/>
      <circle cx="45" cy="32" r="3" fill="#f59e0b"/>
      <circle cx="60" cy="75" r="30" fill="none" stroke="${ringStroke}" stroke-width="3"/>
      <circle cx="60" cy="75" r="26" fill="${glassFill}" opacity="0.9"/>
      <circle cx="60" cy="75" r="20" fill="none" stroke="${drumStroke}" stroke-width="1"/>
      <g stroke="${drumStroke}" stroke-width="2" stroke-linecap="round">
        <line x1="75" y1="75" x2="80" y2="75"/>
        <line x1="67.5" y1="88" x2="70" y2="92.3"/>
        <line x1="52.5" y1="88" x2="50" y2="92.3"/>
        <line x1="45" y1="75" x2="40" y2="75"/>
        <line x1="52.5" y1="62" x2="50" y2="57.7"/>
        <line x1="67.5" y1="62" x2="70" y2="57.7"/>
      </g>
      ${
        hasUnreadNotifications
          ? `<circle cx="92" cy="28" r="16" fill="#ef4444" stroke="${isDark ? "#111827" : "#ffffff"}" stroke-width="5"/>`
          : ""
      }
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export function AppRoot() {
  const [authChecked, setAuthChecked] = useState(() => !window.localStorage.getItem("sl_access"));
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [resetEmail, setResetEmail] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [currentTerritoryId, setCurrentTerritoryId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<LaundryNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [bookingFilterTerritory, setBookingFilterTerritory] = useState("");
  const [bookingFilterUser, setBookingFilterUser] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [adminTerritories, setAdminTerritories] = useState<AdminTerritory[]>([]);
  const [adminTerritoriesLoading, setAdminTerritoriesLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [problemReports, setProblemReports] = useState<Record<string, TerritoryProblemReport[]>>({});
  const [problemReportsLoading, setProblemReportsLoading] = useState<Record<string, boolean>>({});
  const [inviteCodeGenerating, setInviteCodeGenerating] = useState<Record<string, boolean>>({});
  const [inviteCodeCopied, setInviteCodeCopied] = useState<Record<string, boolean>>({});
  const [expandedTerritories, setExpandedTerritories] = useState<Record<string, boolean>>({});
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [expandedTerritoryUsers, setExpandedTerritoryUsers] = useState<Record<string, boolean>>({});
  const [expandedMachineReports, setExpandedMachineReports] = useState<Record<string, boolean>>({});
  const [resolvingReportId, setResolvingReportId] = useState<number | null>(null);
  const [territoryModalOpen, setTerritoryModalOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<TerritoryFormValue | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [userTerritoriesCount, setUserTerritoriesCount] = useState<number | null>(null);
  const [territoriesPageList, setTerritoriesPageList] = useState<Array<{ territory: { id: number; name: string; code: string }; added_at: string }>>([]);
  const [territoriesPageLoading, setTerritoriesPageLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<string | null>(null);
  const [leaveTerritoryConfirm, setLeaveTerritoryConfirm] = useState<{ id: number; name: string } | null>(null);
  const [leavingTerritoryId, setLeavingTerritoryId] = useState<number | null>(null);
  const [, setNavigationTick] = useState(0);
  const { t, lang } = useI18n();
  const { theme } = useTheme();
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      document.head.appendChild(favicon);
    }
    favicon.href = buildMachineFaviconHref(isDark, unreadNotifications > 0);

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = isDark ? "#111827" : "#f3f4f6";
    }
  }, [isDark, unreadNotifications]);

  useEffect(() => {
    const access = window.localStorage.getItem("sl_access");
    if (!access) {
      window.localStorage.removeItem("sl_user_id");
      window.localStorage.removeItem("sl_user_email");
      window.localStorage.removeItem("sl_user_role");
      setAuthChecked(true);
      return;
    }
    apiClient
      .get("accounts/me/")
      .then(response => {
        const data = response.data as UserInfo;
        if (!data?.email) return;
        const role: UserRole =
          data.role === "admin" || data.role === "superadmin" ? data.role : "user";
        const user: UserInfo = {
          id: Number(data.id) || 0,
          email: data.email,
          role
        };
        setCurrentUser(user);
        window.localStorage.setItem("sl_user_id", String(user.id));
        window.localStorage.setItem("sl_user_email", user.email);
        window.localStorage.setItem("sl_user_role", user.role);
      })
      .catch(() => {
        window.localStorage.removeItem("sl_access");
        window.localStorage.removeItem("sl_refresh");
        window.localStorage.removeItem("sl_user_id");
        window.localStorage.removeItem("sl_user_email");
        window.localStorage.removeItem("sl_user_role");
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const isAuthenticated = currentUser !== null;
  const isAdminRole = currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isBookingsPage = currentPath === "/bookings";
  const isNotificationsPage = currentPath === "/notifications";
  const isTerritoriesPage = currentPath === "/territories";
  const isAdminUsersPage = currentPath === "/admin/users";
  const isAdminTerritoriesPage = currentPath === "/admin/territories";
  const isAdminTerritoryCreatePage = currentPath === "/admin/territories/new";
  const highlightedBookingId = isBookingsPage
    ? Number(new URLSearchParams(window.location.search).get("booking")) || null
    : null;
  const formatBookingTime = (value: string) =>
    new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formatBookingDate = (value: string) =>
    new Date(value).toLocaleDateString(lang, { month: "long", day: "numeric", year: "numeric" });
  const getBookingZoneLabel = (booking: UserBooking) => {
    const base = booking.zone_name || t("territoryFallback");
    const description = booking.zone_description?.trim();
    if (!description || base.includes(description)) return base;
    return `${base} (${description})`;
  };
  const formatUserLabel = (user?: { id: number; email: string }) =>
    user?.id ? `${t("adminTableUser")} #${user.id}` : t("adminTableUser");
  const getAdminZoneLabel = (zone: AdminZone) => {
    const description = zone.description?.trim();
    if (!description || zone.name.includes(description)) return zone.name;
    return `${zone.name} (${description})`;
  };

  const openSignIn = () => {
    setAuthMode("signin");
    setResetEmail(undefined);
    setAuthOpen(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setResetEmail(undefined);
    setAuthOpen(true);
  };

  const openResetFromProfile = () => {
    if (currentUser) {
      setResetEmail(currentUser.email);
    } else {
      setResetEmail(undefined);
    }
    setAuthMode("reset");
    setAuthOpen(true);
  };

  const returnFromPasswordReset = () => {
    if (!currentUser) {
      setAuthMode("signin");
      return;
    }

    setAuthOpen(false);
    setAuthMode("signin");
    setResetEmail(undefined);
    navigateTo(!isAdminRole && userTerritoriesCount === 0 ? "/territories" : "/");
  };

  const handleAuthSuccess = (user: UserInfo) => {
    setCurrentUser(user);
    window.localStorage.setItem("sl_user_id", String(user.id));
    window.localStorage.setItem("sl_user_email", user.email);
    window.localStorage.setItem("sl_user_role", user.role);
    setAuthOpen(false);
    if (user.role === "admin" || user.role === "superadmin") {
      navigateTo("/");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setNotifications([]);
    setUnreadNotifications(0);
    setNotificationsOpen(false);
    setShowAllNotifications(false);
    setBookings([]);
    setBookingsError(null);
    setAdminUsers([]);
    setAdminTerritories([]);
    setTerritoriesPageList([]);
    window.localStorage.removeItem("sl_access");
    window.localStorage.removeItem("sl_refresh");
    window.localStorage.removeItem("sl_user_id");
    window.localStorage.removeItem("sl_user_email");
    window.localStorage.removeItem("sl_user_role");
  };

  const loadNotifications = async (limit = 3) => {
    if (!currentUser) return;
    const response = await apiClient.get("territories/notifications/", {
      params: limit ? { limit } : undefined
    });
    setNotifications(Array.isArray(response.data?.results) ? response.data.results : []);
    setUnreadNotifications(Number(response.data?.unread_count) || 0);
  };

  const loadBookings = async () => {
    if (!currentUser) return;
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const response = await apiClient.get("territories/bookings/");
      const items = Array.isArray(response.data) ? response.data : [];
      setBookings(
        items.sort(
          (a: UserBooking, b: UserBooking) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      );
    } catch {
      setBookingsError(t("couldNotLoadBookings"));
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!isSuperAdmin) return;
    setAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const response = await apiClient.get("accounts/admin/users/");
      setAdminUsers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAdminUsersError(t("adminUsersLoadError"));
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadAdminTerritories = async () => {
    if (!isAdminRole) return;
    setAdminTerritoriesLoading(true);
    try {
      const response = await apiClient.get("territories/admin/dashboard/");
      setAdminTerritories(Array.isArray(response.data) ? response.data : []);
    } finally {
      setAdminTerritoriesLoading(false);
    }
  };

  const normalizeTerritoryForForm = (data: AdminTerritory | any): TerritoryFormValue => {
    const zonesArr = Array.isArray(data?.zones) ? data.zones : [];
    const machines: TerritoryFormValue["machines"] = [];
    const machinesPerZone: number[] = [];
    const zoneDescriptions: string[] = [];
    zonesArr.forEach((zone: any, zoneIndex: number) => {
      const zoneMachines = Array.isArray(zone?.machines) ? zone.machines : [];
      machinesPerZone[zoneIndex] = zoneMachines.length || 1;
      zoneDescriptions[zoneIndex] = zone?.description || "";
      zoneMachines.forEach((machine: any, machineIndex: number) => {
        const programs = Array.isArray(machine?.programs)
          ? machine.programs.map((program: any) => ({
              name: program?.name || "Program",
              duration_minutes: Number(program?.duration_minutes) || 0
            }))
          : [];
        machines.push({
          id: String(machine?.id || `${data?.id}-${zoneIndex}-${machineIndex}`),
          zoneIndex,
          number: Number(machine?.number) || machineIndex + 1,
          model: machine?.model_name || "",
          found: Boolean(machine?.instructions_found) || programs.length > 0,
          programs
        });
      });
    });
    return {
      id: String(data?.id || ""),
      name: data?.name || "",
      code: data?.code || "",
      slot_strategy: data?.slot_strategy === "fixed_120" ? "fixed_120" : "auto",
      booking_slot_minutes: Number(data?.booking_slot_minutes) || undefined,
      zones: zonesArr.length || 1,
      machinesPerZone: machinesPerZone.length ? machinesPerZone : [1],
      zoneDescriptions,
      machines
    };
  };

  const saveAdminTerritory = async (territory: TerritoryFormValue): Promise<string | null> => {
    const payload = {
      name: territory.name,
      slot_strategy: territory.slot_strategy || "auto",
      zones: Array.from({ length: territory.zones }).map((_, zoneIndex) => {
        const machines = territory.machines.filter(machine => machine.zoneIndex === zoneIndex);
        const description = territory.zoneDescriptions?.[zoneIndex] || "";
        return {
          name: `${t("territoryZoneLabel")} ${zoneIndex + 1}${description ? ` (${description})` : ""}`,
          description,
          order: zoneIndex,
          machines: machines.map(machine => ({
            number: machine.number,
            model_name: machine.model,
            instructions_found: machine.found,
            programs: machine.programs.map(program => ({
              name: program.name,
              duration_minutes: program.duration_minutes
            })),
            status: "available"
          }))
        };
      })
    };

    const isNew = territory.code === "" || territory.id.startsWith("terr-");
    try {
      const response = isNew
        ? await apiClient.post("territories/admin/", payload)
        : await apiClient.patch(`territories/admin/${territory.id}/`, payload);
      const saved = response.data as AdminTerritory;
      setAdminTerritories(prev => {
        const exists = prev.some(item => String(item.id) === String(saved.id));
        return exists
          ? prev.map(item => (String(item.id) === String(saved.id) ? saved : item))
          : [...prev, saved];
      });
      navigateTo("/");
      return null;
    } catch (err: any) {
      const data = err?.response?.data || {};
      if (typeof data?.detail === "string") return data.detail;
      const nameError = Array.isArray(data?.name) ? data.name[0] : null;
      if (nameError) return String(nameError);
      const nonField = Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : null;
      if (nonField) return String(nonField);
      return t("territoryErrorSaveFailed");
    }
  };

  const deleteAdminTerritory = async (territory: TerritoryFormValue): Promise<string | null> => {
    try {
      await apiClient.delete(`territories/admin/${territory.id}/`);
      setAdminTerritories(prev => prev.filter(item => String(item.id) !== String(territory.id)));
      setTerritoryModalOpen(false);
      setEditingTerritory(null);
      navigateTo("/");
      return null;
    } catch (err: any) {
      const data = err?.response?.data || {};
      if (typeof data?.detail === "string") return data.detail;
      return t("territoryErrorSaveFailed");
    }
  };

  const openCreateTerritory = () => {
    setEditingTerritory(null);
    setTerritoryModalOpen(false);
    navigateTo("/admin/territories/new");
  };

  const openEditTerritory = (territory: AdminTerritory) => {
    setEditingTerritory(normalizeTerritoryForForm(territory));
    setTerritoryModalOpen(true);
  };

  const closeTerritoryForm = () => {
    setTerritoryModalOpen(false);
    setEditingTerritory(null);
    if (window.location.pathname === "/admin/territories/new") {
      navigateTo("/");
    }
  };

  const runAdminUserAction = async (userId: number, action: string) => {
    setAdminUsersError(null);
    try {
      const response = await apiClient.post(`accounts/admin/users/${userId}/action/`, { action });
      setAdminUsers(prev => prev.map(item => item.id === userId ? response.data : item));
    } catch {
      setAdminUsersError(t("adminUsersUpdateError"));
    }
  };

  const runTerritoryUserAction = async (territoryId: string | number, userId: number, action: "block" | "unblock") => {
    try {
      await apiClient.post(`territories/admin/${territoryId}/users/${userId}/action/`, { action });
      await loadAdminTerritories();
      await loadNotifications(showAllNotifications ? 0 : 3);
    } catch {
      setBookingsError(t("adminActionFailed"));
    }
  };

  const updateMachineStatus = async (machineId: string | number, statusValue: string) => {
    try {
      await apiClient.post(`territories/admin/machines/${machineId}/action/`, { status: statusValue });
      await loadAdminTerritories();
      if (isBookingsPage || isSuperAdmin) {
        await loadBookings();
      }
      await loadNotifications(showAllNotifications ? 0 : 3);
    } catch {
      setBookingsError(t("adminActionFailed"));
    }
  };

  const loadProblemReports = async (territoryId: string | number) => {
    const key = String(territoryId);
    setProblemReportsLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await apiClient.get("territories/problem-reports/", { params: { territory_id: key } });
      setProblemReports(prev => ({ ...prev, [key]: res.data as TerritoryProblemReport[] }));
    } catch {
      setProblemReports(prev => ({ ...prev, [key]: [] }));
    } finally {
      setProblemReportsLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const resolveReport = async (reportId: number, territoryId: string | number) => {
    setResolvingReportId(reportId);
    try {
      await apiClient.patch(`territories/problem-reports/${reportId}/`, { status: "resolved" });
      await loadProblemReports(territoryId);
    } catch {
    } finally {
      setResolvingReportId(null);
    }
  };

const generateAdminInviteCode = async (territoryId: string) => {
    setInviteCodeGenerating(prev => ({ ...prev, [territoryId]: true }));
    try {
      const res = await apiClient.post(`territories/admin/${territoryId}/invite-code/`);
      setAdminTerritories(prev => prev.map(t =>
        String(t.id) === territoryId ? { ...t, active_invite_code: res.data } : t
      ));
    } catch {
    } finally {
      setInviteCodeGenerating(prev => ({ ...prev, [territoryId]: false }));
    }
  };

  const copyAdminInviteCode = async (territoryId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setInviteCodeCopied(prev => ({ ...prev, [territoryId]: true }));
      setTimeout(() => setInviteCodeCopied(prev => ({ ...prev, [territoryId]: false })), 2000);
    } catch {}
  };


  useEffect(() => {
    if (!currentUser) return;
    void loadNotifications(3);
    const timer = window.setInterval(() => {
      void loadNotifications(showAllNotifications ? 0 : 3);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id, showAllNotifications]);

  useEffect(() => {
    if (currentPath === "/notifications" && currentUser) {
      setNotificationsOpen(false);
      setShowAllNotifications(true);
      void loadNotifications(0);
    }
  }, [currentPath, currentUser?.id]);

  useEffect(() => {
    if (isBookingsPage && currentUser) {
      setNotificationsOpen(false);
      void loadBookings();
    }
  }, [isBookingsPage, currentUser?.id]);

  useEffect(() => {
    if (!isAdminRole) return;
    if (isSuperAdmin && (currentPath === "/" || isAdminUsersPage)) {
      void loadAdminUsers();
    }
    if (currentPath === "/" || isAdminTerritoriesPage || isAdminTerritoryCreatePage) {
      void loadAdminTerritories();
    }
    if (isSuperAdmin && currentPath === "/") {
      void loadBookings();
    }
  }, [isAdminRole, isSuperAdmin, currentPath, isAdminUsersPage, isAdminTerritoriesPage, isAdminTerritoryCreatePage]);

  useEffect(() => {
    if (!isTerritoriesPage || !currentUser || isAdminRole) return;
    setTerritoriesPageLoading(true);
    apiClient
      .get("territories/mine/")
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : [];
        setTerritoriesPageList(items);
        setUserTerritoriesCount(items.length);
      })
      .finally(() => setTerritoriesPageLoading(false));
  }, [isTerritoriesPage, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || isAdminRole) return;
    if (userTerritoriesCount === 0 && currentPath === "/") {
      navigateTo("/territories");
    }
  }, [userTerritoriesCount, currentUser?.id]);

  useEffect(() => {
    if (!isAdminRole || !isAdminTerritoriesPage) return;
    navigateTo("/");
  }, [isAdminRole, isAdminTerritoriesPage]);

  useEffect(() => {
    if (!isBookingsPage || !highlightedBookingId) return;
    window.setTimeout(() => {
      document
        .getElementById(`booking-row-${highlightedBookingId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [isBookingsPage, highlightedBookingId, bookings.length]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationsButtonRef.current?.contains(target) ||
        notificationsPanelRef.current?.contains(target)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [notificationsOpen]);

  const navigateTo = (path: string) => {
    if (`${window.location.pathname}${window.location.search}` !== path) {
      window.history.pushState({}, "", path);
    }
    setCurrentPath(window.location.pathname);
    setNavigationTick(value => value + 1);
  };

  const openLatestNotifications = async () => {
    setShowAllNotifications(false);
    setNotificationsOpen(prev => !prev);
    await loadNotifications(3);
  };

  const openAllNotifications = async () => {
    setShowAllNotifications(true);
    setNotificationsOpen(false);
    navigateTo("/notifications");
    await loadNotifications(0);
  };

  const markAllNotificationsRead = async () => {
    await apiClient.post("territories/notifications/", { action: "mark_all_read" });
    await loadNotifications(showAllNotifications ? 0 : 3);
  };

  const openNotificationBooking = async (item: LaundryNotification) => {
    if (!item.booking && !item.territory_id) return;
    setNotificationsOpen(false);
    if (!item.is_read) {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === item.id ? { ...notification, is_read: true } : notification
        )
      );
      setUnreadNotifications(count => Math.max(0, count - 1));
      try {
        await apiClient.post("territories/notifications/", { ids: [item.id] });
      } catch {
        void loadNotifications(showAllNotifications ? 0 : 3);
      }
    }
    if (item.territory_id) {
      navigateTo("/");
      setExpandedTerritories(prev => ({ ...prev, [String(item.territory_id)]: true }));
      window.setTimeout(() => {
        document.getElementById(`territory-${item.territory_id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } else {
      navigateTo(`/bookings?booking=${item.booking}`);
    }
  };

  const cancelBooking = async (bookingId: number) => {
    setCancellingBookingId(bookingId);
    setBookingsError(null);
    try {
      await apiClient.patch(`territories/bookings/${bookingId}/`, { action: "cancel" });
      await loadBookings();
    } catch {
      setBookingsError(t("couldNotCancelBooking"));
    } finally {
      setCancellingBookingId(null);
    }
  };

  const handleJoinTerritory = async () => {
    const code = joinCode.trim();
    if (!code) return;
    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const joinResponse = await apiClient.post("territories/join/", { code });
      const res = await apiClient.get("territories/mine/");
      const items = Array.isArray(res.data) ? res.data : [];
      const joinedTerritory = joinResponse.data?.territory ?? items[items.length - 1]?.territory;
      const joinedName = joinedTerritory?.name ?? t("joinTerritorySuccess");
      const joinedId = Number(joinedTerritory?.id) || null;
      const successMessage = t("joinTerritorySuccessNamed").replace("{name}", joinedName);
      setTerritoriesPageList(items);
      setUserTerritoriesCount(items.length);
      if (joinedId) {
        setCurrentTerritoryId(joinedId);
      }
      setJoinCode("");
      setJoinSuccess(successMessage);
      setAppNotice(successMessage);
      navigateTo("/");
      window.setTimeout(() => setAppNotice(null), 5000);
    } catch (err: any) {
      setJoinError(err?.response?.data?.detail || t("joinTerritoryErrorGeneric"));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveTerritory = async (territoryId: number) => {
    setLeavingTerritoryId(territoryId);
    try {
      await apiClient.delete(`territories/mine/${territoryId}/leave/`);
      const res = await apiClient.get("territories/mine/");
      const items = Array.isArray(res.data) ? res.data : [];
      setTerritoriesPageList(items);
      setUserTerritoriesCount(items.length);
      if (currentTerritoryId === territoryId) setCurrentTerritoryId(null);
      setLeaveTerritoryConfirm(null);
    } catch {
    } finally {
      setLeavingTerritoryId(null);
    }
  };

  const confirmWash = async (bookingId: number, programName: string, durationMinutes: number) => {
    try {
      setBookingsError(null);
      const response = await apiClient.patch(`territories/bookings/${bookingId}/`, {
        action: "confirm_wash",
        selected_program_name: programName,
        selected_program_duration_minutes: durationMinutes
      });
      const updated = response.data as UserBooking;
      setBookings(prev => prev.map(booking => (booking.id === bookingId ? updated : booking)));
      await loadNotifications(showAllNotifications ? 0 : 3);
    } catch {
      setBookingsError(t("couldNotConfirmBooking"));
    }
  };

  if (!authChecked) {
    return <FullscreenLoader />;
  }

  const now = clockNow;

  const getInviteCodeCountdown = (expiresAt: string | null): { expired: boolean; label: string } => {
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

  const activeBookings = bookings.filter(booking => booking.status === "active" && new Date(booking.end_time) > now);
  const historyBookings = bookings.filter(booking => booking.status !== "active" || new Date(booking.end_time) <= now).reverse();
  const adminSearchValue = adminSearch.trim().toLowerCase();
  const filteredAdminUsers = adminUsers.filter(user => {
    if (!adminSearchValue) return true;
    return (
      `user #${user.id}`.includes(adminSearchValue) ||
      user.email.toLowerCase().includes(adminSearchValue) ||
      user.role.toLowerCase().includes(adminSearchValue)
    );
  });
  const adminMachines = adminTerritories.flatMap(territory =>
    territory.zones.flatMap(zone => zone.machines.map(machine => ({ territory, zone, machine })))
  );
  const adminReservations = adminTerritories.flatMap(territory => territory.reservations || []);
  const adminActiveBookings = adminReservations.filter(booking => booking.status === "active");
  const adminUsersMetric = isSuperAdmin
    ? adminUsers.length
    : adminTerritories.reduce((sum, territory) => sum + Number(territory.active_users_count || territory.users?.length || 0), 0);
  const isAdminDashboard = isAdminRole && currentPath === "/";
  const getMachineStatusMeta = (machine: AdminMachine) => {
    const busy = Number(machine.current_reservations_count || 0) > 0 || machine.status === "busy";
    if (machine.status === "broken") {
      return { label: t("machineStatusBroken"), className: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800" };
    }
    if (machine.status === "inactive") {
      return { label: t("machineStatusInactive"), className: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700" };
    }
    if (busy) {
      return { label: t("machineStatusBusy"), className: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800" };
    }
    return { label: t("machineStatusActive"), className: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800" };
  };

  const renderAdminTerritoryDashboard = () => (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-gray-800">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">{t("adminTerritoriesPanelTitle")}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
          {t("adminTerritoriesPanelSubtitle")}
        </p>
      </div>
      {adminTerritoriesLoading ? (
        <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
          {t("adminTerritoriesLoading")}
        </div>
      ) : adminTerritories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-5 py-12">
          <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{t("adminEmptyDashboard")}</p>
          <button
            type="button"
            onClick={() => navigateTo("/admin/territories/new")}
            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {t("adminAddFirstTerritory")}
          </button>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {adminTerritories.slice(isSuperAdmin ? 2 : 0).map(territory => {
            const tid = String(territory.id);
            const isExpanded = expandedTerritories[tid] ?? false;
            const machinesCount = territory.zones.reduce((sum, zone) => sum + zone.machines.length, 0);
            const reservations = territory.reservations || [];
            const activeReservationsCount = reservations.filter(b => b.status === "active").length;
            const ic = territory.active_invite_code;
            const countdown = getInviteCodeCountdown(ic?.expires_at ?? null);
            const hasActiveCode = ic && !countdown.expired;
            const isGenerating = inviteCodeGenerating[tid] || false;
            const isCopied = inviteCodeCopied[tid] || false;
            return (
              <section key={territory.id} id={`territory-${territory.id}`} className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">

                <button
                  type="button"
                  onClick={() => {
                    const next = !isExpanded;
                    setExpandedTerritories(prev => ({ ...prev, [tid]: next }));
                    if (next) void loadProblemReports(tid);
                  }}
                  className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-gray-800/40 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-base font-bold text-slate-950 dark:text-white">{territory.name}</span>
                      {isSuperAdmin && (
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 ring-1 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:ring-purple-800">
                          {t("adminCodeSuperadmin")}: {territory.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditTerritory(territory)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/30"
                      >
                        {t("adminEdit")}
                      </button>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""} dark:text-gray-500`} />
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span>{formatAdminCount("adminZonesCount", territory.zones.length)}</span>
                    <span>{formatAdminCount("adminMachinesCount", machinesCount)}</span>
                    <span>{t("adminActiveUsers")}: {territory.active_users_count || 0}</span>
                    <span>{t("adminActiveReservations")}: {activeReservationsCount}</span>
                    {isSuperAdmin && territory.created_by_email && (
                      <span>{t("adminCreatedBy")}: {territory.created_by_email}</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 shrink-0">{t("inviteCodeSectionTitle")}:</span>
                    {isGenerating ? (
                      <span className="text-xs text-slate-400 animate-pulse">{t("inviteCodeGenerating")}</span>
                    ) : hasActiveCode ? (
                      <>
                        <span className="font-mono font-bold text-sm tracking-widest text-slate-900 dark:text-white">{ic!.code}</span>
                        <span className="font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-300">{countdown.label}</span>
                        <button type="button" onClick={() => void copyAdminInviteCode(tid, ic!.code)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-50">
                          {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          {isCopied ? t("inviteCodeCopied") : t("inviteCodeCopy")}
                        </button>
                        <button type="button" onClick={() => void generateAdminInviteCode(tid)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium hover:bg-gray-50"
                          title={t("inviteCodeGenerate")}>
                          <RefreshCw size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{ic ? t("inviteCodeExpired") : t("inviteCodeNoActive")}</span>
                        <button type="button" onClick={() => void generateAdminInviteCode(tid)}
                          className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                          {t("inviteCodeGenerate")}
                        </button>
                      </>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-gray-700">

                    <div className="p-4 space-y-3">
                      {territory.zones.map(zone => {
                        const zoneKey = `${tid}-${zone.id}`;
                        const isZoneOpen = expandedZones[zoneKey] ?? true;
                        return (
                          <div key={zone.id} className="rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                            <button type="button"
                              onClick={() => setExpandedZones(prev => ({ ...prev, [zoneKey]: !isZoneOpen }))}
                              className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 dark:bg-gray-800/60 hover:bg-slate-100 dark:hover:bg-gray-800 transition">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{getAdminZoneLabel(zone)}</span>
                              <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${isZoneOpen ? "rotate-180" : ""} dark:text-gray-500`} />
                            </button>
                            {isZoneOpen && (
                              <div className="grid gap-3 p-3 md:grid-cols-2">
                                {zone.machines.map(machine => {
                                  const statusMeta = getMachineStatusMeta(machine);
                                  return (
                                    <div key={machine.id} className="rounded-lg border border-slate-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-950/50 space-y-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="font-bold text-slate-950 dark:text-white text-sm">
                                            {t("machineLabel")} #{String(machine.number).padStart(2, "0")}
                                          </div>
                                          <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                                            {machine.model_name || t("adminNoModel")}
                                          </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusMeta.className}`}>
                                          {statusMeta.label}
                                        </span>
                                      </div>
                                      <div className="flex gap-1.5">
                                        {(["active", "broken"] as const).map(s => {
                                          const sel = machine.status === s;
                                          return (
                                            <button key={s} type="button"
                                              onClick={() => void updateMachineStatus(machine.id, s)}
                                              className={`flex-1 h-8 rounded-md border text-xs font-bold transition ${
                                                sel
                                                  ? s === "active"
                                                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                    : "border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
                                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                              }`}>
                                              {s === "active" ? t("adminMarkActive") : t("adminMarkBroken")}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {(() => {
                                        const machineKey = `${tid}-${machine.id}`;
                                        const reportsLoading = problemReportsLoading[tid] || false;
                                        const allMachineReports = (problemReports[tid] || [])
                                          .filter(r =>
                                            r.machine_number === machine.number &&
                                            (!r.zone_name || r.zone_name === zone.name)
                                          )
                                          .slice()
                                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                                        const openCount = allMachineReports.filter(r => r.status !== "resolved").length;
                                        const isReportsOpen = expandedMachineReports[machineKey] || false;
                                        const hasAny = allMachineReports.length > 0;
                                        const allResolved = hasAny && openCount === 0;
                                        const borderCls = openCount > 0
                                          ? "border-red-200 dark:border-red-900/50"
                                          : allResolved
                                          ? "border-emerald-200 dark:border-emerald-900/50"
                                          : "border-slate-200 dark:border-gray-700";
                                        const headerCls = openCount > 0
                                          ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                                          : allResolved
                                          ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                                          : "bg-slate-50 hover:bg-slate-100 dark:bg-gray-800/40 dark:hover:bg-gray-800/60";
                                        const labelCls = openCount > 0
                                          ? "text-red-700 dark:text-red-300"
                                          : allResolved
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : "text-slate-500 dark:text-gray-400";
                                        const chevronCls = openCount > 0
                                          ? "text-red-400"
                                          : allResolved
                                          ? "text-emerald-400"
                                          : "text-slate-400 dark:text-gray-500";
                                        return (
                                          <div className={`rounded-md border overflow-hidden ${borderCls}`}>
                                            <div className={`flex items-center ${headerCls}`}>
                                              <button type="button"
                                                onClick={() => setExpandedMachineReports(prev => ({ ...prev, [machineKey]: !isReportsOpen }))}
                                                className="flex-1 flex items-center justify-between px-3 py-1.5 transition">
                                                <span className={`text-[11px] font-bold ${labelCls}`}>
                                                  {t("adminProblemReports")} ({reportsLoading ? "…" : allMachineReports.length})
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                  {openCount > 0 && (
                                                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                                      {t("adminOpenReportsCount").replace("{count}", String(openCount))}
                                                    </span>
                                                  )}
                                                  <ChevronDown size={11} className={`transition-transform ${isReportsOpen ? "rotate-180" : ""} ${chevronCls}`} />
                                                </span>
                                              </button>
                                              <button type="button"
                                                onClick={() => void loadProblemReports(tid)}
                                                disabled={reportsLoading}
                                                className={`px-2 py-1.5 transition disabled:opacity-40 ${labelCls}`}
                                                title={t("inviteCodeGenerate").replace("Generuj", "Odśwież").replace("Generate", "Refresh")}>
                                                <RefreshCw size={11} className={reportsLoading ? "animate-spin" : ""} />
                                              </button>
                                            </div>
                                            {isReportsOpen && (
                                              <div className="divide-y divide-slate-100 dark:divide-gray-800">
                                                {reportsLoading ? (
                                                  <div className="px-3 py-2 text-[11px] text-slate-400 dark:text-gray-500">
                                                    {t("adminTerritoriesLoading")}
                                                  </div>
                                                ) : allMachineReports.length === 0 ? (
                                                  <div className="px-3 py-2 text-[11px] text-slate-400 dark:text-gray-500">
                                                    {t("adminProblemReportsNone")}
                                                  </div>
                                                ) : (
                                                  allMachineReports.map(report => (
                                                    <div key={report.id} className={`px-3 py-2 text-[11px] ${
                                                      report.status === "resolved"
                                                        ? "bg-white dark:bg-gray-950/40"
                                                        : "bg-red-50/50 dark:bg-red-950/10"
                                                    }`}>
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="text-slate-600 dark:text-gray-300 break-words flex-1">{report.description}</div>
                                                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${
                                                          report.status === "resolved"
                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800"
                                                            : "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800"
                                                        }`}>
                                                          {report.status === "resolved" ? t("adminProblemReportResolved") : t("adminProblemReportOpen")}
                                                        </span>
                                                      </div>
                                                      <div className="mt-0.5 text-[10px] text-slate-400 dark:text-gray-500">
                                                        {new Date(report.created_at).toLocaleString(lang, { dateStyle: "short", timeStyle: "short" })}
                                                      </div>
                                                      {report.status !== "resolved" && (
                                                        <button type="button"
                                                          disabled={resolvingReportId === report.id}
                                                          onClick={() => void resolveReport(report.id, territory.id)}
                                                          className="mt-1 h-6 rounded-md border border-emerald-200 px-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300">
                                                          {t("adminProblemReportMarkResolved")}
                                                        </button>
                                                      )}
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 dark:border-gray-700">
                      <button type="button"
                        onClick={() => setExpandedTerritoryUsers(prev => ({ ...prev, [tid]: !expandedTerritoryUsers[tid] }))}
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-800/50">
                        <span>{t("adminTerritoryUsers")} ({(territory.users || []).length})</span>
                        <ChevronDown size={14} className={`shrink-0 transition-transform ${expandedTerritoryUsers[tid] ? "rotate-180" : ""} text-slate-400 dark:text-gray-500`} />
                      </button>
                      {expandedTerritoryUsers[tid] && (
                        <div className="border-t border-slate-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-2">
                          {(territory.users || []).length === 0 ? (
                            <div className="text-sm font-semibold text-slate-400 dark:text-gray-500">{t("adminNoUsers")}</div>
                          ) : (territory.users || []).map(user => (
                            <div key={user.id} className="rounded-lg border border-slate-100 px-3 py-3 dark:border-gray-800">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate font-bold text-slate-950 dark:text-white">{user.name}</div>
                                  <div className="truncate text-xs font-semibold text-slate-500 dark:text-gray-400">{user.email}</div>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                                  user.blocked
                                    ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                                    : "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800"
                                }`}>
                                  {user.blocked ? t("adminUserBlocked") : t("adminUserActive")}
                                </span>
                              </div>
                              <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                                {t("adminActiveReservations")}: {user.active_reservations} · {t("adminLastActivity")}: {user.last_activity ? formatBookingDate(user.last_activity) : "-"}
                              </div>
                              <button type="button"
                                onClick={() => void runTerritoryUserAction(territory.id, user.id, user.blocked ? "unblock" : "block")}
                                className={`mt-2 h-8 rounded-md border px-2.5 text-xs font-bold transition ${
                                  user.blocked
                                    ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"
                                    : "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                                }`}>
                                {user.blocked ? t("adminUnblockUser") : t("adminBlockUser")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>


                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
  const formatAdminCount = (key: string, count: number) => t(key).replace("{count}", String(count));
  const renderSidebarButton = (
    Icon: typeof Home,
    label: string,
    active: boolean,
    onClick?: () => void,
    nested = false
  ) => (
    <button
      key={label}
      title={label}
      onClick={onClick}
      className={`flex h-12 min-w-max items-center gap-3 rounded-lg px-4 text-sm font-semibold transition lg:w-full lg:min-w-0 ${
        sidebarCollapsed ? "lg:justify-center lg:px-0" : nested ? "lg:pl-8 lg:pr-3" : ""
      } ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      }`}
      type="button"
    >
      <Icon size={20} className="shrink-0" />
      <span
        title={label}
        className={`min-w-0 truncate whitespace-nowrap text-left ${sidebarCollapsed ? "lg:hidden" : ""}`}
      >
        {label}
      </span>
    </button>
  );

  const renderBottomNavItem = (
    Icon: typeof Home,
    label: string,
    active: boolean,
    onClick: () => void,
    badge?: number
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold transition ${
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      <div className="relative">
        <Icon size={22} className="shrink-0" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="max-w-[56px] truncate text-center">{label}</span>
    </button>
  );

  const authenticatedShell = (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-gray-950 dark:text-white">
      <header className="relative z-[70] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="rounded-lg transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:hover:bg-blue-950/40 dark:focus:ring-offset-gray-900"
            >
              <InlineMachine size={44} drumColor="#0f6bff" />
            </button>
            <div className="hidden text-xl font-bold tracking-tight text-slate-950 sm:block dark:text-white">
              {t("appTitle")}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNotificationsPage && (
              <button
                ref={notificationsButtonRef}
                type="button"
                aria-label={t("notificationsAria")}
                onClick={openLatestNotifications}
                className={`relative z-[95] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm ring-0 transition dark:bg-gray-800 ${
                  notificationsOpen
                    ? "border-blue-300 text-blue-700 ring-1 ring-blue-100 shadow-[0_0_0_1px_rgba(37,99,235,0.08),0_0_18px_rgba(37,99,235,0.28)] dark:border-blue-700 dark:text-blue-200 dark:ring-blue-900/70 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.18),0_0_20px_rgba(37,99,235,0.38)]"
                    : "border-slate-200 text-slate-700 hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:text-blue-200"
                }`}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
            )}
            <AccountMenu
              user={currentUser as UserInfo}
              onLogout={handleLogout}
              onChangePassword={openResetFromProfile}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div
        className={`mx-auto grid max-w-[1600px] grid-cols-1 transition-[grid-template-columns] duration-200 ${
          sidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]"
        }`}
      >
        <aside
          className={`hidden border-slate-200 bg-white px-4 py-4 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 lg:block lg:min-h-[calc(100vh-72px)] lg:border-r ${
            sidebarCollapsed ? "lg:px-3" : "lg:px-5"
          }`}
        >
          <nav className="flex flex-col gap-3">
            {isAdminRole ? (
              <div className="flex min-w-max flex-col gap-2 lg:w-full lg:min-w-0">
                {renderSidebarButton(
                  Home,
                  t("adminDashboardTerritoriesTab"),
                  isAdminDashboard,
                  () => navigateTo("/")
                )}
                {!sidebarCollapsed && renderSidebarButton(
                  Plus,
                  t("adminAddTerritory"),
                  isAdminTerritoryCreatePage,
                  openCreateTerritory,
                  true
                )}
              </div>
            ) : userTerritoriesCount != null && userTerritoriesCount !== 0 && renderSidebarButton(
              Home,
              t("navDashboard"),
              !isNotificationsPage && !isBookingsPage && !isTerritoriesPage,
              () => navigateTo("/")
            )}

            {isSuperAdmin && renderSidebarButton(Users, t("adminAllUsers"), isAdminUsersPage, () => navigateTo("/admin/users"))}

            {(isAdminRole || userTerritoriesCount != null && userTerritoriesCount !== 0) && renderSidebarButton(
              CalendarClock,
              isAdminRole ? t("adminAllReservations") : t("navMyBookings"),
              isBookingsPage,
              () => navigateTo("/bookings")
            )}

            {(isAdminRole || userTerritoriesCount != null && userTerritoriesCount !== 0) && renderSidebarButton(Bell, t("navNotifications"), isNotificationsPage, openAllNotifications)}

            {!isAdminRole && renderSidebarButton(
              MapPin,
              t("navTerritories"),
              isTerritoriesPage || userTerritoriesCount === 0,
              () => navigateTo("/territories")
            )}
          </nav>

          <div className={`mt-8 hidden rounded-lg bg-blue-50 px-4 py-5 text-center dark:bg-blue-950/30 ${
            sidebarCollapsed ? "" : "lg:block"
          }`}>
            <img
              src="/laundry-basket-illustration.png"
              alt=""
              className="mx-auto h-32 w-40 object-contain dark:hidden"
            />
            <img
              src="/laundry-basket-illustration-dark.png"
              alt=""
              className="mx-auto hidden h-32 w-40 object-contain dark:block"
            />
            <div className="mt-3 text-sm font-semibold leading-5 text-slate-900 dark:text-blue-50">
              {t("sidebarPromo").split("\n").map(line => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 pb-20 sm:px-6 lg:pb-6 lg:px-10">
          {isAdminDashboard ? (
            <section className="w-full space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                  {t("adminDashboardTitle")}
                </h1>
                <p className="text-base font-semibold text-slate-600 dark:text-gray-300">
                  {t("adminManageAllSubtitle")}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {([
                  [t("adminTerritoriesMenu"), adminTerritories.length, null],
                  [t("adminReviewMachines"), adminMachines.length, null],
                  [t("adminAllUsers"), adminUsersMetric, isSuperAdmin ? "/admin/users" : null],
                  [t("adminActiveReservations"), adminActiveBookings.length, "/bookings"],
                ] as [string, number, string | null][]).map(([label, value, path]) => {
                  const inner = (
                    <>
                      <div className="text-sm font-bold text-slate-500 dark:text-gray-400">{label}</div>
                      <div className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value}</div>
                    </>
                  );
                  return path ? (
                    <button
                      key={label}
                      type="button"
                      onClick={() => navigateTo(path)}
                      className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      {inner}
                    </div>
                  );
                })}
              </div>

              {renderAdminTerritoryDashboard()}
            </section>
          ) : isAdminRole && isAdminTerritoryCreatePage ? (
            <section className="w-full space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                  {t("adminCreateTerritoryTitle")}
                </h1>
                <p className="text-base font-semibold text-slate-600 dark:text-gray-300">
                  {t("adminTerritorySetupSubtitle")}
                </p>
              </div>
              <TerritoryFormModal
                open
                renderMode="page"
                onClose={() => navigateTo("/")}
                initial={null}
                onSave={saveAdminTerritory}
                onDelete={deleteAdminTerritory}
              />
            </section>
          ) : isAdminRole && isAdminTerritoriesPage ? (
            <section className="w-full space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                    {t("adminAllTerritories")}
                  </h1>
                  <p className="mt-4 text-base font-semibold text-slate-600 dark:text-gray-300">
                    {t("adminAllTerritoriesSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateTerritory}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={18} />
                  {t("adminAddTerritory")}
                </button>
              </div>

              {renderAdminTerritoryDashboard()}
            </section>
          ) : isSuperAdmin && isAdminUsersPage ? (
            <section className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                  {t("adminUsersTitle")}
                </h1>
                <p className="mt-4 text-base font-semibold text-slate-600 dark:text-gray-300">
                  {t("adminUsersSubtitle")}
                </p>
              </div>

              {adminUsersError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {adminUsersError}
                </div>
              )}

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
                  <label className="relative block w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      value={adminSearch}
                      onChange={event => setAdminSearch(event.target.value)}
                      placeholder={t("adminSearchUserPlaceholder")}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadAdminUsers}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  >
                    {t("refresh")}
                  </button>
                </div>
                {adminUsersLoading ? (
                  <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                    {t("profileUsersLoading")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="border-b border-slate-100 text-slate-500 dark:border-gray-800 dark:text-gray-400">
                        <tr>
                          <th className="px-5 py-4 font-bold">{t("adminTableUser")}</th>
                          <th className="px-5 py-4 font-bold">{t("adminTableEmail")}</th>
                          <th className="px-5 py-4 font-bold">{t("adminTableRole")}</th>
                          <th className="px-5 py-4 font-bold">{t("adminTableStatus")}</th>
                          <th className="px-5 py-4 font-bold">{t("adminTableActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        {filteredAdminUsers.map(user => (
                          <tr key={user.id}>
                            <td className="px-5 py-5 font-bold text-slate-950 dark:text-white">{t("adminTableUser")} #{user.id}</td>
                            <td className="px-5 py-5 font-semibold text-slate-700 dark:text-gray-200">{user.email}</td>
                            <td className="px-5 py-5 whitespace-nowrap">
                              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800">
                                {user.role === "superadmin" ? t("authRoleSuperAdmin") : user.role === "admin" ? t("authRoleAdmin") : t("authRoleUser")}
                              </span>
                            </td>
                            <td className="px-5 py-5 whitespace-nowrap">
                              <span className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
                                user.is_active
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800"
                                  : "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                              }`}>
                                {user.is_active ? t("adminActiveAccount") : t("adminBlockedAccount")}
                              </span>
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex flex-wrap gap-2">
                                {user.role !== "superadmin" && (
                                  <button
                                    type="button"
                                    onClick={() => void runAdminUserAction(user.id, user.role === "admin" ? "make_user" : "make_admin")}
                                    className="h-9 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/30"
                                  >
                                    {user.role === "admin" ? t("adminMakeUser") : t("adminMakeAdmin")}
                                  </button>
                                )}
                                {user.id !== currentUser?.id && (
                                  <button
                                    type="button"
                                    onClick={() => void runAdminUserAction(user.id, user.is_active ? "block" : "unblock")}
                                    className="h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/30"
                                  >
                                    {user.is_active ? t("adminBlockUser") : t("adminUnblockUser")}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </section>
          ) : isBookingsPage ? (
            <section className="w-full space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                    {isAdminRole ? t("adminAllReservations") : t("bookingsPageTitle")}
                  </h1>
                  <p className="mt-4 text-base font-semibold text-slate-600 dark:text-gray-300">
                    {isAdminRole ? t("adminReservationsSubtitle") : t("bookingsPageSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadBookings}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:text-blue-200"
                >
                  {t("refresh")}
                </button>
              </div>

              {bookingsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {bookingsError}
                </div>
              )}

              {isAdminRole && (
                <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block mb-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                      {t("bookingFilterByTerritory")}
                    </label>
                    <select
                      value={bookingFilterTerritory}
                      onChange={e => setBookingFilterTerritory(e.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-slate-700 dark:text-gray-200 focus:outline-none focus:border-blue-400"
                    >
                      <option value="">{t("bookingFilterAllTerritories")}</option>
                      {Array.from(new Set(bookings.map(b => b.territory_name).filter(Boolean))).map(name => (
                        <option key={name} value={name!}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block mb-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                      {t("bookingFilterByUser")}
                    </label>
                    <input
                      type="text"
                      value={bookingFilterUser}
                      onChange={e => setBookingFilterUser(e.target.value)}
                      placeholder={t("bookingFilterUserPlaceholder")}
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-slate-700 dark:text-gray-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  {(bookingFilterTerritory || bookingFilterUser) && (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => { setBookingFilterTerritory(""); setBookingFilterUser(""); }}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t("bookingFilterReset")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const filteredActive = activeBookings
                  .filter(b => !bookingFilterTerritory || b.territory_name === bookingFilterTerritory)
                  .filter(b => !bookingFilterUser || (b.user?.email || "").toLowerCase().includes(bookingFilterUser.toLowerCase()));
                const filteredHistory = historyBookings
                  .filter(b => !bookingFilterTerritory || b.territory_name === bookingFilterTerritory)
                  .filter(b => !bookingFilterUser || (b.user?.email || "").toLowerCase().includes(bookingFilterUser.toLowerCase()));
                return (
                  <>
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-gray-800">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950 dark:text-white">{isAdminRole ? t("adminActiveReservationsSystem") : t("activeReservations")}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                        {filteredActive.length} {t("activeCount")}
                      </p>
                    </div>
                    <CheckCircle2 className="text-emerald-500" size={24} />
                  </div>
                  {bookingsLoading ? (
                    <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                      {t("loadingBookings")}
                    </div>
                  ) : filteredActive.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                      {t("noActiveReservations")}
                    </div>
                  ) : (
                    <div className="space-y-3 p-5">
                      {filteredActive.map((booking, index) => (
                        <div
                          id={`booking-row-${booking.id}`}
                          key={booking.id}
                          className={`grid gap-4 rounded-lg border border-slate-100 bg-white p-4 transition lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center dark:border-gray-800 dark:bg-gray-950/40 ${
                            highlightedBookingId === booking.id
                              ? "border-blue-200 bg-blue-50 ring-1 ring-inset ring-blue-200 dark:border-blue-800 dark:bg-blue-950/30 dark:ring-blue-800"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-0 gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="text-lg font-bold text-slate-950 dark:text-white">
                                  {t("machineLabel")} #{String(booking.machine_number || booking.machine).padStart(2, "0")}
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800">
                                  {t("activeStatus")}
                                </span>
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
                                {getBookingZoneLabel(booking)} · {booking.territory_name || t("territoryFallback")}
                              </div>
                              {isAdminRole && (
                                <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                                  {formatUserLabel(booking.user)} · {booking.user?.email || t("bookingUnknownUser")}
                                </div>
                              )}
                              {booking.machine_model && (
                                <div className="mt-1 text-sm text-slate-500 dark:text-gray-400">{booking.machine_model}</div>
                              )}
                              <div className="mt-3 text-base font-bold text-blue-700 dark:text-blue-300">
                                {formatBookingDate(booking.start_time)} · {formatBookingTime(booking.start_time)}-{formatBookingTime(booking.end_time)}
                              </div>
                              {!isSuperAdmin && (() => {
                                const start = new Date(booking.start_time);
                                const confirmationDeadline = new Date(start.getTime() + 15 * 60000);
                                const canConfirm = now >= start && now <= confirmationDeadline && !booking.confirmed_at;
                                const beforeStart = now < start;
                                const remainingMs = Math.max(0, confirmationDeadline.getTime() - now.getTime());
                                const remainingMinutes = Math.floor(remainingMs / 60000);
                                const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                                return (
                                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                                    {booking.confirmed_at ? (
                                      <div className="space-y-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        <div>{t("bookingConfirmedShort")}</div>
                                        {booking.selected_program_name && (
                                          <div>
                                            {t("bookingModeLabel")}: {booking.selected_program_name}
                                            {booking.selected_program_duration_minutes
                                              ? ` (${booking.selected_program_duration_minutes} min)`
                                              : ""}
                                          </div>
                                        )}
                                        {booking.estimated_wash_end_at && (
                                          <div>{t("estimatedFinish")}: {formatBookingTime(booking.estimated_wash_end_at)}</div>
                                        )}
                                      </div>
                                    ) : beforeStart ? (
                                      <div className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                                        {t("bookingConfirmWindowOpens").replace("{time}", formatBookingTime(booking.start_time))}
                                      </div>
                                    ) : canConfirm ? (
                                      <div>
                                        <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                                          {t("confirmWithin")} {String(remainingMinutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() => void confirmWash(booking.id, "Quick wash", 60)}
                                            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                                          >
                                            {t("quickWash")} · 60 min
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void confirmWash(booking.id, "Normal wash", 120)}
                                            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
                                          >
                                            {t("normalWash")} · 120 min
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void confirmWash(booking.id, "", 0)}
                                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                                          >
                                            {t("confirmWithoutMode")}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm font-semibold text-red-600 dark:text-red-300">
                                        {t("bookingConfirmWindowExpired")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void cancelBooking(booking.id)}
                            disabled={cancellingBookingId === booking.id}
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/70 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            {cancellingBookingId === booking.id ? t("cancelling") : t("cancel")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-gray-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">{t("bookingHistory")}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                      {t("bookingHistorySubtitle")}
                    </p>
                  </div>
                </div>
                {bookingsLoading ? (
                  <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                    {t("loadingHistory")}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                    {t("noBookingHistory")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {filteredHistory.map(booking => (
                      <div
                        id={`booking-row-${booking.id}`}
                        key={booking.id}
                        className={`grid gap-3 px-5 py-4 transition md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
                          highlightedBookingId === booking.id
                            ? "bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-800"
                            : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-base font-bold text-slate-950 dark:text-white">
                              {t("machineLabel")} #{String(booking.machine_number || booking.machine).padStart(2, "0")}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600 ring-1 ring-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                              {booking.status === "active" ? t("expiredStatus") : booking.status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
                            {getBookingZoneLabel(booking)} · {booking.territory_name || t("territoryFallback")}
                          </div>
                          {isAdminRole && (
                            <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                              {formatUserLabel(booking.user)} · {booking.user?.email || t("bookingUnknownUser")}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-600 dark:text-gray-300">
                          {formatBookingDate(booking.start_time)} · {formatBookingTime(booking.start_time)}-{formatBookingTime(booking.end_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
                  </>
                );
              })()}
            </section>
          ) : isNotificationsPage ? (
            <section className="w-full space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                    {t("notificationsTitle")}
                  </h1>
                  <p className="mt-4 text-base font-semibold text-slate-600 dark:text-gray-300">
                    {t("notificationsSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:text-blue-200"
                >
                  {t("markAllRead")}
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {notifications.length === 0 ? (
                  <div className="px-4 py-14 text-center text-sm text-slate-500 dark:text-gray-400">
                    {t("noNotifications")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {notifications.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void openNotificationBooking(item)}
                        disabled={!item.booking}
                        className={`w-full px-5 py-4 text-left transition ${
                          item.is_read ? "" : "bg-blue-50/70 dark:bg-blue-950/20"
                        } ${
                          item.booking
                            ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/70"
                            : "cursor-default"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-lg font-bold text-slate-950 dark:text-white">{item.title}</div>
                            {item.message && (
                              <div className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">{item.message}</div>
                            )}
                            <div className="mt-3 text-xs font-semibold text-slate-400 dark:text-gray-500">
                              {new Date(item.created_at).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}
                            </div>
                          </div>
                          {!item.is_read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (isTerritoriesPage || userTerritoriesCount === 0) && !isAdminRole ? (
            <section className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl xl:text-5xl">
                  {territoriesPageList.length > 0 ? t("myTerritoriesTitle") : t("noTerritoriesTitle")}
                </h1>
              </div>

              {territoriesPageLoading ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-500 dark:text-gray-400">
                  {t("adminTerritoriesLoading")}
                </div>
              ) : territoriesPageList.length > 0 ? (
                <div className="space-y-3">
                  {territoriesPageList.map(({ territory }) => (
                    <div
                      key={territory.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <button
                        type="button"
                        onClick={() => { setCurrentTerritoryId(territory.id); navigateTo("/"); }}
                        className="min-w-0 flex-1 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-gray-800/60 rounded-l-lg"
                      >
                        <div className="truncate font-bold text-slate-950 dark:text-white">{territory.name}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveTerritoryConfirm({ id: territory.id, name: territory.name })}
                        className="shrink-0 h-full px-4 py-4 text-sm font-bold text-red-500 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-l border-slate-200 dark:border-gray-800"
                      >
                        {t("territoryRemove")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {territoriesPageList.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{t("joinTerritoryOnlyOne")}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{t("joinTerritoryLeaveFirst")}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">{t("joinTerritoryTitle")}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">{t("joinTerritoryAdminHint")}</p>
                  {joinSuccess && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {joinSuccess}
                    </div>
                  )}
                  {joinError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      {joinError}
                    </div>
                  )}
                  <div className="mt-4 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-gray-300">
                        {t("joinTerritoryCodeLabel")}
                      </label>
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && void handleJoinTerritory()}
                        placeholder={t("joinTerritoryCodePlaceholder")}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleJoinTerritory()}
                      disabled={joinLoading || !joinCode.trim()}
                      className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {joinLoading ? "…" : t("joinTerritoryButton")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <UserTerritoryView
              territoryId={currentTerritoryId}
              onSelectTerritory={setCurrentTerritoryId}
              onTerritoriesLoaded={setUserTerritoriesCount}
            />
          )}
        </main>
      </div>
      {appNotice && (
        <div className="fixed left-1/2 top-20 z-[120] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{appNotice}</span>
          </div>
        </div>
      )}
      {isAdminRole && territoryModalOpen && (
        <TerritoryFormModal
          open={territoryModalOpen}
          onClose={closeTerritoryForm}
          initial={editingTerritory}
          onSave={saveAdminTerritory}
          onDelete={deleteAdminTerritory}
        />
      )}
      {leaveTerritoryConfirm && (
        <ModalShell
          open={Boolean(leaveTerritoryConfirm)}
          onClose={() => setLeaveTerritoryConfirm(null)}
          size="md"
          verticalAlign="center"
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                {t("territoryRemoveTitle")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-gray-300">
                {t("territoryRemoveBody").replace("{name}", leaveTerritoryConfirm.name)}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLeaveTerritoryConfirm(null)}
                disabled={leavingTerritoryId !== null}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t("territoryRemoveCancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleLeaveTerritory(leaveTerritoryConfirm.id)}
                disabled={leavingTerritoryId !== null}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {leavingTerritoryId !== null ? "…" : t("territoryRemoveConfirmAction")}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
      {notificationsOpen && (
        <div ref={notificationsPanelRef} className="fixed right-4 top-20 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-blue-200 bg-white shadow-[0_0_0_1px_rgba(37,99,235,0.06),0_0_28px_rgba(37,99,235,0.18),0_18px_45px_rgba(15,23,42,0.14)] dark:border-blue-800/80 dark:bg-gray-900 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.16),0_0_30px_rgba(37,99,235,0.34),0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-gray-800">
            <div className="font-semibold text-slate-950 dark:text-white">
              {showAllNotifications ? t("notificationsTitle") : t("latestNotifications")}
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              aria-label={t("closeNotifications")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                {t("noNotifications")}
              </div>
            ) : (
              notifications.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotificationBooking(item)}
                  disabled={!item.booking}
                  className={`w-full rounded-lg px-3 py-3 text-left text-sm transition ${
                    item.is_read
                      ? "text-slate-600 dark:text-gray-300"
                      : "bg-blue-50 text-slate-950 dark:bg-blue-950/30 dark:text-white"
                  } ${
                    item.booking
                      ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/70"
                      : "cursor-default"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{item.title}</div>
                    {!item.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  {item.message && (
                    <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">{item.message}</div>
                  )}
                  <div className="mt-2 text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-gray-800">
            {!showAllNotifications ? (
              <button type="button" onClick={openAllNotifications} className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {t("showAll")}
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={markAllNotificationsRead} className="text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-gray-300 dark:hover:text-white">
              {t("markAllRead")}
            </button>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 inset-x-0 z-[80] flex h-16 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
        {isAdminRole ? (
          <>
            {renderBottomNavItem(Home, t("adminDashboardTerritoriesTab"), isAdminDashboard, () => navigateTo("/"))}
            {isSuperAdmin && renderBottomNavItem(Users, t("adminAllUsers"), isAdminUsersPage, () => navigateTo("/admin/users"))}
            {renderBottomNavItem(Plus, t("adminAddTerritory"), isAdminTerritoryCreatePage, openCreateTerritory)}
            {renderBottomNavItem(CalendarClock, t("adminAllReservations"), isBookingsPage, () => navigateTo("/bookings"))}
            {renderBottomNavItem(Bell, t("navNotifications"), isNotificationsPage, openAllNotifications, unreadNotifications)}
          </>
        ) : (
          <>
            {userTerritoriesCount != null && userTerritoriesCount !== 0 && renderBottomNavItem(Home, t("navDashboard"), !isNotificationsPage && !isBookingsPage && !isTerritoriesPage, () => navigateTo("/"))}
            {userTerritoriesCount != null && userTerritoriesCount !== 0 && renderBottomNavItem(CalendarClock, t("navMyBookings"), isBookingsPage, () => navigateTo("/bookings"))}
            {userTerritoriesCount != null && userTerritoriesCount !== 0 && renderBottomNavItem(Bell, t("navNotifications"), isNotificationsPage, openAllNotifications, unreadNotifications)}
            {renderBottomNavItem(MapPin, t("navTerritories"), isTerritoriesPage || userTerritoriesCount === 0, () => navigateTo("/territories"))}
          </>
        )}
      </nav>
      <AuthPortal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        initialEmail={resetEmail}
        onAuthSuccess={handleAuthSuccess}
        onResetReturn={returnFromPasswordReset}
        resetReturnLabel={t("authBack")}
      />
    </div>
  );

  if (isAuthenticated) {
    return authenticatedShell;
  }

  return (
    <div className={`min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-gray-950 dark:text-white transition-[filter] duration-200 ${authOpen ? "blur-sm" : ""}`}>
      <header className="sticky top-0 z-[70] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <InlineMachine size={44} drumColor="#0f6bff" />
            <span className="hidden text-xl font-bold tracking-tight text-slate-950 sm:block dark:text-white">
              {t("appTitle")}
            </span>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <button
              onClick={openSignIn}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:text-blue-200"
            >
              {t("signIn")}
            </button>
            <button
              onClick={openSignUp}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              {t("signUp")}
            </button>
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              onClick={openSignIn}
              className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 dark:border-gray-700 dark:text-gray-200"
            >
              {t("signIn")}
            </button>
            <button
              onClick={openSignUp}
              className="h-8 rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white"
            >
              {t("signUp")}
            </button>
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 sm:px-6">

        <section className="py-16 text-center sm:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl xl:text-6xl">
            {t("appTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xl font-semibold text-slate-600 dark:text-gray-300 sm:text-2xl">
            {t("landingHeroSubtitle")}
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-500 dark:text-gray-400">
            {t("landingHeroDescription")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openSignUp}
                className="h-14 rounded-xl bg-blue-600 px-10 text-lg font-bold text-white shadow-md transition hover:bg-blue-700"
              >
                {t("heroPrimaryCta")}
              </button>
              <button
                onClick={openSignIn}
                className="h-14 rounded-xl border border-slate-300 bg-white px-10 text-lg font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t("heroSecondaryCta")}
              </button>
            </div>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("landingHeroCtaHowItWorks")}
            </button>
          </div>
        </section>

        <section className="mb-20 rounded-2xl bg-slate-50 px-6 py-10 dark:bg-gray-800/50 sm:px-10">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {t("landingAboutTitle")}
          </h2>
          <div className="space-y-3 text-base leading-7 text-slate-600 dark:text-gray-300">
            <p>{t("landingAboutText1")}</p>
            <p>{t("landingAboutText2")}</p>
            <p>{t("landingAboutText3")}</p>
          </div>
        </section>

        <section id="how-it-works" className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {t("landingStepsTitle")}
          </h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ["landingStep1Title", "landingStep1Text"],
              ["landingStep2Title", "landingStep2Text"],
              ["landingStep3Title", "landingStep3Text"],
              ["landingStep4Title", "landingStep4Text"],
              ["landingStep5Title", "landingStep5Text"],
              ["landingStep6Title", "landingStep6Text"],
              ["landingStep7Title", "landingStep7Text"],
            ] as const).map(([titleKey, textKey], idx) => (
              <li
                key={idx}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t(titleKey)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">{t(textKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {t("landingHelpTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
              {t("landingHelpSubtitle")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["howItWorks2Title", "howItWorks2Text"],
              ["howItWorks4Title", "howItWorks4Text"],
              ["howItWorks5Title", "howItWorks5Text"],
              ["howItWorks6Title", "howItWorks6Text"],
              ["howItWorks7Title", "howItWorks7Text"],
              ["howItWorks8Title", "howItWorks8Text"],
              ["howItWorks9Title", "howItWorks9Text"],
              ["howItWorks10Title", "howItWorks10Text"],
              ["howItWorks12Title", "howItWorks12Text"],
              ["howItWorks13Title", "howItWorks13Text"],
            ] as const).map(([titleKey, textKey], idx) => (
              <article
                key={idx}
                tabIndex={0}
                className="group rounded-xl border border-slate-200 bg-white p-5 outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-300 focus:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-800 dark:focus:border-blue-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{t(titleKey)}</p>
                  <span className="text-xs font-semibold text-blue-600 opacity-80 dark:text-blue-300">
                    {t("landingHelpReveal")}
                  </span>
                </div>
                <p className="mt-2 max-h-0 overflow-hidden text-sm leading-6 text-slate-500 opacity-0 transition-all duration-200 group-hover:max-h-56 group-hover:opacity-100 group-focus:max-h-56 group-focus:opacity-100 dark:text-gray-400">
                  {t(textKey)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-20 rounded-2xl bg-blue-50 px-6 py-10 dark:bg-blue-950/30 sm:px-10">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {t("landingBenefitsTitle")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              "landingBenefit1",
              "landingBenefit2",
              "landingBenefit3",
              "landingBenefit4",
              "landingBenefit5",
              "landingBenefit6",
            ] as const).map((key, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm font-medium text-slate-700 dark:text-gray-200">
                <span className="mt-0.5 text-blue-600 dark:text-blue-400">✓</span>
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-24 rounded-2xl border border-slate-200 bg-white px-6 py-10 dark:border-gray-700 dark:bg-gray-900 sm:px-10">
          <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {t("landingAdminSectionTitle")}
          </h2>
          <p className="mb-6 text-base leading-7 text-slate-600 dark:text-gray-300">
            {t("landingAdminSectionText")}
          </p>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            {t("landingAdminRoleSubtitle")}
          </h3>
          <p className="mb-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
            {t("landingAdminRoleText")}
          </p>
          <a
            href="mailto:admin@gmail.com"
            className="mb-2 inline-block text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            admin@gmail.com
          </a>
          <p className="text-sm leading-6 text-slate-500 dark:text-gray-400">
            {t("landingAdminContactHint")}
          </p>
        </section>

        <div className="pb-4" />
      </main>

      <AuthPortal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        initialEmail={resetEmail}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
