// Único ponto que fala com o backend. Nenhum componente faz fetch solto.
import type {
  League, Match,
  ManualOddsLine, ManualAnalysisResult,
  OddsRow, LinhaRejeitada,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = body && typeof body === "object" && "erro" in body ? (body as any).erro : `Erro ${r.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export const getLeagues = () => req<League[]>("/ligas");

export const getMatches = (leagueId: string | number, status: "finished" | "notstarted") =>
  req<Match[]>(`/ligas/${leagueId}/jogos?status=${status}`);

// ───── Fluxo de coleta manual de odds ─────
// Texto pronto pra colar na IA externa (um por mercado/aba).
export const getOddsPrompt = (eventId: string | number, market: string) =>
  req<{ prompt: string }>(`/prompt?event_id=${eventId}&market=${market}`);

export interface ManualAnalyzeBody {
  event_id: string;
  coletado_em: string;
  odds: ManualOddsLine[];
}

// Cola o JSON de odds → análise geral de todos os mercados.
export const postAnalyzeManual = (body: ManualAnalyzeBody) =>
  req<ManualAnalysisResult>("/analise/manual", { method: "POST", body: JSON.stringify(body) });

// ───── Coleta AUTOMÁTICA multi-casa (botão "obter odds") ─────
// O backend acha o jogo nas casas (KTO + Betnacional), coleta, faz line shopping e grava
// no `odds`. Pode levar alguns segundos (abre navegador headless p/ a Betnacional/Cloudflare).
export interface CollectResult {
  jogo: string;
  casas: { book: string; ok: boolean; n: number; erro?: string }[];
  n_por_casa: number;
  n_line_shop: number;
  divergencias: { entidade: string; market_type: string; linha: number; spread_pp: number; motivo: string }[];
  linhas_rejeitadas: number;
  gravadas: number;
}

export const coletarOdds = (eventId: string | number) =>
  req<CollectResult>(`/jogos/${eventId}/coletar-odds`, { method: "POST", body: JSON.stringify({}) });

// ───── Odds persistidas (tabela = fonte de verdade) ─────
export const getOdds = (eventId: string | number) =>
  req<OddsRow[]>(`/jogos/${eventId}/odds`);

// Resultado completo da última análise manual (banco = fonte de verdade), ou null.
export const getAnalysis = (eventId: string | number) =>
  req<{ result: ManualAnalysisResult; analisado_em: string } | null>(`/jogos/${eventId}/analise`);

export const saveOdds = (body: ManualAnalyzeBody) =>
  req<{ salvas: number; linhas_rejeitadas: LinhaRejeitada[] }>("/odds", { method: "POST", body: JSON.stringify(body) });

export const deleteOdds = (eventId: string | number) =>
  req<{ ok: true }>(`/jogos/${eventId}/odds`, { method: "DELETE" });

// Upsert de UMA odd (editar valor OU adicionar linha). Mesma PK
// (entidade,market_type,linha,book) => o backend sobrescreve.
export const saveOdd = (eventId: string | number, line: ManualOddsLine) =>
  saveOdds({ event_id: String(eventId), coletado_em: new Date().toISOString(), odds: [line] });

// Remove UMA odd via filtro na querystring (DELETE /jogos/:id/odds).
export const removeOdd = (
  eventId: string | number,
  filter: { entidade: string; market_type: string; linha: number; book: string },
) => {
  const qs = new URLSearchParams({
    entidade: filter.entidade,
    market_type: filter.market_type,
    linha: String(filter.linha),
    book: filter.book,
  });
  return req<{ ok: true }>(`/jogos/${eventId}/odds?${qs.toString()}`, { method: "DELETE" });
};

// Liga um nome da casa a um jogador (stats-id) e persiste no crosswalk.
export const postCrosswalk = (nome_casa: string, player_id: string) =>
  req<{ ok: boolean }>("/crosswalk", { method: "POST", body: JSON.stringify({ nome_casa, player_id }) });
