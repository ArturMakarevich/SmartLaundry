import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../../app-shell/i18n-context";
import { apiClient } from "../../shared/apiClient";
import { AdminUserItem, UserInfo, UserRole } from "../../shared/auth-types";
import { ModalShell } from "../../ui-kit/ModalShell";
import { CodesModal } from "./CodesModal";
import { Territory, TerritoryFormModal } from "./TerritoryFormModal";

type AccountMenuProps = {
  user: UserInfo;
  onLogout: () => void;
  onChangePassword: () => void;
};

type LanguageItem = {
  code: "en" | "pl";
  label: string;
  short: string;
};

const languages: LanguageItem[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "pl", label: "Polski", short: "PL" }
];

export function AccountMenu({ user, onLogout, onChangePassword }: AccountMenuProps) {
  const { t, lang, setLang } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const [codesOpen, setCodesOpen] = useState(false);
  const [userCodes, setUserCodes] = useState<string[]>([]);

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [territoryModalOpen, setTerritoryModalOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);

  const [usersOpen, setUsersOpen] = useState(false);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const roleLabel =
    user.role === "admin"
      ? t("authRoleAdmin")
      : user.role === "superadmin"
      ? t("authRoleSuperAdmin")
      : t("authRoleUser");

  const maskedEmail =
    user.email.length <= 5
      ? user.email + "*****"
      : user.email.slice(0, 5) + "*****";

  const idLabel = user.id > 0 ? `#${user.id}` : "#?";

  const currentLanguage = languages.find(l => l.code === lang) ?? languages[0];

  useEffect(() => {
    if (!menuOpen) {
      setLanguageOpen(false);
    }
  }, [menuOpen]);

  const handleAddCode = async (value: string): Promise<string | null> => {
    const v = value.trim();
    if (v.length < 4) {
      return t("profileCodesErrorInvalid");
    }
    if (userCodes.some(c => c.toLowerCase() === v.toLowerCase())) {
      return t("profileCodesErrorDuplicate");
    }
    try {
      await apiClient.post("territories/join/", { code: v });
      setUserCodes(prev => [...prev, v]);
      return null;
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail) return String(detail);
      return t("profileCodesErrorInvalid");
    }
  };

  const openCodesModal = () => {
    if (user.role === "admin" || user.role === "superadmin") {
      loadAdminTerritories();
    } else {
      loadUserCodes();
    }
    setCodesOpen(true);
    setMenuOpen(false);
  };

  const openTerritoryCreate = () => {
    setEditingTerritory(null);
    setTerritoryModalOpen(true);
  };

  const openTerritoryEdit = (territory: Territory) => {
    setEditingTerritory(territory);
    setTerritoryModalOpen(true);
  };

  const handleSaveTerritory = async (territory: Territory): Promise<string | null> => {
    const payload = {
      name: territory.name,
      zones: Array.from({ length: territory.zones }).map((_, zoneIdx) => {
        const machines = territory.machines.filter(m => m.zoneIndex === zoneIdx);
        const desc = territory.zoneDescriptions?.[zoneIdx] || "";
        return {
          name: `${t("territoryZoneLabel")} ${zoneIdx + 1}${desc ? ` (${desc})` : ""}`,
          description: territory.zoneDescriptions?.[zoneIdx] || "",
          order: zoneIdx,
          machines: machines.map(m => ({
            number: m.number,
            model_name: m.model,
            instructions_found: m.found,
            programs: m.programs.map(p => ({
              name: p.name,
              duration_minutes: p.duration_minutes
            })),
            status: "available",
          })),
        };
      }),
    };

    const isNew = territory.code === "" || territory.id.startsWith("terr-");
    try {
      const response = isNew
        ? await apiClient.post("territories/admin/", payload)
        : await apiClient.patch(`territories/admin/${territory.id}/`, payload);
      const normalized = normalizeTerritory(response.data);
      setTerritories(prev => {
        const exists = prev.find(t => t.id === normalized.id);
        if (exists) {
          return prev.map(t => (t.id === normalized.id ? normalized : t));
        }
        return [...prev, normalized];
      });
      if (isNew) {
        setCodesOpen(true);
        setMenuOpen(false);
      }
      return null;
    } catch (err: any) {
      const data = err?.response?.data || {};
      const detail = data?.detail;
      if (typeof detail === "string") return detail;
      const nameError = Array.isArray(data?.name) ? data.name[0] : null;
      if (nameError) return String(nameError);
      const nonField = Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : null;
      if (nonField) return String(nonField);
      return t("territoryErrorSaveFailed");
    }
  };

  const roleName = (r: UserRole) => {
    if (r === "admin") return t("authRoleAdmin");
    if (r === "superadmin") return t("authRoleSuperAdmin");
    return t("authRoleUser");
  };

  const normalizeTerritory = (data: any): Territory => {
    const zonesArr = Array.isArray(data?.zones) ? data.zones : [];
    const machines: Territory["machines"] = [];
    const machinesPerZone: number[] = [];
    const zoneDescriptions: string[] = [];
    zonesArr.forEach((z: any, zoneIdx: number) => {
      const mz = Array.isArray(z?.machines) ? z.machines : [];
      machinesPerZone[zoneIdx] = mz.length || 1;
      zoneDescriptions[zoneIdx] = z?.description || "";
      mz.forEach((m: any, idx: number) => {
        const programs = Array.isArray(m?.programs)
          ? m.programs.map((p: any) => ({
              name: p?.name || "Program",
              duration_minutes: Number(p?.duration_minutes) || 0,
            }))
          : [];
        machines.push({
          id: String(m?.id || `${data?.id}-${zoneIdx}-${idx}`),
          zoneIndex: zoneIdx,
          number: Number(m?.number) || idx + 1,
          model: m?.model_name || "",
          found: Boolean(m?.instructions_found) || programs.length > 0,
          programs,
        });
      });
    });
    return {
      id: String(data?.id || ""),
      name: data?.name || "",
      code: data?.code || "",
      zones: zonesArr.length || 1,
      machinesPerZone: machinesPerZone.length ? machinesPerZone : [1],
      zoneDescriptions,
      machines,
    };
  };

  const displayUserId = (u: AdminUserItem) => `User#${u.id}`;

  useEffect(() => {
    if (user.role === "admin" || user.role === "superadmin") {
      loadAdminTerritories();
    } else {
      loadUserCodes();
    }
  }, [user.role]);

  const loadUsers = async () => {
    setUsersError(null);
    try {
      setUsersLoading(true);
      const response = await apiClient.get("accounts/admin/users/");
      setUsers(response.data as AdminUserItem[]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setUsersError(typeof detail === "string" ? detail : t("profileUsersErrorLoad"));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAdminTerritories = async () => {
    try {
      const response = await apiClient.get("territories/admin/");
      const items = Array.isArray(response.data) ? response.data.map(normalizeTerritory) : [];
      setTerritories(items);
    } catch {
      // ignore
    }
  };

  const loadUserCodes = async () => {
    try {
      const response = await apiClient.get("territories/mine/");
      const codes = Array.isArray(response.data)
        ? response.data.map((item: any) => item?.territory?.code).filter(Boolean)
        : [];
      setUserCodes(codes);
    } catch {
      // ignore
    }
  };

  const openUsersModal = () => {
    setUsersOpen(true);
    setMenuOpen(false);
    loadUsers();
  };

  const handleUserAction = async (
    target: AdminUserItem,
    action: "block" | "unblock" | "make_admin" | "make_user"
  ) => {
    setUsersError(null);
    try {
      setUsersLoading(true);
      const response = await apiClient.post(
        `accounts/admin/users/${target.id}/action/`,
        { action }
      );
      const updated = response.data as AdminUserItem;
      setUsers(prev =>
        prev.map(u => (u.id === updated.id ? updated : u))
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setUsersError(typeof detail === "string" ? detail : t("profileUsersErrorAction"));
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <>
      <div className="relative z-[80]">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm shadow-sm hover:shadow transition-shadow"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
            {roleLabel[0]}
          </div>
          <div className="flex flex-col items-start leading-tight max-w-[180px]">
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {maskedEmail}
            </span>
            <span className="text-sm font-semibold">
              {`${roleLabel} ${idLabel}`}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-[90]">
            <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  {`${roleLabel} ${idLabel}`}
                </div>
                {(user.role === "admin" || user.role === "superadmin") && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                    {roleLabel}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">
                {maskedEmail}
              </div>
            </div>

            <div className="py-2">
              <div className="relative">
                <button
                  onClick={() => setLanguageOpen(prev => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>{t("profileLanguage")}</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span>{currentLanguage.short}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${languageOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {languageOpen && (
                  <div className="absolute top-full right-2 mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-[95]">
                    {languages.map(item => (
                      <button
                        key={item.code}
                        onClick={() => {
                          setLang(item.code);
                          setLanguageOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          item.code === lang ? "font-semibold" : ""
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.short}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={openCodesModal}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("profileCodes")}
              </button>
              {(user.role === "admin" || user.role === "superadmin") && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openTerritoryCreate();
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("territoryFormTitle")}
                </button>
              )}

              {user.role === "superadmin" && (
                <button
                  onClick={openUsersModal}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("profileAllUsers")}
                </button>
              )}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onChangePassword();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("profileChangePassword")}
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2">
              <button
                onClick={() => {
                  onLogout();
                  setMenuOpen(false);
                }}
                className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t("profileLogout")}
              </button>
            </div>
          </div>
        )}
      </div>

      {codesOpen && (
        <CodesModal
          open={codesOpen}
          onClose={() => setCodesOpen(false)}
          role={user.role}
          territories={territories}
          onEditTerritory={openTerritoryEdit}
          onCreateTerritory={openTerritoryCreate}
          userCodes={userCodes}
          onAddUserCode={(code) => handleAddCode(code)}
        />
      )}

      {territoryModalOpen && (
        <TerritoryFormModal
          open={territoryModalOpen}
          onClose={() => setTerritoryModalOpen(false)}
          initial={editingTerritory}
          onSave={handleSaveTerritory}
        />
      )}

      {usersOpen && (
        <ModalShell open={usersOpen} onClose={() => setUsersOpen(false)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {t("profileUsersMenuTitle")}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profileUsersMenuDescription")}
              </p>
            </div>
            <button
              onClick={() => setUsersOpen(false)}
              className="p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronDown size={18} className="rotate-180" />
            </button>
          </div>

          {usersError && (
            <div className="mb-3 text-xs text-red-600 dark:text-red-400">
              {usersError}
            </div>
          )}

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-3 font-medium">
                    {t("profileUsersTableHeaderUser")}
                  </th>
                  <th className="text-left py-2 pr-3 font-medium">
                    {t("profileUsersTableHeaderEmail")}
                  </th>
                  <th className="text-left py-2 pr-3 font-medium">
                    {t("profileUsersTableHeaderRole")}
                  </th>
                  <th className="text-left py-2 pr-3 font-medium">
                    {t("profileUsersTableHeaderStatus")}
                  </th>
                  <th className="text-right py-2 pl-3 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-4 text-center text-xs text-gray-500 dark:text-gray-400"
                    >
                      {usersLoading
                        ? t("profileUsersLoading")
                        : t("profileUsersNoData")}
                    </td>
                  </tr>
                ) : (
                  users.map(u => {
                    const isSelf = u.id === user.id;
                    const isSuper = u.role === "superadmin";
                    const canChangeRole = !isSelf && !isSuper;
                    const canBlock = !isSelf && !isSuper;

                    return (
                      <tr
                        key={u.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {displayUserId(u)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {u.email}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {roleName(u.role)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {u.is_active
                            ? t("profileUsersStatusActive")
                            : t("profileUsersStatusBlocked")}
                        </td>
                        <td className="py-2 pl-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            disabled={!canChangeRole || usersLoading}
                            onClick={() =>
                              handleUserAction(
                                u,
                                u.role === "admin" ? "make_user" : "make_admin"
                              )
                            }
                            className={`px-2 py-1 rounded text-xs ${
                              canChangeRole
                                ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                : "bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            {u.role === "admin"
                              ? t("profileUsersMakeUser")
                              : t("profileUsersMakeAdmin")}
                          </button>
                          <button
                            disabled={!canBlock || usersLoading}
                            onClick={() =>
                              handleUserAction(
                                u,
                                u.is_active ? "block" : "unblock"
                              )
                            }
                            className={`px-2 py-1 rounded text-xs ${
                              canBlock
                                ? u.is_active
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60"
                                : "bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            {u.is_active
                              ? t("profileUsersBlock")
                              : t("profileUsersUnblock")}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </>
  );
}
