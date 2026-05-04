import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../app-shell/i18n-context";

type LanguageItem = {
  code: "en" | "pl";
  label: string;
  short: string;
};

const languages: LanguageItem[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "pl", label: "Polski", short: "PL" }
];

function LanguageSelectorInner() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = languages.find(l => l.code === lang) ?? languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
      >
        <span className="font-semibold">{current.short}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50">
          {languages.map(item => (
            <button
              key={item.code}
              onClick={() => {
                setLang(item.code);
                setOpen(false);
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
  );
}

export const LanguageSelector = LanguageSelectorInner;
export default LanguageSelectorInner;
