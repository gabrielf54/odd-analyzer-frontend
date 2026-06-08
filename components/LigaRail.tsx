"use client";

import { useMemo, useState } from "react";
import type { Liga } from "@/lib/types";

export function LigaRail({
  ligas,
  ativa,
  onSelect,
  loading,
}: {
  ligas: Liga[];
  ativa: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return ligas;
    return ligas.filter((l) => l.nome.toLowerCase().includes(termo));
  }, [ligas, q]);

  return (
    <nav className="flex flex-col gap-2">
      <span className="overline block">ligas</span>

      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="filtrar liga…"
        aria-label="filtrar liga"
      />

      <div className="flex max-h-[calc(100vh-13rem)] flex-col gap-0.5 overflow-y-auto pr-1">
        {ligas.length === 0 ? (
          <span className="px-1 text-[0.72rem] text-faint">{loading ? "carregando…" : "sem ligas"}</span>
        ) : filtradas.length === 0 ? (
          <span className="px-1 text-[0.72rem] text-faint">nada para “{q}”.</span>
        ) : (
          filtradas.map((l) => {
            const on = String(l.id) === ativa;
            return (
              <button
                key={l.id}
                onClick={() => onSelect(String(l.id))}
                className={`truncate rounded-sm border-l-2 px-2.5 py-1.5 text-left text-[0.78rem] transition-colors ${
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
