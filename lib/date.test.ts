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

describe("agruparPorData — ordem dentro do dia", () => {
  const agora = new Date("2026-06-07T08:00:00");

  it("ordena jogos do mesmo dia por horário (mais cedo primeiro)", () => {
    const jogos = [
      base({ id: "tarde", data: "2026-06-07T21:00:00" }),
      base({ id: "cedo",  data: "2026-06-07T16:00:00" }),
      base({ id: "meio",  data: "2026-06-07T18:30:00" }),
    ];
    const grupos = agruparPorData(jogos, agora);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].jogos.map((j) => j.id)).toEqual(["cedo", "meio", "tarde"]);
  });

  it("mantém ordem crescente entre dias", () => {
    const jogos = [
      base({ id: "amanha", data: "2026-06-08T16:00:00" }),
      base({ id: "hoje",   data: "2026-06-07T16:00:00" }),
    ];
    const grupos = agruparPorData(jogos, agora);
    expect(grupos.map((g) => g.jogos[0].id)).toEqual(["hoje", "amanha"]);
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
