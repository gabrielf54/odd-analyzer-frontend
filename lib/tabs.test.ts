import { describe, it, expect } from "vitest";
import { addTab, removeTab, nextActiveId, tabLabel } from "@/lib/tabs";
import type { Match } from "@/lib/types";

const m = (id: string | number, mandante = "A", visitante = "B"): Match => ({
  id, mandante, visitante, data: null, status: "notstarted", placar: null, league_id: 1,
});

describe("tabs — lógica pura", () => {
  it("addTab anexa jogo novo no fim", () => {
    expect(addTab([m(1)], m(2)).map((t) => t.id)).toEqual([1, 2]);
  });

  it("addTab não duplica (dedup por id, string vs number)", () => {
    const tabs = addTab([m(1)], m("1"));
    expect(tabs).toHaveLength(1);
  });

  it("removeTab tira pelo id", () => {
    expect(removeTab([m(1), m(2)], 1).map((t) => t.id)).toEqual([2]);
  });

  it("nextActiveId: fechar aba inativa não mexe na ativa", () => {
    expect(nextActiveId([m(1), m(2), m(3)], 3, "1")).toBe("1");
  });

  it("nextActiveId: fechar a ativa do meio → herda a da direita", () => {
    expect(nextActiveId([m(1), m(2), m(3)], 2, "2")).toBe("3");
  });

  it("nextActiveId: fechar a ativa que é a última → nova última", () => {
    expect(nextActiveId([m(1), m(2), m(3)], 3, "3")).toBe("2");
  });

  it("nextActiveId: fechar a única aba → vazio (volta pra lista)", () => {
    expect(nextActiveId([m(1)], 1, "1")).toBe("");
  });

  it("tabLabel monta 'mandante × visitante'", () => {
    expect(tabLabel(m(1, "México", "Coreia"))).toBe("México × Coreia");
  });
});
