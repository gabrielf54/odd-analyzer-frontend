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
          Mostra, por mercado, se o preço <strong className="text-fg">andou a seu favor</strong> depois que
          você escolheu — você pegou uma odd melhor que a do <strong className="text-fg">fechamento</strong>
          (a final, mais esperta de todas)? <strong className="text-value">Verde = a seu favor (e o IC
          confirma).</strong>{" "}
          É um indício de que suas escolhas mais fortes antecipam o dinheiro esperto. O selo só fica confiável
          quando o intervalo (IC) inteiro fica de um lado do zero; cruzando o zero, ainda é ruído de amostra
          pequena.
        </p>
        <p className="mb-3 rounded-sm border border-warn/30 bg-[rgba(255,177,61,0.06)] px-2.5 py-1.5 text-[0.68rem] text-muted">
          ⚠️ Isto <strong className="text-fg">não diz quanto você ganha</strong> (EV) — só que o preço se
          mexeu a seu favor. Pra saber o lucro por real, falta a odd do <strong className="text-fg">outro
          lado</strong> (over + under), que hoje quase nenhuma casa entrega.
        </p>
        {data.por_mercado.length === 0 ? (
          <p className="text-[0.72rem] text-faint">
            Ainda sem CLV — precisa de aposta já <strong className="text-fg">liquidada</strong> (jogador que
            entrou em campo, jogo encerrado) com odd de entrada e retratos de odds ao longo do dia.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.por_mercado.map((m) => <MarketRow key={m.market_type} m={m} />)}
          </div>
        )}
      </Panel>

      <Panel title="o que isto prova — e o que não prova">
        <p className="text-[0.72rem] text-muted">{data.limitacao}</p>
      </Panel>
    </div>
  );
}
