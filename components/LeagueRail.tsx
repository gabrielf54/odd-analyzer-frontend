"use client";

import { useMemo, useState } from "react";
import type { League } from "@/lib/types";

export function LeagueRail({
  leagues,
  active,
  onSelect,
  loading,
}: {
  leagues: League[];
  active: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leagues;
    return leagues.filter((l) => l.nome.toLowerCase().includes(term));
  }, [leagues, q]);

  return (
    <nav className="flex flex-col gap-2">
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="filtrar liga…"
        aria-label="filtrar liga"
      />

      <div className="flex max-h-[calc(100vh-13rem)] flex-col gap-0.5 overflow-y-auto pr-1">
        {leagues.length === 0 ? (
          <span className="px-1 text-[0.72rem] text-faint">{loading ? "carregando…" : "sem ligas"}</span>
        ) : filtered.length === 0 ? (
          <span className="px-1 text-[0.72rem] text-faint">nada para “{q}”.</span>
        ) : (
          filtered.map((l) => {
            const on = String(l.id) === active;
            return (
              <button
                key={l.id}
                onClick={() => onSelect(String(l.id))}
                className={`shrink-0 truncate rounded-sm border-l-2 px-2.5 py-1.5 text-left text-[0.78rem] transition-colors ${
                  on
                    ? "border-value bg-panel-2 text-fg"
                    : "border-transparent text-muted hover:bg-panel hover:text-fg"
                }`}
              >
                {l.nome}
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}
