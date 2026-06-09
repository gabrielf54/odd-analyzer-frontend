import type { ManualOddsLine } from "./types";

export interface ParseResult { lines: ManualOddsLine[]; error: string | null; }

/** Lê o JSON que a IA externa devolveu (colado pelo operador). Aceita um array
 * de linhas, um objeto `{ odds: [...] }` ou uma linha solta. Tolerante a ruído:
 * descarta entradas sem `market_type`/`odd_over`. Erro só quando nada aproveita. */
export function parsePastedOdds(text: string): ParseResult {
  const t = (text ?? "").trim();
  if (!t) return { lines: [], error: "cole o JSON das odds primeiro" };

  let data: unknown;
  try { data = JSON.parse(t); } catch { return { lines: [], error: "JSON inválido — verifique o que a IA devolveu" }; }

  let arr: unknown[];
  if (Array.isArray(data)) arr = data;
  else if (data && typeof data === "object" && Array.isArray((data as { odds?: unknown }).odds)) {
    arr = (data as { odds: unknown[] }).odds;
  } else if (data && typeof data === "object" && "market_type" in data) {
    arr = [data];
  } else {
    return { lines: [], error: "esperado um array de linhas de odds" };
  }

  const lines: ManualOddsLine[] = [];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (o.market_type == null || o.odd_over == null) continue;
    lines.push({
      market_type: String(o.market_type),
      entidade: String(o.entidade ?? "partida"),
      linha: o.linha != null ? Number(o.linha) : undefined,
      odd_over: Number(o.odd_over),
      odd_under: o.odd_under != null ? Number(o.odd_under) : null,
      book: String(o.book ?? "manual"),
    });
  }
  if (lines.length === 0) return { lines: [], error: "nenhuma linha válida encontrada no JSON" };
  return { lines, error: null };
}

/** Conta linhas por mercado (pro resumo do lote). */
export function countByMarket(lines: ManualOddsLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) out[l.market_type] = (out[l.market_type] ?? 0) + 1;
  return out;
}
