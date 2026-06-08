import type { Match } from "./types";

export interface DayGroup {
  key: string;
  label: string;
  matches: Match[];
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const NO_DATE = "sem-data";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localTime(data: string | null): string {
  if (!data) return "";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function groupByDay(matches: Match[], now: Date = new Date()): DayGroup[] {
  const today = ymd(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = ymd(tomorrowDate);

  const map = new Map<string, DayGroup>();

  for (const j of matches) {
    const d = j.data ? new Date(j.data) : null;
    const valid = d !== null && !isNaN(d.getTime());
    const key = valid ? ymd(d!) : NO_DATE;

    if (!map.has(key)) {
      let label: string;
      if (key === NO_DATE) label = "sem data";
      else if (key === today) label = "hoje";
      else if (key === tomorrow) label = "amanhã";
      else label = `${WEEKDAYS[d!.getDay()]} ${d!.getDate()} ${MONTHS[d!.getMonth()]}`;
      map.set(key, { key, label, matches: [] });
    }
    map.get(key)!.matches.push(j);
  }

  // Ordena jogos por horário dentro de cada dia (mais cedo primeiro).
  for (const g of map.values()) {
    g.matches.sort((a, b) => {
      const ta = a.data ? new Date(a.data).getTime() : NaN;
      const tb = b.data ? new Date(b.data).getTime() : NaN;
      const aBad = isNaN(ta);
      const bBad = isNaN(tb);
      if (aBad && bBad) return 0;
      if (aBad) return 1;
      if (bBad) return -1;
      return ta - tb;
    });
  }

  return [...map.values()].sort((a, b) => {
    if (a.key === NO_DATE) return 1;
    if (b.key === NO_DATE) return -1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}
