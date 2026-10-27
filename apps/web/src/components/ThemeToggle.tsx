import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem("theme");
      if (stored !== "light" && stored !== "dark") {
        const nextSystemTheme: Theme = e.matches ? "dark" : "light";
        setTheme(nextSystemTheme);
        applyTheme(nextSystemTheme);
      }
    };

    media.addEventListener("change", handleSystemChange);
    return () => {
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)] shadow-sm transition-all hover:bg-[var(--link-bg-hover)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
    >
      <SunIcon
        size={18}
        weight="bold"
        className="hidden dark:block text-amber-400 transition-transform duration-200"
      />
      <MoonIcon
        size={18}
        weight="bold"
        className="block dark:hidden text-slate-700 transition-transform duration-200"
      />
    </button>
  );
}
