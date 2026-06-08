import type { Jogo } from "./types";

export interface GrupoDia {
  chave: string;
  label: string;
  jogos: Jogo[];
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEM_DATA = "sem-data";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function horaLocal(data: string | null): string {
  if (!data) return "";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function agruparPorData(jogos: Jogo[], agora: Date = new Date()): GrupoDia[] {
  const hoje = ymd(agora);
  const amanhaDate = new Date(agora);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanha = ymd(amanhaDate);

  const map = new Map<string, GrupoDia>();

  for (const j of jogos) {
    const d = j.data ? new Date(j.data) : null;
    const valido = d !== null && !isNaN(d.getTime());
    const chave = valido ? ymd(d!) : SEM_DATA;

    if (!map.has(chave)) {
      let label: string;
      if (chave === SEM_DATA) label = "sem data";
      else if (chave === hoje) label = "hoje";
      else if (chave === amanha) label = "amanhã";
      else label = `${DIAS[d!.getDay()]} ${d!.getDate()} ${MESES[d!.getMonth()]}`;
      map.set(chave, { chave, label, jogos: [] });
    }
    map.get(chave)!.jogos.push(j);
  }

  return [...map.values()].sort((a, b) => {
    if (a.chave === SEM_DATA) return 1;
    if (b.chave === SEM_DATA) return -1;
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });
}
