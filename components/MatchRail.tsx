"use client";
import type { Match } from "@/lib/types";
import { localTime } from "@/lib/date";

/** Coluna 2: jogos (não iniciados) da liga selecionada. Estreita e vertical;
 *  clicar abre o jogo no conteúdo (col 3). */
export function MatchRail({ matches, activeId, onSelect, loading, empty }: {
  matches: Match[]; activeId: string | null; onSelect: (m: Match) => void; loading: boolean; empty: string;
}) {
  if (loading) return <p className="mono px-2 py-3 text-[0.7rem] text-muted">carregando jogos…</p>;
  if (!matches.length) return <p className="px-2 py-3 text-[0.72rem] text-faint">{empty}</p>;
  return (
    <div className="flex max-h-[calc(100vh-9rem)] flex-col gap-0.5 overflow-y-auto pr-1">
      {matches.map((m) => {
        const active = String(m.id) === activeId;
        const t = localTime(m.data);
        return (
          <button
            key={String(m.id)}
            onClick={() => onSelect(m)}
            className={`shrink-0 rounded-sm border-l-2 px-2 py-1.5 text-left transition-colors ${
              active ? "border-value bg-panel-2 text-fg" : "border-transparent text-muted hover:bg-panel"
            }`}
          >
            <span className="mono block text-[0.62rem] text-faint">{t || "—"}</span>
            <span className="display block truncate text-[0.78rem] font-semibold">
              {m.mandante} <span className="text-faint">×</span> {m.visitante}
            </span>
          </button>
        );
      })}
    </div>
  );
}
