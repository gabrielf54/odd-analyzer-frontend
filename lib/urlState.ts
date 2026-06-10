"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// ───── helpers puros (testáveis em node) ─────
export function withLeague(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  if (id) next.set("league", id);
  else next.delete("league");
  next.delete("match"); // trocar de liga não pode manter jogo de outra liga
  return next.toString();
}

export function withMatch(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  if (id) next.set("match", id);
  else next.delete("match");
  return next.toString();
}

export function withoutMatch(params: URLSearchParams): string {
  return withMatch(params, "");
}

// ───── hook (wrapper fino sobre os helpers + Next router) ─────
export interface UrlState {
  leagueId: string;
  matchId: string;
  setLeague: (id: string) => void;
  setMatch: (id: string) => void;
  clearMatch: () => void;
}

export function useUrlState(): UrlState {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = new URLSearchParams(search.toString());

  const go = (qs: string) =>
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

  return {
    leagueId: search.get("league") ?? "",
    matchId: search.get("match") ?? "",
    setLeague: (id) => go(withLeague(current, id)),
    setMatch: (id) => go(withMatch(current, id)),
    clearMatch: () => go(withoutMatch(current)),
  };
}
