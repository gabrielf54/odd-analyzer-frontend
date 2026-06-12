"use client";

import type { Match } from "@/lib/types";
import { tabLabel } from "@/lib/tabs";

/* Barra de abas de jogos estilo editor (VSCode) no tema Quant Terminal.
   Aba ativa = barra verde no topo + fundo de painel; inativa = apagada, acende
   no hover. O × só aparece na ativa ou no hover (igual editor). Rola na horizontal
   quando estoura a largura (scrollbar fininha de terminal já vem do globals). */
export function GameTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: Match[];
  activeId: string;
  onSelect: (m: Match) => void;
  onClose: (id: string) => void;
}) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-line bg-panel/30">
      <span className="flex shrink-0 select-none items-center gap-1.5 border-r border-line px-3 text-faint">
        <span className="text-[0.78rem] leading-none">⌗</span>
        <span className="overline hidden sm:inline">abas · {tabs.length}</span>
      </span>

      {tabs.map((t) => {
        const active = String(t.id) === activeId;
        return (
          <div
            key={String(t.id)}
            className={`group relative flex shrink-0 items-center gap-2 border-r border-line py-2 pl-3 pr-2 transition-colors ${
              active
                ? "bg-panel text-fg"
                : "bg-transparent text-muted hover:bg-panel-2 hover:text-fg"
            }`}
          >
            {active && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-value shadow-[0_0_10px_rgba(37,224,138,0.6)]" />
            )}

            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                active
                  ? "bg-value shadow-[0_0_6px_rgba(37,224,138,0.85)]"
                  : "bg-faint group-hover:bg-muted"
              }`}
            />

            <button
              type="button"
              onClick={() => onSelect(t)}
              title={tabLabel(t)}
              className="mono max-w-[160px] truncate text-[0.72rem] leading-none"
            >
              {tabLabel(t)}
            </button>

            <button
              type="button"
              onClick={() => onClose(String(t.id))}
              aria-label={`fechar ${tabLabel(t)}`}
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm text-sm leading-none text-faint transition-all hover:bg-line hover:text-bad ${
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
