import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useI18n } from "../../app-shell/i18n-context";
import { apiClient } from "../../shared/apiClient";
import { ModalShell } from "../../ui-kit/ModalShell";
import { AdminUserItem, UserInfo, UserRole } from "../../shared/auth-types";

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

type CodeItem = {
  code: string;
  name: string;
};

export function AccountMenu({ user, onLogout, onChangePassword }: AccountMenuProps) {
  const { t, lang, setLang } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const [codesOpen, setCodesOpen] = useState(false);
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [newCode, setNewCode] = useState("");
  const [codesError, setCodesError] = useState<string | null>(null);

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

  const handleAddCode = () => {
    const value = newCode.trim();
    if (value.length < 4) {
      setCodesError(t("profileCodesErrorInvalid"));
      return;
    }
    if (codes.some(c => c.code.toLowerCase() === value.toLowerCase())) {
      setCodesError(t("profileCodesErrorDuplicate"));
      return;
    }
    const item: CodeItem = { code: value, name: value };
    setCodes(prev => [...prev, item]);
    setNewCode("");
    setCodesError(null);
  };

  const openCodesModal = () => {
    setCodesOpen(true);
    setMenuOpen(false);
  };

  const roleName = (r: UserRole) => {
    if (r === "admin") return t("authRoleAdmin");
    if (r === "superadmin") return t("authRoleSuperAdmin");
    return t("authRoleUser");
  };

  const displayUserId = (u: AdminUserItem) => `User#${u.id}`;

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
      <div className="relative">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
            {roleLabel[0]}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {roleLabel}
            </span>
            <span className="text-sm font-semibold">
              {roleLabel} {idLabel}
            </span>
          </div>
          <ChevronDown size={16} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-40">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {roleLabel} {idLabel}
              </div>
              <div className="text-sm font-medium">
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
                    <ChevronDown size={12} />
                  </span>
                </button>
                {languageOpen && (
                  <div className="absolute top-full right-full mt-1 mr-2 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50">
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
        <ModalShell open={codesOpen} onClose={() => setCodesOpen(false)}>
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
              onClick={() => setCodesOpen(false)}
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
                <ul className="space-y-2 max-h-40 overflow-y-auto">
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
                  onClick={handleAddCode}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  {t("profileCodesAdd")}
                </button>
              </div>
              {codesError && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {codesError}
                </div>
              )}
            </div>
          </div>
        </ModalShell>
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
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={18} />
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
