import { describe, it, expect } from "vitest";
import { applyFilters, toggleIn } from "./candidateFilters";
import type { Candidate } from "./types";

const c = (market: string, risco: Candidate["risco"]): Candidate => ({
  jogador: "X", player_id: null, linha: 1.5, odd: 2, prob_modelo: 0.5, prob_devig: 0.4,
  edge: 0.1, ev: 0.1, lambda: 2, minutos_esperados: 90, xi_confirmado: true,
  amostra_jogos: 10, concedido_adversario: "1", incerteza: "media", market_type: market, risco,
});

describe("candidateFilters", () => {
  it("vazio = mostra tudo; mercado e risco combinam em E", () => {
    const all = [c("desarmes", "seguro"), c("sot", "moderado"), c("desarmes", "tiro_longo")];
    expect(applyFilters(all, { mercados: [], riscos: [] })).toHaveLength(3);
    expect(applyFilters(all, { mercados: ["desarmes"], riscos: [] })).toHaveLength(2);
    expect(applyFilters(all, { mercados: ["desarmes"], riscos: ["seguro"] })).toHaveLength(1);
  });

  it("toggleIn liga/desliga valor na lista", () => {
    expect(toggleIn([], "sot")).toEqual(["sot"]);
    expect(toggleIn(["sot"], "sot")).toEqual([]);
    expect(toggleIn(["sot"], "desarmes")).toEqual(["sot", "desarmes"]);
  });
});
