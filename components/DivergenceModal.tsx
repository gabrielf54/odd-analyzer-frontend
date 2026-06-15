"use client";

import { useEffect } from "react";
import { BookBadge } from "@/components/BookBadge";
import type { CollectResult } from "@/lib/api";

type Divergencia = CollectResult["divergencias"][number];

/* Modal investigativo das divergências cross-casa. Cada item: a aposta + as casas que
   discordam, com odd e chance implícita. Só revisão — nada é apostado/descartado sozinho.
   Fecha com X, Esc ou clique no fundo. */
export function DivergenceModal({
  divergencias, onClose,
}: { divergencias: Divergencia[] | null; onClose: () => void }) {
  useEffect(() => {
    if (!divergencias) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [divergencias, onClose]);

  if (!divergencias) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 cursor-default bg-bg/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog" aria-modal="true" aria-labelledby="diverg-title"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-md border border-line bg-panel p-5 shadow-xl"
      >
        <header className="flex items-start justify-between gap-2 border-b border-line-soft pb-3">
          <div>
            <h2 id="diverg-title" className="display text-lg font-extrabold text-fg">⚠ divergências entre casas</h2>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
              mesma aposta, casas discordando muito da chance. pode ser{" "}
              <span className="text-value">valor real</span> ou{" "}
              <span className="text-warn">erro de definição</span> (a casa conta a aposta diferente).
              só revisão — nada é apostado sozinho.
            </p>
          </div>
          <button
            onClick={onClose} aria-label="fechar"
            className="rounded-sm border border-line px-2 py-1 text-[0.8rem] text-muted transition-colors hover:border-bad hover:text-bad"
          >✕</button>
        </header>

        <ul className="flex flex-col gap-2.5">
          {divergencias.map((d, i) => {
            const books = [...(d.books ?? [])].sort((a, b) => b.impl - a.impl);
            return (
              <li key={i} className="rounded-sm border border-line-soft bg-panel-2 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.82rem] font-semibold text-fg">{d.entidade}</span>
                  <span className="shrink-0 rounded-sm border border-warn/40 px-1.5 py-px text-[0.62rem] text-warn">
                    {d.spread_pp}pp de diferença
                  </span>
                </div>
                <p className="mt-0.5 text-[0.66rem] text-faint">{d.market_type} · linha {d.linha}</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {books.map((b, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 text-[0.72rem]">
                      <BookBadge book={b.book} />
                      <span className="mono text-muted">
                        odd {(1 / b.impl).toFixed(2)} ·{" "}
                        <span className="text-fg">{Math.round(b.impl * 100)}%</span> implícita
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
