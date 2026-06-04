"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, postAnalisar } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type AnaliseResult } from "@/lib/types";
import { CandidatosTabela } from "@/components/CandidatosTabela";
import { IaVeredito } from "@/components/IaVeredito";
import { Panel, Field, Tag } from "@/components/ui";

export default function PreJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [jogoId, setJogoId] = useState("");
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [oddOver, setOddOver] = useState("1.90");
  const [oddUnder, setOddUnder] = useState("1.90");
  const [playerRef, setPlayerRef] = useState("");
  const [result, setResult] = useState<AnaliseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getLigas().then(setLigas).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoId("");
    getJogos(ligaId, "notstarted").then(setJogos).catch((e) => setErro(e.message));
  }, [ligaId]);

  const mercado = MERCADOS.find((m) => m.key === marketKey)!;
  const jogoSel = jogos.find((j) => String(j.id) === jogoId);

  async function analisar() {
    setErro(""); setResult(null); setLoading(true);
    try {
      const r = await postAnalisar({
        event_id: String(jogoId), market_key: marketKey,
        linha: Number(linha), odd_over: Number(oddOver), odd_under: Number(oddUnder),
        player_ref: mercado.nivel === "jogador" && playerRef ? playerRef : null,
        league_id: ligaId,
      });
      setResult(r);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── painel de controle ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div>
          <h1 className="display text-2xl font-extrabold leading-none text-fg">
            buscar valor
          </h1>
          <p className="mt-2 text-[0.74rem] leading-relaxed text-muted">
            o modelo aponta onde há <span className="text-value">edge / ev positivo</span> sobre a odd
            da casa sem margem. ele só <em>exibe</em> o que já passou no corte.
          </p>
        </div>

        <Panel title="parâmetros">
          <div className="flex flex-col gap-3.5">
            <Field label="liga">
              <select className="input" value={ligaId} onChange={(e) => setLigaId(e.target.value)}>
                <option value="">selecione…</option>
                {ligas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </Field>

            <Field label="jogo · não iniciado">
              <select className="input" value={jogoId} onChange={(e) => setJogoId(e.target.value)} disabled={!jogos.length}>
                <option value="">{jogos.length ? "selecione…" : "—"}</option>
                {jogos.map((j) => <option key={j.id} value={j.id}>{j.mandante} × {j.visitante}</option>)}
              </select>
            </Field>

            <Field label="mercado">
              <select className="input" value={marketKey} onChange={(e) => setMarketKey(e.target.value)}>
                {MERCADOS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} {m.nivel === "partida" ? "· em validação" : ""}
                  </option>
                ))}
              </select>
            </Field>

            {mercado.nivel === "jogador" && (
              <Field label="jogador" hint="vazio = varre o elenco inteiro">
                <input className="input" value={playerRef} onChange={(e) => setPlayerRef(e.target.value)} placeholder="ex.: Messi" />
              </Field>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <Field label="linha"><input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} /></Field>
              <Field label="odd over"><input className="input" value={oddOver} onChange={(e) => setOddOver(e.target.value)} /></Field>
              <Field label="odd under"><input className="input" value={oddUnder} onChange={(e) => setOddUnder(e.target.value)} /></Field>
            </div>

            <button onClick={analisar} disabled={!jogoId || loading} className="btn mt-1 w-full justify-center">
              {loading ? "analisando…" : "▸ analisar"}
            </button>

            {erro && (
              <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
                erro: {erro}
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* ── área de resultado ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        {!result && !loading && <EstadoVazio />}
        {loading && <Carregando />}

        {result && (
          <div className="flex flex-col gap-4">
            {/* placar do confronto */}
            <div className="reveal flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <h2 className="display text-2xl font-extrabold leading-none text-fg">
                {jogoSel ? <>{jogoSel.mandante} <span className="text-faint">×</span> {jogoSel.visitante}</> : result.jogo}
              </h2>
              <span className="overline">{mercado.label} · linha {linha}</span>
            </div>

            {result.em_validacao && (
              <div className="reveal flex items-start gap-2.5 rounded-sm border border-warn/45 bg-[rgba(255,177,61,0.07)] px-3.5 py-3">
                <span className="text-warn">⚠</span>
                <p className="text-[0.74rem] leading-relaxed text-warn">
                  mercado <strong>em validação</strong> — exibido só para estudo. <strong>não apostar</strong>:
                  ainda não passou na calibração (detector de mentira do modelo).
                </p>
              </div>
            )}

            <div className="reveal" style={{ animationDelay: "60ms" }}>
              <Panel title="veredito da ia" glow badge={<Tag tone="muted">explica · não inventa</Tag>}>
                <IaVeredito ia={result.ia} />
              </Panel>
            </div>

            <div className="reveal" style={{ animationDelay: "120ms" }}>
              <Panel title={`candidatos · ${result.candidatos.length}`} badge={<Tag tone="value">edge &gt; 0</Tag>}>
                <CandidatosTabela candidatos={result.candidatos} />
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoVazio() {
  return (
    <Panel className="grid min-h-[420px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">⌖</div>
        <p className="display mt-3 text-lg font-bold text-muted">mesa pronta</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">
          escolha liga, jogo e mercado à esquerda, depois <span className="text-value">analisar</span>.
          o terminal mostra só o que tem valor real.
        </p>
      </div>
    </Panel>
  );
}

function Carregando() {
  return (
    <Panel className="grid min-h-[420px] place-items-center">
      <div className="text-center">
        <p className="mono text-sm text-value">
          cruzando estatísticas<span className="blink">_</span>
        </p>
        <p className="mt-2 text-[0.68rem] text-faint">produção de um lado × vulnerabilidade do outro</p>
      </div>
    </Panel>
  );
}
