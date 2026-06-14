import { describe, it, expect } from "vitest";
import { filterOdds, marketOptions, bookOptions } from "./oddsTable";
import type { OddsRow } from "./types";

const rows: OddsRow[] = [
  { event_id: "e", entidade: "Saka",    market_type: "sot",      linha: 0.5, odd_over: 1.9, odd_under: 1.9, book: "kto" },
  { event_id: "e", entidade: "Saka",    market_type: "sot",      linha: 1.5, odd_over: 3.4, odd_under: 1.3, book: "betnacional" },
  { event_id: "e", entidade: "Rodri",   market_type: "desarmes", linha: 1.5, odd_over: 1.8, odd_under: 1.9, book: "kto" },
  { event_id: "e", entidade: "partida", market_type: "escanteios", linha: 9.5, odd_over: 1.9, odd_under: 1.9, book: "kto" },
];

describe("marketOptions / bookOptions", () => {
  it("lista mercados unicos ordenados", () => {
    expect(marketOptions(rows)).toEqual(["desarmes", "escanteios", "sot"]);
  });
  it("lista casas unicas ordenadas", () => {
    expect(bookOptions(rows)).toEqual(["betnacional", "kto"]);
  });
});

describe("filterOdds", () => {
  it("sem filtro devolve tudo", () => {
    expect(filterOdds(rows, { markets: [], books: [], search: "" })).toHaveLength(4);
  });
  it("filtra por mercado", () => {
    expect(filterOdds(rows, { markets: ["sot"], books: [], search: "" })).toHaveLength(2);
  });
  it("filtra por casa", () => {
    expect(filterOdds(rows, { markets: [], books: ["kto"], search: "" })).toHaveLength(3);
  });
  it("busca por entidade e case-insensitive", () => {
    expect(filterOdds(rows, { markets: [], books: [], search: "saka" })).toHaveLength(2);
  });
  it("combina mercado + casa + busca (AND)", () => {
    expect(filterOdds(rows, { markets: ["sot"], books: ["kto"], search: "saka" })).toHaveLength(1);
  });
});
