import type { Candidate, ManualIa } from "@/lib/types";
import { Tag } from "@/components/ui";
import { BookBadge } from "@/components/BookBadge";
import { lineLabel, displayName, evToPct, riscoLabel, titularidadeInfo } from "@/lib/format";

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

const STANCE_INFO = {
  concorda: { emoji: "✅", texto: "IA concorda", tone: "value" as const },
  ressalva: { emoji: "⚠️", texto: "IA com ressalva", tone: "warn" as const },
  veta: { emoji: "⛔", texto: "IA não recomenda", tone: "bad" as const },
};

/** Mostra a candidata recomendada (recomendado=true). Se a IA vetou, vira alerta de
 * conflito e aponta a próxima candidata sem veto. */
export function RecommendationCard({ candidates, ia }: { candidates: Candidate[]; ia: ManualIa }) {
  const best = candidates.find((c) => c.recomendado);
  if (!best) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-5">
        <p className="text-[0.8rem] text-muted">nenhuma aposta clara — não forçar.</p>
      </div>
    );
  }

  const risco = best.risco ? riscoLabel(best.risco) : null;
  const stance = best.ia_revisao ? STANCE_INFO[best.ia_revisao.stance] : null;
  const vetado = best.ia_revisao?.stance === "veta";
  const proxima = vetado
    ? candidates.find((c) => !c.recomendado && c.ia_revisao?.stance !== "veta")
    : null;

  return (
    <div
      className={`scan relative overflow-hidden rounded-sm border p-4 ${
        vetado
          ? "border-bad/50 bg-[rgba(255,93,99,0.06)]"
          : "border-value/45 bg-[rgba(37,224,138,0.05)] shadow-[var(--glow-value)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={vetado ? "bad" : "value"}>⭐ recomendada pelo modelo</Tag>
        {risco && <Tag tone={risco.tone}>{risco.emoji} {risco.texto}</Tag>}
        {stance && <Tag tone={stance.tone}>{stance.emoji} {stance.texto}</Tag>}
        {(() => { const t = titularidadeInfo(best); return t ? <Tag tone={t.tone}>{t.texto}</Tag> : null; })()}
      </div>

      <p className="display mt-3 text-xl font-extrabold leading-tight text-fg">
        {displayName(best)}{" "}
        <span className={vetado ? "text-bad" : "text-value"}>
          {lineLabel(best)}
        </span>{" "}
        <span className="mono text-base text-muted">@ {best.odd}</span>{" "}
        {best.book && <BookBadge book={best.book} size="md" />}
      </p>

      {best.alerta_minutos && (
        <p className="mt-2 rounded-sm border border-line bg-[rgba(255,193,7,0.07)] px-3 py-2 text-[0.78rem] text-fg">
          ⚠ minutos esperados: <strong>{best.minutos_esperados.toFixed(0)} min</strong> — confirme a escalação oficial antes de apostar.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem] text-muted">
        <span>modelo <strong className="text-fg">{pct(best.prob_modelo)}</strong> vs casa {pct(best.prob_devig)}</span>
        <span>valor <strong className="text-value">{evToPct(best.ev)}</strong> <span className="text-faint">lucro esperado no longo prazo</span></span>
      </div>

      {vetado ? (
        <p className="mt-3 rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.07)] px-3 py-2 text-[0.78rem] leading-relaxed text-fg">
          ⛔ o modelo viu valor aqui, mas a IA segurou
          {best.ia_revisao?.nota ? <>: <span className="text-muted">{best.ia_revisao.nota}</span></> : "."}
          {proxima && (
            <span className="mt-1 block text-faint">
              próxima opção disponível: <strong className="text-fg">{displayName(proxima)}</strong>{" "}
              {lineLabel(proxima)} @ {proxima.odd}
            </span>
          )}
        </p>
      ) : (
        ia.topo_explicacao && (
          <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">{ia.topo_explicacao}</p>
        )
      )}

      {ia.alertas?.length > 0 && (
        <div className="mt-3 border-t border-line-soft pt-2">
          {ia.alertas.map((a, i) => (
            <p key={i} className="text-[0.66rem] text-faint">⚠ {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}
