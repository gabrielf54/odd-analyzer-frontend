"use client";

import { useEffect, useState } from "react";
import { unificarOdds, getOddsUnificadas } from "@/lib/api";
import type { UnifiedOddsRow } from "@/lib/types";
import { BookBadge } from "@/components/BookBadge";
import { DivergenceModal } from "@/components/DivergenceModal";
import { ErrorBox } from "@/components/ui";
import { marketNoun } from "@/lib/detailText";

/* Tabela do ESPELHO canônico (odds_unificadas) — 1 linha por aposta, com o MELHOR preço
   entre as casas. É o que a análise considera. O botão "Unificar odds" re-gera o espelho
   do cru (a coleta já unifica sozinha; o botão é p/ re-sincronizar e conferir). A tabela
   crua (OddsTable) fica logo abaixo, como log. */
export function UnifiedOddsTable({ eventId, reloadSignal }: { eventId: string; reloadSignal?: number }) {
  const [rows, setRows] = useState<UnifiedOddsRow[]>([]);
  const [summary, setSummary] = useState<{ n_cru: number; n_unificado: number } | null>(null);
  const [showDiverg, setShowDiverg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Carga inicial / recarga externa: lê o espelho já existente (a coleta unifica no backend).
  useEffect(() => {
    let alive = true;
    getOddsUnificadas(eventId)
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "erro ao carregar"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [eventId, reloadSignal]);

  async function unificar() {
    setBusy(true); setError("");
    try {
      const out = await unificarOdds(eventId);
      setRows(out.linhas);
      setSummary({ n_cru: out.n_cru, n_unificado: out.n_unificado });
    } catch (e) { setError(e instanceof Error ? e.message : "erro ao unificar"); }
    finally { setBusy(false); }
  }

  // Dados da divergência p/ o modal, derivados das próprias linhas (impl = 1/odd_over por casa).
  const divergencias = rows
    .filter((r) => r.divergencia)
    .map((r) => ({
      entidade: r.entidade, market_type: r.market_type, linha: r.linha,
      spread_pp: r.spread_pp ?? 0, motivo: "",
      books: r.casas_comparadas.map((c) => ({ book: c.book, impl: 1 / c.odd_over })),
    }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={unificar} disabled={busy} className="btn">
          {busy ? "unificando…" : "⤳ Unificar odds"}
        </button>
        <span className="flex items-center gap-3 text-[0.7rem]">
          {summary && (
            <span className="text-muted">
              {summary.n_cru} cruas → <span className="text-value">{summary.n_unificado} apostas</span>
            </span>
          )}
          {divergencias.length > 0 && (
            <button
              onClick={() => setShowDiverg(true)}
              className="inline-flex items-center gap-1 rounded-sm border border-warn/40 px-2 py-0.5 text-[0.66rem] text-warn transition-colors hover:bg-warn/10"
            >
              ⚠ {divergencias.length} divergência(s)
            </button>
          )}
        </span>
      </div>

      {error && <ErrorBox msg={error} />}

      {loading ? (
        <p className="mono text-xs text-muted">carregando…</p>
      ) : rows.length === 0 ? (
        <p className="mono py-6 text-center text-[0.7rem] text-muted">
          sem odds unificadas — colete as odds ou clique em “Unificar odds”.
        </p>
      ) : (
        <div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-sm border border-line">
          <table className="w-full border-collapse text-[0.7rem]">
            <thead className="sticky top-0 bg-panel-2 text-faint">
              <tr>
                <th className="px-2 py-1 text-left">entidade</th>
                <th className="px-1 py-1 text-left">mercado</th>
                <th className="px-1 py-1 text-right">linha</th>
                <th className="px-1 py-1 text-right">melhor odd</th>
                <th className="px-1 py-1 text-left">casa</th>
                <th className="px-1 py-1 text-right">casas</th>
                <th className="px-1 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.entidade_norm}|${r.market_type}|${r.linha}`} className="border-t border-line-soft">
                  <td className="px-2 py-1">{r.entidade}</td>
                  <td className="px-1 py-1 text-muted">{marketNoun(r.market_type)}</td>
                  <td className="px-1 py-1 text-right">{r.linha}</td>
                  <td className="px-1 py-1 text-right text-value">{r.odd_over}</td>
                  <td className="px-1 py-1"><BookBadge book={r.book} /></td>
                  <td
                    className="px-1 py-1 text-right text-faint"
                    title={r.casas_comparadas.map((c) => `${c.book} ${c.odd_over}`).join(" · ")}
                  >
                    {r.casas_comparadas.length}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {r.divergencia && (
                      <span className="text-warn" title={`${r.spread_pp}pp de diferença entre casas`}>⚠</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDiverg && <DivergenceModal divergencias={divergencias} onClose={() => setShowDiverg(false)} />}
    </div>
  );
}
