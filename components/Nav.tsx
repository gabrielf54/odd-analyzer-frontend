"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "pré-jogo" },
  { href: "/pos", label: "pós-jogo" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="ml-2 flex items-center gap-1">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.14em] transition-colors ${
              active ? "text-fg" : "text-faint hover:text-muted"
            }`}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-[13px] h-px bg-value shadow-[0_0_10px_1px_rgba(37,224,138,0.7)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
