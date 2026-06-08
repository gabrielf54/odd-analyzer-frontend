"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, postAnalisar } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type AnaliseResult, type Mercado } from "@/lib/types";
import { horaLocal } from "@/lib/date";
import { LigaRail } from "@/components/LigaRail";
import { JogosLista } from "@/components/JogosLista";
import { MercadoChips } from "@/components/MercadoChips";
import { CandidatosTabela } from "@/components/CandidatosTabela";
import { IaVeredito } from "@/components/IaVeredito";
import { Panel, Field, Tag, ErroBox } from "@/components/ui";

export default function PreJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [loadingLigas, setLoadingLigas] = useState(true);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [oddOver, setOddOver] = useState("1.90");
  const [oddUnder, setOddUnder] = useState("1.90");
  const [playerRef, setPlayerRef] = useState("");
  const [result, setResult] = useState<AnaliseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getLigas()
      .then(setLigas)
      .catch((e) => setErro(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingLigas(false));
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoSel(null); setResult(null); setErro(""); setLoadingJogos(true);
    getJogos(ligaId, "notstarted")
      .then(setJogos)
      .catch((e) => setErro(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingJogos(false));
  }, [ligaId]);

  const mercado = MERCADOS.find((m) => m.key === marketKey)!;

  function voltar() {
    setJogoSel(null); setResult(null); setErro("");
  }

  async function analisar() {
    if (!jogoSel) return;
    setErro(""); setResult(null); setLoading(true);
    try {
      const r = await postAnalisar({
        event_id: String(jogoSel.id), market_key: marketKey,
        linha: Number(linha), odd_over: Number(oddOver), odd_under: Number(oddUnder),
        player_ref: mercado.nivel === "jogador" && playerRef ? playerRef : null,
        league_id: ligaId,
      });
      setResult(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LigaRail ligas={ligas} ativa={ligaId} onSelect={setLigaId} loading={loadingLigas} />
      </aside>

      <div className="min-w-0">
        {!jogoSel ? (
          <Browse ligaId={ligaId} jogos={jogos} loading={loadingJogos} erro={erro} onSelect={setJogoSel} />
        ) : (
          <Detalhe
            jogo={jogoSel}
            marketKey={marketKey} setMarketKey={setMarketKey} mercado={mercado}
            linha={linha} setLinha={setLinha}
            oddOver={oddOver} setOddOver={setOddOver}
            oddUnder={oddUnder} setOddUnder={setOddUnder}
            playerRef={playerRef} setPlayerRef={setPlayerRef}
            result={result} loading={loading} erro={erro}
            onAnalisar={analisar} onVoltar={voltar}
          />
        )}
      </div>
    </div>
  );
}

function Browse({
  ligaId, jogos, loading, erro, onSelect,
}: {
  ligaId: string; jogos: Jogo[]; loading: boolean; erro: string; onSelect: (j: Jogo) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="display text-2xl font-extrabold leading-none text-fg">buscar valor</h1>
        <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
          o modelo aponta onde há <span className="text-value">edge / ev positivo</span> sobre a odd
          da casa sem margem. escolha a liga, depois o jogo.
        </p>
      </div>

      {erro && <ErroBox msg={erro} />}

      {!ligaId ? (
        <Vazio titulo="escolha uma liga" texto="selecione uma liga à esquerda para ver os jogos não iniciados." />
      ) : loading ? (
        <p className="mono text-sm text-value">carregando jogos<span className="blink">_</span></p>
      ) : (
        <JogosLista jogos={jogos} variante="pre" onSelect={onSelect} />
      )}
    </div>
  );
}

function Detalhe({
  jogo, marketKey, setMarketKey, mercado, linha, setLinha, oddOver, setOddOver,
  oddUnder, setOddUnder, playerRef, setPlayerRef, result, loading, erro, onAnalisar, onVoltar,
}: {
  jogo: Jogo;
  marketKey: string; setMarketKey: (k: string) => void; mercado: Mercado;
  linha: string; setLinha: (v: string) => void;
  oddOver: string; setOddOver: (v: string) => void;
  oddUnder: string; setOddUnder: (v: string) => void;
  playerRef: string; setPlayerRef: (v: string) => void;
  result: AnaliseResult | null; loading: boolean; erro: string;
  onAnalisar: () => void; onVoltar: () => void;
}) {
  const hora = horaLocal(jogo.data);
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onVoltar} className="overline self-start transition-colors hover:text-fg">
        ‹ voltar aos jogos
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <h1 className="display text-2xl font-extrabold leading-none text-fg">
          {jogo.mandante} <span className="text-faint">×</span> {jogo.visitante}
        </h1>
        {hora && <span className="overline">{hora}</span>}
      </div>

      <Panel title="mercado">
        <div className="flex flex-col gap-3.5">
          <MercadoChips mercados={MERCADOS} ativo={marketKey} onSelect={setMarketKey} />

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

          <button onClick={onAnalisar} disabled={loading} className="btn w-full justify-center">
            {loading ? "analisando…" : "▸ analisar"}
          </button>

          {erro && <ErroBox msg={erro} />}
        </div>
      </Panel>

      {loading && <Carregando />}

      {result && (
        <div className="flex flex-col gap-4">
          {result.em_validacao && (
            <div className="reveal flex items-start gap-2.5 rounded-sm border border-warn/45 bg-[rgba(255,177,61,0.07)] px-3.5 py-3">
              <span className="text-warn">⚠</span>
              <p className="text-[0.74rem] leading-relaxed text-warn">
                mercado <strong>em validação</strong> — exibido só para estudo. <strong>não apostar</strong>:
                ainda não passou na calibração (detector de mentira do modelo).
              </p>
            </div>
          )}

          <div className="reveal">
            <Panel title="veredito da ia" glow badge={<Tag tone="muted">explica · não inventa</Tag>}>
              <IaVeredito ia={result.ia} />
            </Panel>
          </div>

          <div className="reveal" style={{ animationDelay: "60ms" }}>
            <Panel title={`candidatos · ${result.candidatos.length}`} badge={<Tag tone="value">edge &gt; 0</Tag>}>
              <CandidatosTabela candidatos={result.candidatos} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">⌖</div>
        <p className="display mt-3 text-lg font-bold text-muted">{titulo}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{texto}</p>
      </div>
    </Panel>
  );
}

function Carregando() {
  return (
    <Panel className="grid min-h-[260px] place-items-center">
      <div className="text-center">
        <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
        <p className="mt-2 text-[0.68rem] text-faint">produção de um lado × vulnerabilidade do outro</p>
      </div>
    </Panel>
  );
}

