"use client";
import { Sun, Moon } from "lucide-react";
import { useThemeCtx } from "../providers/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeCtx();
  const isDark = (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) || theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
