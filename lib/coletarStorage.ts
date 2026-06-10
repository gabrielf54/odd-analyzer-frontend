// Persistência por jogo da tela Coletar (lote colado + resultado da análise).
// Chaves por evento: trocar de jogo não apaga nada; F5 restaura tudo.
import type { ManualOddsLine, ManualAnalysisResult } from "./types";

const loteKey = (eventId: string) => `oa:coletar:lote:${eventId}`;
const resultKey = (eventId: string) => `oa:coletar:resultado:${eventId}`;

export interface StoredResult { result: ManualAnalysisResult; analisado_em: string; }

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function write(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota/privado */ }
}
function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* idem */ }
}

export const loadBatch = (eventId: string): ManualOddsLine[] => read<ManualOddsLine[]>(loteKey(eventId)) ?? [];
export const saveBatch = (eventId: string, batch: ManualOddsLine[]): void =>
  batch.length ? write(loteKey(eventId), batch) : remove(loteKey(eventId));
export const loadResult = (eventId: string): StoredResult | null => read<StoredResult>(resultKey(eventId));
export const saveResult = (eventId: string, r: StoredResult): void => write(resultKey(eventId), r);
export const clearStored = (eventId: string): void => { remove(loteKey(eventId)); remove(resultKey(eventId)); };
