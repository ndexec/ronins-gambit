import { useEffect, useMemo, useState } from "react";

const KEY = "ronin-theme";
type Mode = "dark" | "light";

export function useThemeMode() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Mode) ?? "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", mode === "light");
    localStorage.setItem(KEY, mode);
  }, [mode]);

  return useMemo(() => ({ mode, setMode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }), [mode]);
}
