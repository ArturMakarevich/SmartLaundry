import { Moon, Sun } from "lucide-react";
import { useTheme } from "../app-shell/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
