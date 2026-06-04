"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, postAnalisar } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type AnaliseResult } from "@/lib/types";
import { CandidatosTabela } from "@/components/CandidatosTabela";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pré-jogo — buscar valor</h1>
        <p className="text-sm text-neutral-500">Escolha o jogo e o mercado; o modelo aponta onde há edge/EV positivo sobre a odd de-vig.</p>
      </div>

      <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <Campo label="Liga">
          <select className="input" value={ligaId} onChange={(e) => setLigaId(e.target.value)}>
            <option value="">Selecione…</option>
            {ligas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </Campo>

        <Campo label="Jogo (não iniciado)">
          <select className="input" value={jogoId} onChange={(e) => setJogoId(e.target.value)} disabled={!jogos.length}>
            <option value="">{jogos.length ? "Selecione…" : "—"}</option>
            {jogos.map((j) => <option key={j.id} value={j.id}>{j.mandante} x {j.visitante}</option>)}
          </select>
        </Campo>

        <Campo label="Mercado">
          <select className="input" value={marketKey} onChange={(e) => setMarketKey(e.target.value)}>
            {MERCADOS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </Campo>

        {mercado.nivel === "jogador" && (
          <Campo label="Jogador (opcional — vazio = varre o elenco)">
            <input className="input" value={playerRef} onChange={(e) => setPlayerRef(e.target.value)} placeholder="ex.: Kaiki" />
          </Campo>
        )}

        <Campo label="Linha"><input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} /></Campo>
        <Campo label="Odd Over"><input className="input" value={oddOver} onChange={(e) => setOddOver(e.target.value)} /></Campo>
        <Campo label="Odd Under"><input className="input" value={oddUnder} onChange={(e) => setOddUnder(e.target.value)} /></Campo>
      </div>

      <button
        onClick={analisar}
        disabled={!jogoId || loading}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Analisando…" : "Analisar"}
      </button>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {result && (
        <section className="space-y-3">
          <h2 className="font-medium">{result.jogo}</h2>
          {result.em_validacao && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠️ Mercado <strong>em validação</strong> — exibido para estudo, <strong>não apostar</strong> (ainda não calibrado).
            </p>
          )}
          {result.ia?.alertas?.map((a, i) => (
            <p key={i} className="text-xs text-neutral-500">• {a}</p>
          ))}
          {result.ia?.melhor_aposta && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              🤖 IA: <strong>{result.ia.melhor_aposta.jogador}</strong> {result.ia.melhor_aposta.linha} — {result.ia.melhor_aposta.veredito} ({result.ia.melhor_aposta.confianca}) · {result.ia.melhor_aposta.motivo}
            </p>
          )}
          <CandidatosTabela candidatos={result.candidatos} />
        </section>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
