import { describe, it, expect } from "vitest";
import { oddsRowsToBatch } from "./oddsRows";
import type { OddsRow } from "./types";

describe("oddsRowsToBatch", () => {
  it("mapeia OddsRow[] do banco para ManualOddsLine[] (sem event_id/coletado_em)", () => {
    const rows: OddsRow[] = [
      { event_id: "e1", entidade: "CR7", market_type: "sot", linha: 0.5, odd_over: 1.5, odd_under: null, book: "bet365", coletado_em: "2026-06-11T00:00:00Z" },
    ];
    expect(oddsRowsToBatch(rows)).toEqual([
      { market_type: "sot", entidade: "CR7", linha: 0.5, odd_over: 1.5, odd_under: null, book: "bet365" },
    ]);
  });

  it("vazio → vazio", () => {
    expect(oddsRowsToBatch([])).toEqual([]);
  });
});
