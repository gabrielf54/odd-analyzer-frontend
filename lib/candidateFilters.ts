// Filtro puro da lista de candidatos (chips de mercado e risco). Vazio = sem filtro.
import type { Candidate } from "./types";

export interface CandidateFilters { mercados: string[]; riscos: string[]; }

export function applyFilters(cands: Candidate[], f: CandidateFilters): Candidate[] {
  return cands.filter(
    (c) =>
      (f.mercados.length === 0 || f.mercados.includes(c.market_type)) &&
      (f.riscos.length === 0 || (c.risco != null && f.riscos.includes(c.risco))),
  );
}

export function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
