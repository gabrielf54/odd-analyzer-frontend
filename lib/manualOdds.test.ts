import { describe, it, expect } from "vitest";
import { parsePastedOdds, countByMarket, aliasDiffs } from "@/lib/manualOdds";

describe("parsePastedOdds — JSON legado (retrocompat)", () => {
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

  it("texto vazio → erro", () => {
    expect(parsePastedOdds("  ").error).toMatch(/cole as odds/);
  });

  it("JSON quebrado (começa com '{') → erro de JSON inválido", () => {
    expect(parsePastedOdds("{nao é json").error).toMatch(/inválido/);
  });

  it("array JSON sem nenhuma linha válida → erro", () => {
    expect(parsePastedOdds("[]").error).toMatch(/nenhuma linha/);
  });
});

describe("parsePastedOdds — formato compacto (pipe)", () => {
  it("lê linhas de jogador com book no cabeçalho", () => {
    const txt = `book=bet365
sot|Kai Havertz|1.5|1.72
desarmes|Joshua Kimmich|0.5|1.45`;
    const { lines, error } = parsePastedOdds(txt);
    expect(error).toBeNull();
    expect(lines).toEqual([
      { market_type: "sot", entidade: "Kai Havertz", linha: 1.5, odd_over: 1.72, odd_under: null, book: "bet365" },
      { market_type: "desarmes", entidade: "Joshua Kimmich", linha: 0.5, odd_over: 1.45, odd_under: null, book: "bet365" },
    ]);
  });

  it("alias com '^' vira entidade + entidade_casa", () => {
    const { lines } = parsePastedOdds(`book=bet365
passes|Joshua Kimmich^J.Kimmich|29.5|1.80`);
    expect(lines[0].entidade).toBe("Joshua Kimmich");
    expect(lines[0].entidade_casa).toBe("J.Kimmich");
  });

  it("sem '^' não define entidade_casa", () => {
    const { lines } = parsePastedOdds(`book=bet365
sot|Kai Havertz|1.5|1.72`);
    expect(lines[0].entidade_casa).toBeUndefined();
  });

  it("totais (gols/escanteios) trazem odd_under no 5º campo", () => {
    const { lines } = parsePastedOdds(`book=bet365
gols|partida|2.5|1.90|1.95`);
    expect(lines[0]).toMatchObject({
      market_type: "gols", entidade: "partida", linha: 2.5, odd_over: 1.9, odd_under: 1.95, book: "bet365",
    });
  });

  it("vitoria não tem linha (3 campos)", () => {
    const { lines } = parsePastedOdds(`book=bet365
vitoria|Germany|1.80
vitoria|empate|3.40`);
    expect(lines[0]).toMatchObject({ market_type: "vitoria", entidade: "Germany", odd_over: 1.8, odd_under: null });
    expect(lines[0].linha).toBeUndefined();
    expect(lines[1].entidade).toBe("empate");
  });

  it("sem cabeçalho book → book 'manual'", () => {
    const { lines } = parsePastedOdds(`sot|Kai Havertz|1.5|1.72`);
    expect(lines[0].book).toBe("manual");
  });

  it("ignora linhas em branco, comentários e malformadas, mantendo as válidas", () => {
    const txt = `book=bet365

# isto é um comentário
lixo sem pipe
sot|Kai Havertz|1.5|1.72
desarmes|Joshua Kimmich|abc|naoNumero
faltas|Kai Havertz|0.5|1.55`;
    const { lines, error } = parsePastedOdds(txt);
    expect(error).toBeNull();
    expect(lines.map((l) => l.market_type)).toEqual(["sot", "faltas"]);
  });

  it("nada aproveitável → erro", () => {
    const { lines, error } = parsePastedOdds(`book=bet365\nlixo\noutra coisa`);
    expect(lines).toEqual([]);
    expect(error).toBeTruthy();
  });
});

describe("aliasDiffs", () => {
  it("lista os nomes que diferiram da casa, sem repetir", () => {
    const { lines } = parsePastedOdds(`book=bet365
passes|Joshua Kimmich^J.Kimmich|29.5|1.80
sot|Joshua Kimmich^J.Kimmich|1.5|2.40
desarmes|Kai Havertz|0.5|1.45`);
    expect(aliasDiffs(lines)).toEqual([{ entidade: "Joshua Kimmich", casa: "J.Kimmich" }]);
  });

  it("sem aliases → vazio", () => {
    const { lines } = parsePastedOdds(`book=bet365\nsot|Kai Havertz|1.5|1.72`);
    expect(aliasDiffs(lines)).toEqual([]);
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
