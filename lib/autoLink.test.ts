import { describe, it, expect } from "vitest";
import { correctionOptions } from "./autoLink";
import type { AutoLigado } from "./types";

const al = (over: Partial<AutoLigado> = {}): AutoLigado => ({
  nome_casa: "Ali Youssef", market_type: "desarmes", player_id: "1", player_name: "Ali Yousif",
  confianca: 0.77,
  candidatos: [
    { id: "1", name: "Ali Yousif", confianca: 0.77 },
    { id: "2", name: "Ali Al-Hamadi", confianca: 0.5 },
  ],
  ...over,
});

describe("correctionOptions", () => {
  it("exclui o jogador já auto-ligado das opções de corrigir", () => {
    const opts = correctionOptions(al());
    expect(opts.map((o) => o.id)).toEqual(["2"]);
  });

  it("sem alternativas quando o único candidato era o próprio match", () => {
    const opts = correctionOptions(al({ candidatos: [{ id: "1", name: "Ali Yousif", confianca: 0.77 }] }));
    expect(opts).toEqual([]);
  });
});
