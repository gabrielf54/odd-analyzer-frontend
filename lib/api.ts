// Único ponto que fala com o backend. Nenhum componente faz fetch solto.
import type {
  League, Match, Lineup, AnalysisResult, RealResult,
  ManualOddsLine, ManualAnalysisResult,
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

export const getLineup = (eventId: string | number) =>
  req<Lineup>(`/jogos/${eventId}/escalacao`);

export interface AnalyzeBody {
  event_id: string;
  market_key: string;
  linha?: number;
  odd_over?: number;
  odd_under?: number;
  usar_ia?: boolean;
  player_ref?: string | null;
  league_id?: string | number | null;
  diagnostico?: boolean;
}

export const postAnalyze = (body: AnalyzeBody) =>
  req<AnalysisResult>("/analisar", { method: "POST", body: JSON.stringify(body) });

export const getResult = (eventId: string | number, market: string, line: number) =>
  req<RealResult>(`/jogos/${eventId}/resultado?market=${market}&linha=${line}`);

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

// Liga um nome da casa a um jogador (stats-id) e persiste no crosswalk.
export const postCrosswalk = (nome_casa: string, player_id: string) =>
  req<{ ok: boolean }>("/crosswalk", { method: "POST", body: JSON.stringify({ nome_casa, player_id }) });
