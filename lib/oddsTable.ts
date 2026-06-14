import type { OddsRow } from "./types";

export interface OddsFilters {
  markets: string[]; // vazio = todos
  books: string[];   // vazio = todas
  search: string;    // busca por entidade
}

export const marketOptions = (rows: OddsRow[]): string[] =>
  [...new Set(rows.map((r) => r.market_type))].sort();

export const bookOptions = (rows: OddsRow[]): string[] =>
  [...new Set(rows.map((r) => r.book))].sort();

export function filterOdds(rows: OddsRow[], f: OddsFilters): OddsRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.markets.length && !f.markets.includes(r.market_type)) return false;
    if (f.books.length && !f.books.includes(r.book)) return false;
    if (q && !r.entidade.toLowerCase().includes(q)) return false;
    return true;
  });
}
