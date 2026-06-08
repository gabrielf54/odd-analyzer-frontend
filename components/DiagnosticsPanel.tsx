import type { RejectedCandidate, CutReason } from "@/lib/types";
import { Tag } from "@/components/ui";

/* Diagnóstico: por que cada candidato NÃO passou nos cortes. Tira o sistema da
   caixa-preta — em vez de "lista vazia", mostra qual porta fechou pra cada um. */

const sig = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(3)}`;

// código do corte (backend) → frase pro dono (leigo)
const CUT_LABEL: Record<CutReason, string> = {
  edge: "edge baixo (< 0.04)",
  ev: "ev baixo (< 0.05)",
  titular: "não confirmado na escalação",
  amostra: "poucos jogos (amostra < 10)",
};

function failed(c: RejectedCandidate, cut: CutReason): boolean {
  return c.motivos.includes(cut);
}

export function DiagnosticsPanel({
  rejected,
  open = false,
}: {
  rejected: RejectedCandidate[];
  open?: boolean;
}) {
  if (!rejected.length) return null;
  // mais perto de passar primeiro (maior edge no topo)
  const sorted = [...rejected].sort((a, b) => b.edge - a.edge);

  return (
    <details
      open={open}
      className="reveal group rounded-sm border border-line bg-panel"
      style={{ animationDelay: "120ms" }}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3.5 py-3 text-left marker:content-none">
        <span className="flex items-center gap-2">
          <span className="overline">diagnóstico</span>
          <Tag tone="warn">{rejected.length} barrados</Tag>
        </span>
        <span className="text-[0.7rem] text-faint transition-transform group-open:rotate-90">▸</span>
      </summary>

      <div className="flex flex-col gap-2 px-3.5 pb-3.5">
        <p className="text-[0.68rem] leading-relaxed text-faint">
          quem o modelo montou mas reprovou — e em qual corte caiu. número em
          <span className="text-bad"> vermelho</span> = o que falhou.
        </p>

        {sorted.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-sm border border-line-soft bg-panel-2 px-3 py-2.5 sm:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="display truncate text-[0.86rem] font-semibold text-fg">
                  {c.jogador}
                </span>
                <span className="mono shrink-0 text-[0.7rem] text-muted">
                  {c.market_type} {c.linha}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.motivos.map((m) => (
                  <Tag key={m} tone="warn">{CUT_LABEL[m]}</Tag>
                ))}
              </div>
            </div>

            <div className="mono flex shrink-0 items-center gap-3 text-[0.72rem] tabular-nums">
              <Metric label="edge" value={sig(c.edge)} bad={failed(c, "edge")} />
              <Metric label="ev" value={sig(c.ev)} bad={failed(c, "ev")} />
              <Metric label="n" value={String(c.amostra_jogos)} bad={failed(c, "amostra")} />
              <Metric
                label="titular"
                value={c.xi_confirmado ? "✓" : "✗"}
                bad={failed(c, "titular")}
              />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function Metric({ label, value, bad }: { label: string; value: string; bad: boolean }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="overline text-[0.5rem]">{label}</span>
      <span className={bad ? "font-semibold text-bad" : "text-muted"}>{value}</span>
    </span>
  );
}
