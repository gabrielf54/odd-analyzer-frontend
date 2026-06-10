"use client";

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
