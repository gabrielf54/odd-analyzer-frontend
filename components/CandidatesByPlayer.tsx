"use client";

import { useState } from "react";
import type { Candidate } from "@/lib/types";
import { Tag } from "@/components/ui";
import { lineLabel, displayName, evToPct, riscoLabel, titularidadeInfo, posicaoLabel } from "@/lib/format";
import { marketNoun } from "@/lib/detailText";
import { applyFilters, toggleIn } from "@/lib/candidateFilters";
import type { CandidateFilters } from "@/lib/candidateFilters";

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const STANCE_ICON = { concorda: "✅", ressalva: "⚠️", veta: "⛔" } as const;
const STANCE_TEXTO = { concorda: "IA concorda", ressalva: "IA com ressalva", veta: "IA não recomenda" } as const;

const RISCO_CHIPS: Array<{ key: string; label: string }> = [
  { key: "seguro", label: "seguro" },
  { key: "moderado", label: "moderado" },
  { key: "tiro_longo", label: "tiro-longo" },
];

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

/** Retorna os market_type distintos presentes na lista, preservando ordem de aparição. */
function distinctMarkets(candidates: Candidate[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c.market_type)) { seen.add(c.market_type); out.push(c.market_type); }
  }
  return out;
}

export function CandidatesByPlayer({ candidates, onDetail }: { candidates: Candidate[]; onDetail: (c: Candidate) => void }) {
  const [filters, setFilters] = useState<CandidateFilters>({ mercados: [], riscos: [] });

  if (!candidates.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-8 text-center">
        <p className="display text-base font-bold text-muted">nenhuma oportunidade clara</p>
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-faint">
          ninguém passou nos cortes do sistema (vantagem mínima, titularidade, histórico suficiente).
          <br />lista vazia é um resultado válido — não forçar aposta.
        </p>
      </div>
    );
  }

  const markets = distinctMarkets(candidates);
  const visible = applyFilters(candidates, filters);
  const grupos = groupByPlayer(visible);
  const isFiltered = filters.mercados.length > 0 || filters.riscos.length > 0;

  const chipBase = "rounded-sm px-2.5 py-1 text-[0.66rem] uppercase tracking-[0.12em] border transition-colors cursor-pointer";
  const chipActive = "border-value/50 text-value bg-[rgba(37,224,138,0.08)]";
  const chipInactive = "border-line text-faint hover:text-muted";

  return (
    <div className="flex flex-col gap-3">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {markets.map((m) => {
          const active = filters.mercados.includes(m);
          return (
            <button
              key={m}
              aria-pressed={active}
              className={`${chipBase} ${active ? chipActive : chipInactive}`}
              onClick={() => setFilters((f) => ({ ...f, mercados: toggleIn(f.mercados, m) }))}
            >
              {marketNoun(m)}
            </button>
          );
        })}
        {markets.length > 0 && RISCO_CHIPS.length > 0 && (
          <span className="mx-1 h-3 w-px bg-line" aria-hidden />
        )}
        {RISCO_CHIPS.map(({ key, label }) => {
          const active = filters.riscos.includes(key);
          return (
            <button
              key={key}
              aria-pressed={active}
              className={`${chipBase} ${active ? chipActive : chipInactive}`}
              onClick={() => setFilters((f) => ({ ...f, riscos: toggleIn(f.riscos, key) }))}
            >
              {label}
            </button>
          );
        })}
        {isFiltered && (
          <span className="ml-auto text-[0.66rem] text-faint">
            {visible.length} de {candidates.length}
          </span>
        )}
      </div>

      {/* Player groups */}
      {grupos.map((g) => {
        const firstLine = g.linhas[0]!;
        const hasRecommended = g.linhas.some((c) => c.recomendado);
        const posLabel = posicaoLabel(firstLine.posicao);
        const tit = titularidadeInfo(firstLine);
        const firstRisco = firstLine.risco ? riscoLabel(firstLine.risco) : null;

        return (
          <details
            key={g.jogador}
            className="group rounded-sm border border-line bg-panel"
            {...(hasRecommended ? { open: true } : {})}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between border-b border-line-soft px-3 py-2 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="text-[0.7rem] text-faint transition-transform group-open:rotate-90">▸</span>
                <span className="display text-[0.95rem] font-bold text-fg">
                  {displayName(firstLine)}
                  {posLabel && (
                    <span className="ml-2 text-[0.62rem] font-normal text-faint">{posLabel}</span>
                  )}
                </span>
                {hasRecommended && <span title="tem linha recomendada">⭐</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[0.72rem] text-muted">
                  {lineLabel(firstLine)}
                  <span className="mono ml-1 text-xs">@ {firstLine.odd}</span>
                  {firstRisco && <span className="ml-1.5"><Tag tone={firstRisco.tone}>{firstRisco.emoji} {firstRisco.texto}</Tag></span>}
                </span>
                {tit && <Tag tone={tit.tone}>{tit.texto}</Tag>}
                {g.linhas.length > 1 && (
                  <span className="text-[0.62rem] text-faint">{g.linhas.length} linhas</span>
                )}
              </span>
            </summary>

            <div className="flex flex-col divide-y divide-line-soft">
              {g.linhas.map((c, i) => {
                const risco = c.risco ? riscoLabel(c.risco) : null;
                return (
                  <div key={i} className={`px-3 py-2.5 ${c.recomendado ? "bg-[rgba(37,224,138,0.05)]" : ""}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {c.recomendado && <span title="recomendada">⭐</span>}
                      <span className="display text-[0.85rem] font-semibold text-fg">
                        {lineLabel(c)}
                      </span>
                      <span className="mono text-xs text-muted">@ {c.odd}</span>
                      {risco && <Tag tone={risco.tone}>{risco.emoji} {risco.texto}</Tag>}
                      {c.ia_revisao && (
                        <span className="text-sm" title={c.ia_revisao.nota ?? STANCE_TEXTO[c.ia_revisao.stance]}>
                          {STANCE_ICON[c.ia_revisao.stance]}
                        </span>
                      )}
                      <button
                        onClick={() => onDetail(c)}
                        className="ml-auto rounded-sm border border-line px-2 py-0.5 text-[0.66rem] text-muted hover:border-cyan hover:text-cyan"
                      >
                        ver detalhes ›
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.72rem] text-muted">
                      <span>modelo <strong className="text-fg">{pct(c.prob_modelo)}</strong> vs casa {pct(c.prob_devig)}</span>
                      <span>valor <strong className="text-value">{evToPct(c.ev)}</strong> <span className="text-faint">lucro esperado no longo prazo</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
