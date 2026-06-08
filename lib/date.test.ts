import { describe, it, expect } from "vitest";
import { agruparPorData, horaLocal } from "@/lib/date";
import type { Jogo } from "@/lib/types";

const base = (over: Partial<Jogo>): Jogo => ({
  id: "x", mandante: "A", visitante: "B", data: null,
  status: "notstarted", placar: null, league_id: 1, ...over,
});

// referência fixa: 07 jun 2026, 12:00 local
const AGORA = new Date(2026, 5, 7, 12, 0, 0);

describe("agruparPorData", () => {
  it("lista vazia → []", () => {
    expect(agruparPorData([], AGORA)).toEqual([]);
  });

  it("rotula hoje e amanhã", () => {
    const jogos = [
      base({ id: "1", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 8, 11, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g.map((x) => x.label)).toEqual(["hoje", "amanhã"]);
  });

  it("ordena dias em ordem crescente", () => {
    const jogos = [
      base({ id: "1", data: new Date(2026, 5, 10, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g.map((x) => x.label)).toEqual(["hoje", "qua 10 jun"]);
  });

  it("jogos sem data caem em 'sem data' no fim", () => {
    const jogos = [
      base({ id: "1", data: null }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g[g.length - 1].label).toBe("sem data");
  });
});

describe("horaLocal", () => {
  it("formata HH:MM", () => {
    expect(horaLocal(new Date(2026, 5, 7, 16, 5).toISOString())).toBe("16:05");
  });
  it("null → ''", () => {
    expect(horaLocal(null)).toBe("");
  });
  it("data inválida → ''", () => {
    expect(horaLocal("não-é-data")).toBe("");
  });
});
