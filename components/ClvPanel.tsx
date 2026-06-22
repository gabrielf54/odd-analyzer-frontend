"use client";

import { useEffect, useState } from "react";
import { getClv } from "@/lib/api";
import type { ClvResult, ClvBet, LineupEdge } from "@/lib/types";
import { fmtClv, timingText } from "@/lib/clv";
import { friendlyLine } from "@/lib/format";
import { localTime } from "@/lib/date";
import { Panel, Tag, ErrorBox } from "@/components/ui";

const MERCADO_PT: Record<string, string> = {
  sot: "chutes a gol", finalizacoes: "finalizações", desarmes: "desarmes",
  faltas: "faltas", escanteios: "escanteios", gols: "gols", vitoria: "resultado",
};

/** Cor do número pelo sinal do CLV (verde = a meu favor; vermelho = contra). */
function tone(x: number | null): string {
  if (x == null) return "text-faint";
  return x >= 0 ? "text-value" : "text-bad";
}

function Delta({ x, label }: { x: number | null; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-faint">{label} </span>
      <span className={`mono tabular-nums ${tone(x)}`}>{fmtClv(x)}</span>
    </span>
  );
}

function BetRow({ a }: { a: ClvBet }) {
  const s = a.segmentos;
  const recomenda = a.recomendacao === "apostar_pre";
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono text-[0.8rem] text-fg">
          {a.jogador} <span className="text-faint">·</span> {friendlyLine(a.market_type, a.linha)}
        </span>
        <div className="flex items-center gap-2">
          {a.pre_lineup && <Tag tone="muted">pré-escalação</Tag>}
          {recomenda && <Tag tone="value">apostar agora</Tag>}
          <span className={`mono text-sm font-semibold tabular-nums ${tone(s.total)}`}>
            total {fmtClv(s.total)}
          </span>
        </div>
      </div>

      {/* Linha do tempo: entrada → (pré) → │escalação│ → (pós) → fechamento. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
        <span className="mono tabular-nums text-muted">entrada {s.marcos.entrada_odd ?? "—"}</span>
        <span className="text-faint">→</span>
        <Delta x={s.pre_escalacao} label="pré" />
        <span className="text-faint">→</span>
        <span className="whitespace-nowrap rounded-sm border border-cyan/40 bg-[rgba(79,214,255,0.07)] px-1.5 py-0.5">
          <span className="text-cyan">📋 escalação </span>
          <span className={`mono tabular-nums ${tone(s.salto_escalacao)}`}>{fmtClv(s.salto_escalacao)}</span>
        </span>
        <span className="text-faint">→</span>
        <Delta x={s.pos_escalacao} label="pós" />
        <span className="text-faint">→</span>
        <span className="mono tabular-nums text-muted">fech {s.marcos.fechamento_odd ?? "—"}</span>
      </div>
    </li>
  );
}

function MarketSummary({ mk, edge }: { mk: string; edge: LineupEdge }) {
  const sinal = edge.lo > 0; // IC inteiro acima de zero → sinal real
  const rec = sinal ? "apostar_pre" : "sem_sinal";
  return (
    <div className="rounded-sm border border-line bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <span className="overline">{MERCADO_PT[mk] ?? mk}</span>
        {sinal && <Tag tone="value">sinal de timing</Tag>}
      </div>
      <div className={`mono mt-1 text-lg font-semibold tabular-nums ${tone(edge.media)}`}>
        salto da escalação {fmtClv(edge.media)}
      </div>
      <div className="text-[0.66rem] text-faint">IC {fmtClv(edge.lo)} … {fmtClv(edge.hi)} · n={edge.n}</div>
      <div className="mt-1 text-[0.66rem] text-muted">{timingText(rec, edge)}</div>
    </div>
  );
}

/** Aba CLV (só-leitura): vantagem do modelo no salto da escalação + CLV por aposta.
 * Não toca o fluxo de coleta/análise — calcula do histórico imutável de odds. */
export function ClvPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<ClvResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError("");
    getClv(eventId)
      .then((d) => { if (vivo) { setData(d); setLoading(false); } })
      .catch((e) => { if (vivo) { setError(e?.message ?? "falhou"); setLoading(false); } });
    return () => { vivo = false; };
  }, [eventId]);

  if (loading) return <p className="overline text-faint">carregando CLV…</p>;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const mercados = Object.entries(data.resumo_por_mercado);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="CLV · movimento da linha pela escalação" badge={<Tag tone="cyan">derivado do histórico</Tag>}>
        <p className="mb-3 text-[0.72rem] text-muted">
          Mede se o preço se moveu a seu favor da entrada até o apito — e o quanto a{" "}
          <strong className="text-fg">escalação oficial</strong> mexe a linha. Acumula conforme você
          coleta odds ao longo do dia; basta buscar odds de novo (não contamina nada).
        </p>
        {mercados.length === 0 ? (
          <p className="text-[0.72rem] text-faint">
            Ainda sem histórico suficiente — colete odds (Etapa 1) algumas vezes, antes e depois da
            escalação sair (~1h antes do jogo), e o sinal aparece aqui.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mercados.map(([mk, e]) => <MarketSummary key={mk} mk={mk} edge={e} />)}
          </div>
        )}
      </Panel>

      <Panel
        title={`apostas (${data.apostas.length})`}
        badge={data.kickoff ? <Tag tone="muted">apito {localTime(data.kickoff) ?? "—"}</Tag> : undefined}
      >
        {data.apostas.length === 0 ? (
          <p className="text-[0.72rem] text-faint">
            Nenhuma aposta com histórico de odds ainda (analise o jogo e colete odds ao longo do dia).
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft">
            {data.apostas.map((a, i) => <BetRow key={`${a.jogador}-${a.market_type}-${a.linha}-${i}`} a={a} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
