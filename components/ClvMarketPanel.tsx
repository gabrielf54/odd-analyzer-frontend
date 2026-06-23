"use client";

import { useEffect, useState } from "react";
import { getClvPorMercado } from "@/lib/api";
import type { ClvPorMercadoResult, MarketClv } from "@/lib/types";
import { fmtClv } from "@/lib/clv";
import { marketLabelPt } from "@/lib/format";
import { clvConfidence } from "@/lib/clvMarket";
import { Panel, Tag, ErrorBox } from "@/components/ui";

function tone(t: "value" | "bad" | "muted"): string {
  return t === "value" ? "text-value" : t === "bad" ? "text-bad" : "text-muted";
}

/** Uma linha de mercado: nome · CLV médio grande · IC · n · selo de confiança. */
function MarketRow({ m }: { m: MarketClv }) {
  const c = clvConfidence(m.lo, m.hi);
  return (
    <div className="rounded-sm border border-line bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <span className="overline">{marketLabelPt(m.market_type)}</span>
        <Tag tone={c.tone}>{c.selo}</Tag>
      </div>
      <div className={`mono mt-1 text-2xl font-semibold tabular-nums leading-none ${tone(c.tone)}`}>
        {fmtClv(m.clv_medio)}
      </div>
      <div className="mt-1 text-[0.66rem] text-faint">
        IC {fmtClv(m.lo)} … {fmtClv(m.hi)} · n={m.n}
      </div>
    </div>
  );
}

/** Painel CLV por mercado (só-leitura): pega o preço melhor que o fechamento, em média, por
 *  mercado, entre TODOS os jogos. Verde = a meu favor; selo de confiança pelo IC. Lê
 *  GET /clv/por-mercado. Não dispara nada — é leitura do paper_ledger. */
export function ClvMarketPanel() {
  const [data, setData] = useState<ClvPorMercadoResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    getClvPorMercado()
      .then((d) => { if (vivo) { setData(d); setError(""); } })
      .catch((e) => { if (vivo) setError(e?.message ?? "falhou"); });
    return () => { vivo = false; };
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!data) return <p className="overline text-faint">carregando CLV por mercado…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="CLV por mercado · todos os jogos" badge={<Tag tone="cyan">derivado do histórico</Tag>}>
        <p className="mb-3 text-[0.72rem] text-muted">
          Mostra, por mercado, se você costuma pegar um preço <strong className="text-fg">melhor que o
          fechamento</strong> (a odd final, mais esperta de todas) — juntando todas as suas apostas.
          <strong className="text-value"> Verde = a seu favor.</strong> O selo só fica confiável quando o
          intervalo (IC) inteiro fica de um lado do zero; cruzando o zero, ainda é ruído de amostra
          pequena.
        </p>
        {data.por_mercado.length === 0 ? (
          <p className="text-[0.72rem] text-faint">
            Ainda sem CLV — precisa de aposta com odd de entrada (props da análise manual) e retratos de
            odds coletados ao longo do dia.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.por_mercado.map((m) => <MarketRow key={m.market_type} m={m} />)}
          </div>
        )}
      </Panel>

      <Panel title="o que isto NÃO cobre">
        <p className="text-[0.72rem] text-muted">{data.limitacao}</p>
      </Panel>
    </div>
  );
}
