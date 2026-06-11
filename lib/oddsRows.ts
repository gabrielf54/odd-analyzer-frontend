import type { OddsRow, ManualOddsLine } from "./types";

/** OddsRow[] (tabela) → ManualOddsLine[] (lote da tela). Descarta event_id/coletado_em. */
export function oddsRowsToBatch(rows: OddsRow[]): ManualOddsLine[] {
  return rows.map((r) => ({
    market_type: r.market_type,
    entidade: r.entidade,
    linha: r.linha,
    odd_over: r.odd_over,
    odd_under: r.odd_under,
    book: r.book,
  }));
}
