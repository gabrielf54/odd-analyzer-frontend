import type { Ai } from "@/lib/types";
import { Tag } from "@/components/ui";

const confTone = (c: string) =>
  /alta/i.test(c) ? "value" : /baixa/i.test(c) ? "bad" : "warn";

export function AiVerdict({ ia }: { ia: Ai }) {
  const best = ia?.melhor_aposta;
  return (
    <div className="flex flex-col gap-3">
      {best ? (
        <div className="scan relative overflow-hidden rounded-sm border border-value/45 bg-[rgba(37,224,138,0.05)] p-4 shadow-[var(--glow-value)]">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="value">🤖 melhor aposta</Tag>
            <Tag tone={confTone(best.confianca) as "value" | "warn" | "bad"}>
              confiança {best.confianca}
            </Tag>
          </div>
          <p className="display mt-3 text-xl font-extrabold leading-tight text-fg">
            {best.jogador}{" "}
            <span className="text-value">{best.veredito} {best.linha}</span>
          </p>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">{best.motivo}</p>
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-line px-4 py-5">
          <p className="text-[0.78rem] text-muted">
            <span className="text-faint">🤖 ia:</span> nenhuma aposta recomendada com confiança suficiente.
          </p>
        </div>
      )}

      {ia?.outras?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="overline">outras menções</span>
          {ia.outras.map((o, i) => (
            <div key={i} className="flex items-start gap-2 text-[0.74rem] text-muted">
              <span className="text-faint">›</span>
              <span>
                <strong className="text-fg">{o.jogador}</strong> {o.veredito} {o.linha}
                <span className="text-faint"> · {o.confianca}</span> — {o.motivo}
              </span>
            </div>
          ))}
        </div>
      )}

      {ia?.alertas?.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line-soft pt-2">
          {ia.alertas.map((a, i) => (
            <p key={i} className="text-[0.66rem] text-faint">⚠ {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}
