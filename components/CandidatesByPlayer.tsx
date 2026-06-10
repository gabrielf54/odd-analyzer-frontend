import type { Candidate } from "@/lib/types";
import { Tag } from "@/components/ui";
import { InvestigationTrace } from "@/components/InvestigationTrace";
import { friendlyLine, evToReais, riscoLabel } from "@/lib/format";

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const STANCE_ICON = { concorda: "✅", ressalva: "⚠️", veta: "⛔" } as const;

/** Agrupa candidatos por jogador preservando a ordem global (risco→EV). Assim a
 * mesma pessoa em várias linhas vira UM bloco ("escolha uma linha"), não N apostas. */
function groupByPlayer(candidates: Candidate[]): { jogador: string; linhas: Candidate[] }[] {
  const ordem: string[] = [];
  const mapa = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (!mapa.has(c.jogador)) { mapa.set(c.jogador, []); ordem.push(c.jogador); }
    mapa.get(c.jogador)!.push(c);
  }
  return ordem.map((jogador) => ({ jogador, linhas: mapa.get(jogador)! }));
}

export function CandidatesByPlayer({ candidates }: { candidates: Candidate[] }) {
  if (!candidates.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-8 text-center">
        <p className="display text-base font-bold text-muted">nenhuma oportunidade clara</p>
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-faint">
          ninguém passou nos cortes (edge ≥ 0.04 · ev ≥ 0.05 · titular confirmado · amostra ≥ 10).
          <br />lista vazia é um resultado válido — não forçar aposta.
        </p>
      </div>
    );
  }

  const grupos = groupByPlayer(candidates);

  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => (
        <div key={g.jogador} className="rounded-sm border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
            <span className="display text-[0.95rem] font-bold text-fg">{g.jogador}</span>
            {g.linhas.length > 1 && (
              <span className="text-[0.62rem] text-faint">{g.linhas.length} linhas — escolha uma</span>
            )}
          </div>
          <div className="flex flex-col divide-y divide-line-soft">
            {g.linhas.map((c, i) => {
              const risco = c.risco ? riscoLabel(c.risco) : null;
              return (
                <div key={i} className={`px-3 py-2.5 ${c.recomendado ? "bg-[rgba(37,224,138,0.05)]" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {c.recomendado && <span title="recomendada">⭐</span>}
                    <span className="display text-[0.85rem] font-semibold text-fg">
                      {friendlyLine(c.market_type, c.linha)}
                    </span>
                    <span className="mono text-xs text-muted">@ {c.odd}</span>
                    {risco && <Tag tone={risco.tone}>{risco.emoji} {risco.texto}</Tag>}
                    {c.ia_revisao && (
                      <span className="text-sm" title={c.ia_revisao.nota ?? "IA concorda"}>
                        {STANCE_ICON[c.ia_revisao.stance]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.72rem] text-muted">
                    <span>modelo <strong className="text-fg">{pct(c.prob_modelo)}</strong> vs casa {pct(c.prob_devig)}</span>
                    <span>retorno <strong className="text-value">{evToReais(c.ev)}</strong></span>
                  </div>
                  {c.trace && (
                    <details className="group/inv mt-1.5">
                      <summary className="display inline-flex cursor-pointer items-center gap-1 text-[0.66rem] font-semibold text-faint hover:text-fg">
                        <span className="transition-transform group-open/inv:rotate-90">▸</span> mostrar investigação
                      </summary>
                      <div className="mt-2"><InvestigationTrace trace={c.trace} /></div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
