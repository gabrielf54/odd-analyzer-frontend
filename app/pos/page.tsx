"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, getResultado } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type ResultadoReal } from "@/lib/types";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pós-jogo — conferir resultado real</h1>
        <p className="text-sm text-neutral-500">Veja, por jogador, o valor real do stat e se bateu a linha.</p>
      </div>

      <div className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Liga</span>
          <select className="input" value={ligaId} onChange={(e) => setLigaId(e.target.value)}>
            <option value="">Selecione…</option>
            {ligas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Jogo (finalizado)</span>
          <select className="input" value={jogoId} onChange={(e) => setJogoId(e.target.value)} disabled={!jogos.length}>
            <option value="">{jogos.length ? "Selecione…" : "—"}</option>
            {jogos.map((j) => <option key={j.id} value={j.id}>{j.mandante} {j.placar ?? "x"} {j.visitante}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Mercado</span>
          <select className="input" value={marketKey} onChange={(e) => setMarketKey(e.target.value)}>
            {MERCADOS.filter((m) => m.nivel === "jogador").map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Linha</span>
          <input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} />
        </label>
      </div>

      <button onClick={conferir} disabled={!jogoId || loading} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
        {loading ? "Conferindo…" : "Conferir resultado"}
      </button>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {result && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr><th className="px-3 py-2">player_id</th><th className="px-3 py-2">Valor real</th><th className="px-3 py-2">Bateu a linha?</th></tr>
            </thead>
            <tbody>
              {linhas.map(([pid, r]) => (
                <tr key={pid} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{pid}</td>
                  <td className="px-3 py-2">{r.valor_real}</td>
                  <td className={`px-3 py-2 ${r.bateu ? "text-green-700" : "text-neutral-400"}`}>{r.bateu ? "✓ sim" : "não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
