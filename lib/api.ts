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

// Liga um nome da casa a um jogador (stats-id) e persiste no crosswalk.
export const postCrosswalk = (nome_casa: string, player_id: string) =>
  req<{ ok: boolean }>("/crosswalk", { method: "POST", body: JSON.stringify({ nome_casa, player_id }) });
