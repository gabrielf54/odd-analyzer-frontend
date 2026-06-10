import { describe, it, expect } from "vitest";
import { playerStatLines, confrontoLines, marketNoun } from "./detailText";
import type { Candidate } from "./types";

const base: Candidate = {
  jogador: "Rice", player_id: "1", linha: 2.5, odd: 2.37, prob_modelo: 0.54, prob_devig: 0.42,
  edge: 0.12, ev: 0.28, lambda: 3.2, minutos_esperados: 78, xi_confirmado: false,
  amostra_jogos: 50, concedido_adversario: "17.0", incerteza: "baixa", market_type: "desarmes",
  posicao: "M", titularidade: "provavel",
  stats_detalhadas: {
    media_5: 2.8, media_10: 2.5, ultimos_valores: [6, 4, 2, 1, 1], minutos_medios: 84.6,
    media_casa: 3.5, media_fora: 2.1, jogos_casa: 4, jogos_fora: 6,
  },
};

describe("detailText", () => {
  it("marketNoun traduz o mercado", () => {
    expect(marketNoun("desarmes")).toBe("desarmes");
    expect(marketNoun("sot")).toBe("chutes a gol");
    expect(marketNoun("finalizacoes")).toBe("finalizações");
  });

  it("frases com média, jogo a jogo, casa/fora e minutos — sem jargão", () => {
    const lines = playerStatLines(base);
    const txt = lines.join(" ");
    expect(txt).toContain("2,8 desarmes por jogo nos últimos 5 jogos");
    expect(txt).toContain("últimos 10 jogos");
    expect(txt).toContain("6, 4, 2, 1, 1");
    expect(txt).toContain("Em casa: 3,5 por jogo (4 jogos)");
    expect(txt).toContain("Fora: 2,1 por jogo (6 jogos)");
    expect(txt).toContain("85 minutos");
    expect(txt).not.toMatch(/edge|\bev\b|prob|lambda/i);
  });

  it("amostra menor que a janela → frase diz o número real de jogos", () => {
    const poucos = { ...base, amostra_jogos: 6 };
    const txt = playerStatLines(poucos).join(" ");
    expect(txt).toContain("nos últimos 6 jogos"); // janela-10 vira 6
    expect(txt).not.toContain("últimos 10");
  });

  it("campo null some da lista (nunca inventa)", () => {
    const semCasa = { ...base, stats_detalhadas: { ...base.stats_detalhadas!, media_casa: null, media_fora: null } };
    const txt = playerStatLines(semCasa).join(" ");
    expect(txt).not.toContain("Em casa");
    expect(txt).not.toContain("Fora:");
    expect(playerStatLines({ ...base, stats_detalhadas: null })).toEqual([]);
  });

  it("confronto usa concedido_adversario e concedido_posicao", () => {
    const lines = confrontoLines({ ...base, concedido_posicao: "2.1/jogo a meio-campistas (1.10× o típico)" });
    const txt = lines.join(" ");
    expect(txt).toContain("17.0");
    expect(txt).toContain("meio-campistas");
  });
});
