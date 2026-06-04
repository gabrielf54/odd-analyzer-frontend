"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, getResultado } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type ResultadoReal } from "@/lib/types";
import { Panel, Field, Tag } from "@/components/ui";

export default function PosJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [jogoId, setJogoId] = useState("");
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [result, setResult] = useState<ResultadoReal | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { getLigas().then(setLigas).catch((e) => setErro(e.message)); }, []);
  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoId("");
    getJogos(ligaId, "finished").then(setJogos).catch((e) => setErro(e.message));
  }, [ligaId]);

  async function conferir() {
    setErro(""); setResult(null); setLoading(true);
    try {
      setResult(await getResultado(String(jogoId), marketKey, Number(linha)));
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  const linhas = result ? Object.entries(result) : [];
  const acertos = linhas.filter(([, r]) => r.bateu).length;
  const mercado = MERCADOS.find((m) => m.key === marketKey)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div>
          <h1 className="display text-2xl font-extrabold leading-none text-fg">
            conferir resultado
          </h1>
          <p className="mt-2 text-[0.74rem] leading-relaxed text-muted">
            o jogo acabou — veja por jogador o <span className="text-cyan">valor real</span> do stat e se
            bateu a linha. é a prova de fogo do modelo.
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
            <Field label="jogo · finalizado">
              <select className="input" value={jogoId} onChange={(e) => setJogoId(e.target.value)} disabled={!jogos.length}>
                <option value="">{jogos.length ? "selecione…" : "—"}</option>
                {jogos.map((j) => <option key={j.id} value={j.id}>{j.mandante} {j.placar ?? "×"} {j.visitante}</option>)}
              </select>
            </Field>
            <Field label="mercado">
              <select className="input" value={marketKey} onChange={(e) => setMarketKey(e.target.value)}>
                {MERCADOS.filter((m) => m.nivel === "jogador").map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="linha">
              <input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} />
            </Field>

            <button onClick={conferir} disabled={!jogoId || loading} className="btn mt-1 w-full justify-center">
              {loading ? "conferindo…" : "▸ conferir"}
            </button>

            {erro && (
              <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
                erro: {erro}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {!result && !loading && (
          <Panel className="grid min-h-[420px] place-items-center">
            <div className="text-center">
              <div className="display text-5xl font-extrabold text-line">✓</div>
              <p className="display mt-3 text-lg font-bold text-muted">aguardando confronto</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">
                escolha um jogo finalizado e confira o resultado real contra a linha.
              </p>
            </div>
          </Panel>
        )}

        {loading && (
          <Panel className="grid min-h-[420px] place-items-center">
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
                      {r.bateu
                        ? <Tag tone="value">✓ bateu</Tag>
                        : <Tag tone="muted">não</Tag>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
