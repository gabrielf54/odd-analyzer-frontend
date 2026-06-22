import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveOdd, removeOdd, getClvPorMercado } from "./api";

function mockFetchOk() {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ salvas: 1, linhas_rejeitadas: [] }) }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("saveOdd", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("faz POST /odds com a linha num lote de 1", async () => {
    const fn = mockFetchOk();
    await saveOdd("evt1", { market_type: "sot", entidade: "Saka", linha: 0.5, odd_over: 1.9, odd_under: 1.9, book: "kto" });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toMatch(/\/odds$/);
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.event_id).toBe("evt1");
    expect(body.odds).toHaveLength(1);
    expect(body.odds[0].entidade).toBe("Saka");
    expect(typeof body.coletado_em).toBe("string");
  });
});

describe("getClvPorMercado", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("faz GET /clv/por-mercado e devolve o corpo", async () => {
    const corpo = { por_mercado: [{ market_type: "sot", n: 3, clv_medio: 0.05, lo: 0.01, hi: 0.09 }], limitacao: "x" };
    const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => corpo }));
    vi.stubGlobal("fetch", fn);
    const out = await getClvPorMercado();
    const [url] = fn.mock.calls[0] as unknown as [string];
    expect(String(url)).toMatch(/\/clv\/por-mercado$/);
    expect(out.por_mercado[0].market_type).toBe("sot");
    expect(out.limitacao).toBe("x");
  });
});

describe("removeOdd", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("faz DELETE /jogos/:id/odds com filtro na querystring", async () => {
    const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fn);
    await removeOdd("evt1", { entidade: "Saka", market_type: "sot", linha: 0.5, book: "kto" });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    const u = String(url);
    expect(u).toContain("/jogos/evt1/odds?");
    expect(u).toContain("entidade=Saka");
    expect(u).toContain("market_type=sot");
    expect(u).toContain("linha=0.5");
    expect(u).toContain("book=kto");
  });
});
