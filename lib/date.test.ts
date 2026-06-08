import { describe, it, expect } from "vitest";
import { groupByDay, localTime } from "@/lib/date";
import type { Match } from "@/lib/types";

const base = (over: Partial<Match>): Match => ({
  id: "x", mandante: "A", visitante: "B", data: null,
  status: "notstarted", placar: null, league_id: 1, ...over,
});

// referência fixa: 07 jun 2026, 12:00 local
const NOW = new Date(2026, 5, 7, 12, 0, 0);

describe("groupByDay", () => {
  it("lista vazia → []", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it("rotula hoje e amanhã", () => {
    const matches = [
      base({ id: "1", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 8, 11, 0).toISOString() }),
    ];
    const g = groupByDay(matches, NOW);
    expect(g.map((x) => x.label)).toEqual(["hoje", "amanhã"]);
  });

  it("ordena dias em ordem crescente", () => {
    const matches = [
      base({ id: "1", data: new Date(2026, 5, 10, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = groupByDay(matches, NOW);
    expect(g.map((x) => x.label)).toEqual(["hoje", "qua 10 jun"]);
  });

  it("jogos sem data caem em 'sem data' no fim", () => {
    const matches = [
      base({ id: "1", data: null }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = groupByDay(matches, NOW);
    expect(g[g.length - 1].label).toBe("sem data");
  });
});

describe("groupByDay — ordem dentro do dia", () => {
  const now = new Date("2026-06-07T08:00:00");

  it("ordena jogos do mesmo dia por horário (mais cedo primeiro)", () => {
    const matches = [
      base({ id: "tarde", data: "2026-06-07T21:00:00" }),
      base({ id: "cedo",  data: "2026-06-07T16:00:00" }),
      base({ id: "meio",  data: "2026-06-07T18:30:00" }),
    ];
    const groups = groupByDay(matches, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].matches.map((j) => j.id)).toEqual(["cedo", "meio", "tarde"]);
  });

  it("mantém ordem crescente entre dias", () => {
    const matches = [
      base({ id: "amanha", data: "2026-06-08T16:00:00" }),
      base({ id: "hoje",   data: "2026-06-07T16:00:00" }),
    ];
    const groups = groupByDay(matches, now);
    expect(groups.map((g) => g.matches[0].id)).toEqual(["hoje", "amanha"]);
  });
});

describe("localTime", () => {
  it("formata HH:MM", () => {
    expect(localTime(new Date(2026, 5, 7, 16, 5).toISOString())).toBe("16:05");
  });
  it("null → ''", () => {
    expect(localTime(null)).toBe("");
  });
  it("data inválida → ''", () => {
    expect(localTime("não-é-data")).toBe("");
  });
});
