"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

const ThemeCtx = React.createContext<Ctx | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("system");

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("theme") as Theme | null) : null;
    if (stored) setTheme(stored);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = theme === "system" ? (isSystemDark ? "dark" : "light") : theme;
    root.classList.toggle("dark", effective === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeCtx() {
  const ctx = React.useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeCtx must be used within ThemeProvider");
  return ctx;
}
