import { describe, it, expect } from "vitest";
import { filterMatches } from "@/lib/matchFilter";
import type { Match } from "@/lib/types";

function match(over: Partial<Match>): Match {
  return {
    id: "1", mandante: "Time A", visitante: "Time B",
    data: "2026-06-07T18:00:00Z", status: "notstarted", placar: null, league_id: 1,
    ...over,
  };
}

describe("filterMatches — busca", () => {
  const base = [
    match({ id: "1", mandante: "Flamengo", visitante: "Vasco" }),
    match({ id: "2", mandante: "Palmeiras", visitante: "Corinthians" }),
  ];

  it("casa no mandante", () => {
    const r = filterMatches(base, { search: "fla", period: "all" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("casa no visitante", () => {
    const r = filterMatches(base, { search: "corint", period: "all" });
    expect(r.map((j) => j.id)).toEqual(["2"]);
  });

  it("é case-insensitive e ignora espaços nas bordas", () => {
    const r = filterMatches(base, { search: "  VASCO ", period: "all" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("busca vazia passa tudo", () => {
    const r = filterMatches(base, { search: "", period: "all" });
    expect(r.map((j) => j.id)).toEqual(["1", "2"]);
  });
});

describe("filterMatches — periodo", () => {
  const now = new Date("2026-06-07T12:00:00");
  const base = [
    match({ id: "hoje",  data: "2026-06-07T20:00:00" }),
    match({ id: "ontem", data: "2026-06-06T20:00:00" }),
    match({ id: "d6",    data: "2026-06-13T10:00:00" }),
    match({ id: "d7",    data: "2026-06-14T10:00:00" }),
    match({ id: "nula",  data: null }),
  ];

  it("all passa tudo, inclusive sem data", () => {
    const r = filterMatches(base, { search: "", period: "all" }, now);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "d7", "hoje", "nula", "ontem"]);
  });

  it("today: só o jogo de hoje", () => {
    const r = filterMatches(base, { search: "", period: "today" }, now);
    expect(r.map((j) => j.id)).toEqual(["hoje"]);
  });

  it("7d: de hoje até hoje+6 inclusive; exclui passado, hoje+7 e sem data", () => {
    const r = filterMatches(base, { search: "", period: "7d" }, now);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "hoje"]);
  });

  it("combina busca E periodo (AND)", () => {
    const named = [
      match({ id: "x", mandante: "Santos", data: "2026-06-07T20:00:00" }),
      match({ id: "y", mandante: "Bahia",  data: "2026-06-07T20:00:00" }),
      match({ id: "z", mandante: "Santos", data: "2026-06-14T20:00:00" }),
    ];
    const r = filterMatches(named, { search: "santos", period: "today" }, now);
    expect(r.map((j) => j.id)).toEqual(["x"]);
  });
});
