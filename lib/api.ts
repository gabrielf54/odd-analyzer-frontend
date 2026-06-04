// Único ponto que fala com o backend. Nenhum componente faz fetch solto.
import type { Liga, Jogo, Escalacao, AnaliseResult, ResultadoReal } from "./types";

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

export const getLigas = () => req<Liga[]>("/ligas");

export const getJogos = (ligaId: string | number, status: "finished" | "notstarted") =>
  req<Jogo[]>(`/ligas/${ligaId}/jogos?status=${status}`);

export const getEscalacao = (eventId: string | number) =>
  req<Escalacao>(`/jogos/${eventId}/escalacao`);

export interface AnalisarBody {
  event_id: string;
  market_key: string;
  linha?: number;
  odd_over?: number;
  odd_under?: number;
  usar_ia?: boolean;
  player_ref?: string | null;
  league_id?: string | number | null;
}

export const postAnalisar = (body: AnalisarBody) =>
  req<AnaliseResult>("/analisar", { method: "POST", body: JSON.stringify(body) });

export const getResultado = (eventId: string | number, market: string, linha: number) =>
  req<ResultadoReal>(`/jogos/${eventId}/resultado?market=${market}&linha=${linha}`);
