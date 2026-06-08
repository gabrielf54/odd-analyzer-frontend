import type { Candidate } from "@/lib/types";
import { Tag } from "@/components/ui";
import { InvestigationTrace } from "@/components/InvestigationTrace";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const sig = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(3)}`;

/* Barra dupla: modelo (verde, nosso número) sobreposto à casa de-vig
   (cinza, número justo dela). O vão verde = o edge, visualmente. */
function ProbBars({ model, devig }: { model: number; devig: number }) {
  const m = Math.min(100, model * 100);
  const d = Math.min(100, devig * 100);
  const edgePos = model >= devig;
  return (
    <div className="relative h-9 w-full overflow-hidden rounded-sm border border-line-soft bg-bg">
      {/* casa (de-vig) */}
      <div
        className="absolute inset-y-0 left-0 bg-[#222a35]"
        style={{ width: `${d}%` }}
      />
      {/* faixa de edge entre os dois números */}
      <div
        className={edgePos ? "absolute inset-y-0 bg-[rgba(37,224,138,0.18)]" : "absolute inset-y-0 bg-[rgba(255,93,99,0.16)]"}
        style={{
          left: `${Math.min(m, d)}%`,
          width: `${Math.abs(m - d)}%`,
        }}
      />
      {/* marcador do modelo */}
      <div
        className="absolute inset-y-0 w-[2px] bg-value shadow-[0_0_8px_1px_rgba(37,224,138,0.8)]"
        style={{ left: `calc(${m}% - 1px)` }}
      />
      {/* marcador da casa */}
      <div
        className="absolute inset-y-0 w-px bg-muted"
        style={{ left: `calc(${d}% - 0.5px)` }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[0.66rem] tabular-nums">
        <span className="text-value">modelo {pct(model)}</span>
        <span className="text-muted">casa {pct(devig)}</span>
      </div>
    </div>
  );
}

export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  if (!candidates.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-8 text-center">
        <p className="display text-base font-bold text-muted">nenhuma oportunidade clara</p>
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-faint">
          ninguém passou nos cortes (edge ≥ 0.04 · ev ≥ 0.05 · titular confirmado · amostra ≥ 10).
          <br />
          lista vazia é um resultado válido — não forçar aposta.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden grid-cols-[2rem_1fr_minmax(220px,2fr)_5rem_5rem] gap-3 px-3 md:grid">
        <span className="overline">#</span>
        <span className="overline">jogador / linha</span>
        <span className="overline">modelo vs casa (de-vig)</span>
        <span className="overline text-right">edge</span>
        <span className="overline text-right">ev</span>
      </div>

      {candidates.map((c, i) => (
        <div
          key={i}
          className="reveal grid grid-cols-1 items-center gap-3 rounded-sm border border-line bg-panel px-3 py-3 transition-colors hover:border-[#2c3744] md:grid-cols-[2rem_1fr_minmax(220px,2fr)_5rem_5rem]"
          style={{ animationDelay: `${i * 55}ms` }}
        >
          {/* rank */}
          <span className="mono hidden text-sm text-faint md:block">
            {String(i + 1).padStart(2, "0")}
          </span>

          {/* jogador + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="display truncate text-[0.95rem] font-bold text-fg">
                {c.jogador}
              </span>
              <span className="mono shrink-0 text-xs text-muted">
                {c.market_type} {c.linha}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {c.xi_confirmado
                ? <Tag tone="cyan">titular ✓</Tag>
                : <Tag tone="warn">provável</Tag>}
              <Tag tone="muted">n={c.amostra_jogos}</Tag>
              {c.incerteza && <Tag tone="muted">{c.incerteza}</Tag>}
              {c.concedido_adversario && (
                <span className="text-[0.62rem] text-faint">
                  adv. concede {c.concedido_adversario}
                </span>
              )}
            </div>
          </div>

          {/* barras */}
          <ProbBars model={c.prob_modelo} devig={c.prob_devig} />

          {/* edge */}
          <div className="flex items-center justify-between md:flex-col md:items-end md:gap-0.5">
            <span className="overline md:hidden">edge</span>
            <span className={`mono text-sm font-semibold tabular-nums ${c.edge >= 0 ? "text-value" : "text-bad"}`}>
              {sig(c.edge)}
            </span>
          </div>

          {/* ev */}
          <div className="flex items-center justify-between md:flex-col md:items-end md:gap-0.5">
            <span className="overline md:hidden">ev</span>
            <span className={`mono text-sm font-semibold tabular-nums ${c.ev >= 0 ? "text-value" : "text-bad"}`}>
              {sig(c.ev)}
            </span>
          </div>

          {c.trace && (
            <details className="group/inv md:col-span-5">
              <summary className="display inline-flex cursor-pointer items-center gap-1 text-[0.68rem] font-semibold text-faint hover:text-fg">
                <span className="transition-transform group-open/inv:rotate-90">▸</span>
                mostrar investigação
              </summary>
              <div className="mt-2">
                <InvestigationTrace trace={c.trace} />
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
