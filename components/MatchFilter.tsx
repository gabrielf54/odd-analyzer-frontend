"use client";

import type { Period } from "@/lib/matchFilter";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Próximos 7 dias" },
];

export function MatchFilter({
  search,
  setSearch,
  period,
  setPeriod,
}: {
  search: string;
  setSearch: (v: string) => void;
  period: Period;
  setPeriod: (p: Period) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <input
        className="input sm:max-w-[16rem]"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="buscar time…"
        aria-label="buscar time"
      />
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
                on
                  ? "border-value text-value bg-[rgba(37,224,138,0.07)]"
                  : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
