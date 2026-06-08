import type { Jogo } from "./types";

export type Periodo = "todos" | "hoje" | "7d";
export interface FiltroJogos {
  busca: string;
  periodo: Periodo;
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function filtrarJogos(
  jogos: Jogo[],
  filtro: FiltroJogos,
  agora: Date = new Date(),
): Jogo[] {
  const termo = filtro.busca.trim().toLowerCase();
  const ini = inicioDoDia(agora);
  const fimHoje = new Date(ini);
  fimHoje.setDate(fimHoje.getDate() + 1);
  const fim7d = new Date(ini);
  fim7d.setDate(fim7d.getDate() + 7);

  return jogos.filter((j) => {
    if (termo) {
      const casa =
        j.mandante.toLowerCase().includes(termo) ||
        j.visitante.toLowerCase().includes(termo);
      if (!casa) return false;
    }
    if (filtro.periodo === "todos") return true;

    const d = j.data ? new Date(j.data) : null;
    if (!d || isNaN(d.getTime())) return false;

    if (filtro.periodo === "hoje") return d >= ini && d < fimHoje;
    return d >= ini && d < fim7d;
  });
}
