"use client";

import { useEffect } from "react";
import type { Candidate } from "@/lib/types";
import { Tag } from "@/components/ui";
import { lineLabel, displayName, posicaoLabel, titularidadeInfo } from "@/lib/format";
import { playerStatLines, confrontoLines } from "@/lib/detailText";

/* Painel deslizante à direita com o "porquê" do número, em linguagem leiga.
   Fecha com X, Esc ou clique no fundo. Lista continua visível atrás (desktop). */
export function PlayerDetailDrawer({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  useEffect(() => {
    if (!candidate) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [candidate, onClose]);

  if (!candidate) return null;
  const c = candidate;
  const stats = playerStatLines(c);
  const confronto = confrontoLines(c);
  const tit = titularidadeInfo(c);
  const posLabel = posicaoLabel(c.posicao);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label={displayName(c)} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-5">
        <header className="flex items-start justify-between gap-2 border-b border-line-soft pb-3">
          <div>
            <h2 className="display text-xl font-extrabold text-fg">{displayName(c)}</h2>
            <p className="mt-0.5 text-[0.72rem] text-muted">
              {posLabel && <>{posLabel} · </>}
              {lineLabel(c)} <span className="mono">@ {c.odd}</span>
            </p>
            {tit && <div className="mt-1.5"><Tag tone={tit.tone}>{tit.texto}</Tag></div>}
          </div>
          <button onClick={onClose} aria-label="fechar" className="rounded-sm border border-line px-2 py-1 text-[0.8rem] text-muted transition-colors hover:border-bad hover:text-bad">✕</button>
        </header>

        {stats.length > 0 && (
          <section>
            <h3 className="overline mb-2">números do jogador</h3>
            <ul className="flex flex-col gap-1.5">
              {stats.map((s, i) => (
                <li key={i} className="rounded-sm border border-line-soft bg-panel-2 px-3 py-2 text-[0.76rem] leading-relaxed text-fg">{s}</li>
              ))}
            </ul>
          </section>
        )}

        {confronto.length > 0 && (
          <section>
            <h3 className="overline mb-2">o confronto</h3>
            <ul className="flex flex-col gap-1.5">
              {confronto.map((s, i) => (
                <li key={i} className="rounded-sm border border-line-soft bg-panel-2 px-3 py-2 text-[0.76rem] leading-relaxed text-fg">{s}</li>
              ))}
            </ul>
          </section>
        )}

        {c.trace && (
          <section>
            <h3 className="overline mb-2">como chegamos no número</h3>
            <ol className="flex flex-col gap-1.5">
              {c.trace.passos.map((p, i) => (
                <li key={i} className="flex gap-2 text-[0.74rem] leading-relaxed text-muted">
                  <span className="mono shrink-0 text-faint">{i + 1}.</span>
                  <span>{p.frase}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-sm border border-value/30 bg-[rgba(37,224,138,0.06)] px-3 py-2 text-[0.78rem] leading-relaxed text-fg">
              {c.trace.veredito_leigo}
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
