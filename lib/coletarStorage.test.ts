import { describe, it, expect, beforeEach } from "vitest";
import { loadBatch, saveBatch, loadResult, saveResult, clearStored } from "./coletarStorage";
import type { ManualAnalysisResult, ManualOddsLine } from "./types";

// stub de localStorage pro env node
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

const line: ManualOddsLine = { market_type: "desarmes", entidade: "Rice", linha: 2.5, odd_over: 2.37, odd_under: 1.55, book: "bet365" };
const result = { jogo: "A x B", candidatos: [], reprovados: [], jogadores_sem_match: [], linhas_rejeitadas: [], ia: { topo_explicacao: null, alertas: [] } } as ManualAnalysisResult;

describe("coletarStorage", () => {
  it("lote e resultado são por evento: F5 restaura, outro jogo não vê", () => {
    saveBatch("ev1", [line]);
    saveResult("ev1", { result, analisado_em: "2026-06-10T17:00:00Z" });
    expect(loadBatch("ev1")).toEqual([line]);
    expect(loadResult("ev1")?.analisado_em).toBe("2026-06-10T17:00:00Z");
    expect(loadBatch("ev2")).toEqual([]);
    expect(loadResult("ev2")).toBeNull();
  });

  it("clearStored limpa lote E resultado do evento", () => {
    saveBatch("ev1", [line]);
    saveResult("ev1", { result, analisado_em: "x" });
    clearStored("ev1");
    expect(loadBatch("ev1")).toEqual([]);
    expect(loadResult("ev1")).toBeNull();
  });

  it("salvar lote vazio remove a chave; JSON corrompido degrada pra vazio", () => {
    saveBatch("ev1", [line]);
    saveBatch("ev1", []);
    expect(loadBatch("ev1")).toEqual([]);
    store.set("oa:coletar:resultado:v1:ev1", "{torto");
    expect(loadResult("ev1")).toBeNull();
  });

  it("shape inválido (sem candidatos array) degrada pra null", () => {
    store.set("oa:coletar:resultado:v1:ev1", JSON.stringify({ result: { jogo: "x" }, analisado_em: "t" }));
    expect(loadResult("ev1")).toBeNull();
  });
});
