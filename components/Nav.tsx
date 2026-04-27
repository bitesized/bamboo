"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-8 h-14">
        <span className="font-semibold text-lg tracking-tight">bamboo</span>
        <nav className="flex gap-6 text-sm flex-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`transition-colors hover:text-stone-900 ${
                pathname === href ? "text-stone-900 font-medium" : "text-stone-500"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
