import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../../app-shell/i18n-context";
import { UserInfo } from "../../shared/auth-types";

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
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setLanguageOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="relative z-[80]" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-shadow hover:shadow dark:border-gray-600 dark:bg-gray-800"
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
          {roleLabel[0]}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-tight max-w-[180px]">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {maskedEmail}
          </span>
          <span className="text-sm font-semibold">
            {`${roleLabel} ${idLabel}`}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`hidden sm:block transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-[90] overflow-hidden">
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
  );
}
