"use client";

import { useEffect, useState } from "react";
import { getSchedulerStatus } from "@/lib/api";
import type { SchedulerStatus } from "@/lib/types";
import { statusTone, jobLabel } from "@/lib/scheduler";
import { localTime } from "@/lib/date";
import { Panel, Tag, ErrorBox } from "@/components/ui";

const whenLabel = (ms: number) => localTime(new Date(ms).toISOString());
const runDetail = (d: any): string => {
  if (!d || typeof d !== "object") return "";
  if (d.erro) return String(d.erro);
  if (d.retratos != null) return `${d.retratos} retratos${d.lineup_status ? ` · ${d.lineup_status}` : ""}`;
  if (d.jogos != null) return `${d.jogos} jogos`;
  if (d.logged != null) return `${d.logged} previsões`;
  if (d.liquidadas_player != null) return `${d.liquidadas_player + (d.liquidadas_partida ?? 0)} liquidadas`;
  if (d.motivo) return String(d.motivo);
  return "";
};

/** Painel do Agendador 24h (só-leitura): mostra que o robô está vivo, o que está agendado
 *  e o diário de bordo. Lê GET /scheduler/status e atualiza sozinho a cada 30s. */
export function SchedulerPanel() {
  const [data, setData] = useState<SchedulerStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    const load = () => getSchedulerStatus()
      .then((d) => { if (vivo) { setData(d); setError(""); } })
      .catch((e) => { if (vivo) setError(e?.message ?? "falhou"); });
    load();
    const iv = setInterval(load, 30_000);
    return () => { vivo = false; clearInterval(iv); };
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!data) return <p className="overline text-faint">carregando agendador…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Agendador 24h · Copa"
        badge={data.enabled
          ? <Tag tone="value">ligado</Tag>
          : <Tag tone="muted">desligado</Tag>}
      >
        <p className="mb-3 text-[0.72rem] text-muted">
          O robô coleta odds nos marcos de cada jogo (abertura, deriva, <strong className="text-fg">salto
          da escalação</strong>, fechamento), loga previsões de gols/vitória e liquida os jogos terminados —
          sozinho, sem custo. Atualiza a cada 30s.
        </p>
        {!data.enabled && (
          <p className="text-[0.72rem] text-faint">
            Agendador desligado (variável <span className="mono">SCHEDULER_ENABLED=false</span>). O diário
            abaixo mostra execuções anteriores.
          </p>
        )}
      </Panel>

      <Panel title={`próximos agendados (${data.scheduled.length})`}>
        {data.scheduled.length === 0 ? (
          <p className="text-[0.72rem] text-faint">Nada agendado agora — sem jogos da Copa na janela.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft">
            {data.scheduled.slice(0, 30).map((j, i) => (
              <li key={`${j.event_id}-${j.mark}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="mono text-[0.78rem] text-fg">{j.jogo}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[0.7rem] text-muted">{jobLabel(j.job_type, j.mark)}</span>
                  <span className="mono tabular-nums text-[0.7rem] text-faint">{whenLabel(j.fireAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`diário de bordo (${data.runs.length})`}>
        {data.runs.length === 0 ? (
          <p className="text-[0.72rem] text-faint">Sem execuções ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft">
            {data.runs.slice(0, 30).map((r, i) => (
              <li key={`${r.event_id ?? "sweep"}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="mono truncate text-[0.78rem] text-fg">{r.jogo ?? jobLabel(r.job_type, r.mark ?? null)}</span>
                  <span className="text-[0.66rem] text-faint">
                    {jobLabel(r.job_type, r.mark ?? null)}{runDetail(r.detalhe) ? ` · ${runDetail(r.detalhe)}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`overline ${statusTone(r.status)}`}>{r.status}</span>
                  <span className="mono tabular-nums text-[0.7rem] text-faint">{localTime(r.criado_em)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
