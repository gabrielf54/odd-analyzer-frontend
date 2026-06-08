import type { Match } from "./types";

export type Period = "all" | "today" | "7d";
export interface MatchFilterOptions {
  search: string;
  period: Period;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function filterMatches(
  matches: Match[],
  filter: MatchFilterOptions,
  now: Date = new Date(),
): Match[] {
  const term = filter.search.trim().toLowerCase();
  const start = startOfDay(now);
  const endToday = new Date(start);
  endToday.setDate(endToday.getDate() + 1);
  const end7d = new Date(start);
  end7d.setDate(end7d.getDate() + 7);

  return matches.filter((j) => {
    if (term) {
      const hit =
        j.mandante.toLowerCase().includes(term) ||
        j.visitante.toLowerCase().includes(term);
      if (!hit) return false;
    }
    if (filter.period === "all") return true;

    const d = j.data ? new Date(j.data) : null;
    if (!d || isNaN(d.getTime())) return false;

    if (filter.period === "today") return d >= start && d < endToday;
    return d >= start && d < end7d;
  });
}
