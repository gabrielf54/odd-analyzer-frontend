"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, getResultado } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type ResultadoReal } from "@/lib/types";
import { LigaRail } from "@/components/LigaRail";
import { JogosLista } from "@/components/JogosLista";
import { MercadoChips } from "@/components/MercadoChips";
import { Panel, Field, Tag } from "@/components/ui";

const MERCADOS_JOGADOR = MERCADOS.filter((m) => m.nivel === "jogador");

export default function PosJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [result, setResult] = useState<ResultadoReal | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getLigas().then(setLigas).catch((e) => setErro(e instanceof Error ? e.message : "erro inesperado"));
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoSel(null); setResult(null); setErro(""); setLoadingJogos(true);
    getJogos(ligaId, "finished")
      .then(setJogos)
      .catch((e) => setErro(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingJogos(false));
  }, [ligaId]);

  function voltar() {
    setJogoSel(null); setResult(null); setErro("");
  }

  async function conferir() {
    if (!jogoSel) return;
    setErro(""); setResult(null); setLoading(true);
    try {
      setResult(await getResultado(String(jogoSel.id), marketKey, Number(linha)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const linhas = result ? Object.entries(result) : [];
  const acertos = linhas.filter(([, r]) => r.bateu).length;
  const mercado = MERCADOS.find((m) => m.key === marketKey)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LigaRail ligas={ligas} ativa={ligaId} onSelect={setLigaId} />
      </aside>

      <div className="min-w-0">
        {!jogoSel ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="display text-2xl font-extrabold leading-none text-fg">conferir resultado</h1>
              <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
                o jogo acabou — veja por jogador o <span className="text-cyan">valor real</span> do stat e se
                bateu a linha. escolha a liga, depois o jogo finalizado.
              </p>
            </div>
            {erro && <ErroBox msg={erro} />}
            {!ligaId ? (
              <Vazio titulo="escolha uma liga" texto="selecione uma liga à esquerda para ver os jogos finalizados." />
            ) : loadingJogos ? (
              <p className="mono text-sm text-cyan">carregando jogos<span className="blink">_</span></p>
            ) : (
              <JogosLista jogos={jogos} variante="pos" onSelect={setJogoSel} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button onClick={voltar} className="overline self-start transition-colors hover:text-fg">
              ‹ voltar aos jogos
            </button>

            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <h1 className="display text-2xl font-extrabold leading-none text-fg">
                {jogoSel.mandante}{" "}
                {jogoSel.placar ? <span className="text-value">{jogoSel.placar}</span> : <span className="text-faint">×</span>}{" "}
                {jogoSel.visitante}
              </h1>
              <span className="overline">finalizado</span>
            </div>

            <Panel title="mercado">
              <div className="flex flex-col gap-3.5">
                <MercadoChips mercados={MERCADOS_JOGADOR} ativo={marketKey} onSelect={setMarketKey} />
                <Field label="linha">
                  <input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} />
                </Field>
                <button onClick={conferir} disabled={loading} className="btn w-full justify-center">
                  {loading ? "conferindo…" : "▸ conferir"}
                </button>
                {erro && <ErroBox msg={erro} />}
              </div>
            </Panel>

            {loading && (
              <Panel className="grid min-h-[200px] place-items-center">
                <p className="mono text-sm text-cyan">buscando resultado real<span className="blink">_</span></p>
              </Panel>
            )}

            {result && (
              <Panel
                title={`${mercado.label} · linha ${linha}`}
                glow
                badge={<Tag tone={acertos ? "value" : "muted"}>{acertos}/{linhas.length} bateram</Tag>}
              >
                {linhas.length === 0 ? (
                  <p className="px-1 py-3 text-[0.74rem] text-muted">sem dados de jogadores para esse mercado/linha.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-[1fr_5rem_6rem] gap-3 px-3">
                      <span className="overline">jogador</span>
                      <span className="overline text-right">valor real</span>
                      <span className="overline text-right">linha {linha}</span>
                    </div>
                    {linhas.map(([pid, r]) => (
                      <div
                        key={pid}
                        className="reveal grid grid-cols-[1fr_5rem_6rem] items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5"
                      >
                        <span className="mono truncate text-[0.8rem] text-fg">{pid}</span>
                        <span className="mono text-right text-sm font-semibold tabular-nums text-fg">{r.valor_real}</span>
                        <span className="text-right">
                          {r.bateu ? <Tag tone="value">✓ bateu</Tag> : <Tag tone="muted">não</Tag>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">✓</div>
        <p className="display mt-3 text-lg font-bold text-muted">{titulo}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{texto}</p>
      </div>
    </Panel>
  );
}

function ErroBox({ msg }: { msg: string }) {
  return (
    <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
      erro: {msg}
    </p>
  );
}
