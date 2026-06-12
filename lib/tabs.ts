// Lógica pura das abas de jogos (estilo VSCode). Sem React, sem DOM —
// testável em node. A lista de abas é Match[]; a aba ativa vive na URL.
import type { Match } from "./types";

const eq = (a: Match["id"], b: string | number) => String(a) === String(b);

/** Adiciona a aba se ainda não existe (dedup por id). Mantém a ordem de abertura. */
export function addTab(tabs: Match[], m: Match): Match[] {
  return tabs.some((t) => eq(t.id, m.id)) ? tabs : [...tabs, m];
}

/** Remove a aba pelo id. */
export function removeTab(tabs: Match[], id: string | number): Match[] {
  return tabs.filter((t) => !eq(t.id, id));
}

/** Qual aba fica ativa depois de fechar `closingId`.
 *  - Fechou uma aba que não era a ativa → ativa não muda.
 *  - Fechou a ativa → assume a vizinha que herda o slot (a da direita; se era a
 *    última, a nova última). Sem abas restantes → "" (volta pra lista de jogos). */
export function nextActiveId(
  tabs: Match[],
  closingId: string | number,
  activeId: string,
): string {
  if (!eq(closingId, activeId)) return activeId;
  const idx = tabs.findIndex((t) => eq(t.id, closingId));
  const rest = tabs.filter((t) => !eq(t.id, closingId));
  if (idx === -1 || rest.length === 0) return "";
  return String(rest[Math.min(idx, rest.length - 1)]!.id);
}

/** Rótulo curto da aba: "Mandante × Visitante". */
export function tabLabel(m: Match): string {
  return `${m.mandante} × ${m.visitante}`;
}
