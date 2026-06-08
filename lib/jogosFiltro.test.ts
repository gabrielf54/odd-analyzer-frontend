import { describe, it, expect } from "vitest";
import { filtrarJogos } from "@/lib/jogosFiltro";
import type { Jogo } from "@/lib/types";

function jogo(over: Partial<Jogo>): Jogo {
  return {
    id: "1", mandante: "Time A", visitante: "Time B",
    data: "2026-06-07T18:00:00Z", status: "notstarted", placar: null, league_id: 1,
    ...over,
  };
}

describe("filtrarJogos — busca", () => {
  const base = [
    jogo({ id: "1", mandante: "Flamengo", visitante: "Vasco" }),
    jogo({ id: "2", mandante: "Palmeiras", visitante: "Corinthians" }),
  ];

  it("casa no mandante", () => {
    const r = filtrarJogos(base, { busca: "fla", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("casa no visitante", () => {
    const r = filtrarJogos(base, { busca: "corint", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["2"]);
  });

  it("é case-insensitive e ignora espaços nas bordas", () => {
    const r = filtrarJogos(base, { busca: "  VASCO ", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("busca vazia passa tudo", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1", "2"]);
  });
});

describe("filtrarJogos — periodo", () => {
  const agora = new Date("2026-06-07T12:00:00");
  const base = [
    jogo({ id: "hoje",  data: "2026-06-07T20:00:00" }),
    jogo({ id: "ontem", data: "2026-06-06T20:00:00" }),
    jogo({ id: "d6",    data: "2026-06-13T10:00:00" }),
    jogo({ id: "d7",    data: "2026-06-14T10:00:00" }),
    jogo({ id: "nula",  data: null }),
  ];

  it("todos passa tudo, inclusive sem data", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "todos" }, agora);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "d7", "hoje", "nula", "ontem"]);
  });

  it("hoje: só o jogo de hoje", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "hoje" }, agora);
    expect(r.map((j) => j.id)).toEqual(["hoje"]);
  });

  it("7d: de hoje até hoje+6 inclusive; exclui passado, hoje+7 e sem data", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "7d" }, agora);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "hoje"]);
  });

  it("combina busca E periodo (AND)", () => {
    const comNome = [
      jogo({ id: "x", mandante: "Santos", data: "2026-06-07T20:00:00" }),
      jogo({ id: "y", mandante: "Bahia",  data: "2026-06-07T20:00:00" }),
      jogo({ id: "z", mandante: "Santos", data: "2026-06-14T20:00:00" }),
    ];
    const r = filtrarJogos(comNome, { busca: "santos", periodo: "hoje" }, agora);
    expect(r.map((j) => j.id)).toEqual(["x"]);
  });
});
