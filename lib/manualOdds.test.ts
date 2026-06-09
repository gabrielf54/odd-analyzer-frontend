import { describe, it, expect } from "vitest";
import { parsePastedOdds, countByMarket } from "@/lib/manualOdds";

describe("parsePastedOdds", () => {
  it("lê um array de linhas (só over)", () => {
    const r = parsePastedOdds(JSON.stringify([
      { market_type: "sot", entidade: "K. Havertz", linha: 0.5, odd_over: 2.1, book: "bet365" },
    ]));
    expect(r.error).toBeNull();
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].odd_under).toBeNull();
    expect(r.lines[0].entidade).toBe("K. Havertz");
  });

  it("lê objeto { odds: [...] }", () => {
    const r = parsePastedOdds(JSON.stringify({ odds: [
      { market_type: "escanteios", entidade: "partida", linha: 9.5, odd_over: 1.9, odd_under: 1.9, book: "b" },
    ] }));
    expect(r.error).toBeNull();
    expect(r.lines[0].odd_under).toBe(1.9);
  });

  it("descarta entradas sem market_type/odd_over mas mantém as boas", () => {
    const r = parsePastedOdds(JSON.stringify([
      { entidade: "lixo" },
      { market_type: "sot", entidade: "X", linha: 1.5, odd_over: 2.0, book: "b" },
    ]));
    expect(r.lines).toHaveLength(1);
  });

  it("texto vazio → erro pedindo o JSON", () => {
    expect(parsePastedOdds("  ").error).toMatch(/cole o JSON/);
  });

  it("JSON quebrado → erro de JSON inválido", () => {
    expect(parsePastedOdds("{nao é json").error).toMatch(/inválido/);
  });

  it("array sem nenhuma linha válida → erro", () => {
    expect(parsePastedOdds("[]").error).toMatch(/nenhuma linha/);
  });
});

describe("countByMarket", () => {
  it("conta por mercado", () => {
    const c = countByMarket([
      { market_type: "sot", entidade: "a", odd_over: 2, odd_under: null, book: "b" },
      { market_type: "sot", entidade: "b", odd_over: 2, odd_under: null, book: "b" },
      { market_type: "escanteios", entidade: "partida", odd_over: 2, odd_under: 2, book: "b" },
    ]);
    expect(c).toEqual({ sot: 2, escanteios: 1 });
  });
});
