// Persistência das abas abertas (estilo VSCode: F5 reabre os mesmos jogos).
// Guarda a lista de Match; a aba ativa fica na URL, não aqui.
import type { Match } from "./types";

const TABS_KEY = "oa:tabs:v1";

function isMatch(x: unknown): x is Match {
  const m = x as Match;
  return !!m && (typeof m.id === "string" || typeof m.id === "number")
    && typeof m.mandante === "string" && typeof m.visitante === "string"
    && (typeof m.league_id === "string" || typeof m.league_id === "number");
}

export function loadTabs(): Match[] {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter(isMatch) : [];
  } catch { return []; }
}

export function saveTabs(tabs: Match[]): void {
  try {
    if (tabs.length) localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    else localStorage.removeItem(TABS_KEY);
  } catch { /* quota/privado — abas viram efêmeras, sem quebrar */ }
}
