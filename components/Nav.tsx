"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

type Theme = "light" | "dark" | "system";

const THEME_ICONS: Record<Theme, string> = {
  light: "☀",
  dark: "☽",
  system: "◑",
};

const THEME_CYCLE: Theme[] = ["system", "light", "dark"];

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Search" },
  { href: "/library", label: "Library" },
  { href: "/stats", label: "Stats" },
  { href: "/import", label: "Import" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  }

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-8 h-14">
        <span className="font-semibold text-lg tracking-tight text-stone-900 dark:text-stone-100">bamboo</span>
        <nav className="flex gap-6 text-sm flex-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`transition-colors hover:text-stone-900 dark:hover:text-stone-100 ${
                pathname === href
                  ? "text-stone-900 dark:text-stone-100 font-medium"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors w-5 h-5 flex items-center justify-center"
            aria-label={`Current theme: ${theme}. Click to cycle.`}
          >
            {THEME_ICONS[theme]}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
