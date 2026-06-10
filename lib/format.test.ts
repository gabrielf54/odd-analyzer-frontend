import { describe, it, expect } from "vitest";
import { friendlyLine, evToReais, riscoLabel } from "./format";

describe("friendlyLine", () => {
  it("converte over X.5 em 'N+' com o mercado por extenso", () => {
    expect(friendlyLine("desarmes", 2.5)).toBe("3+ desarmes");
    expect(friendlyLine("desarmes", 0.5)).toBe("1+ desarmes");
    expect(friendlyLine("finalizacoes", 1.5)).toBe("2+ finalizações");
    expect(friendlyLine("sot", 0.5)).toBe("1+ chutes a gol");
  });
  it("mercado desconhecido cai no próprio key", () => {
    expect(friendlyLine("xpto", 1.5)).toBe("2+ xpto");
  });
});

describe("evToReais", () => {
  it("mostra lucro esperado por R$10, com vírgula decimal e sinal", () => {
    expect(evToReais(0.275)).toBe("+R$2,75 / R$10");
    expect(evToReais(1.089)).toBe("+R$10,89 / R$10");
  });
});

describe("riscoLabel", () => {
  it("rotula cada faixa com emoji e texto", () => {
    expect(riscoLabel("seguro").texto).toMatch(/seguro/i);
    expect(riscoLabel("seguro").emoji).toBe("🟢");
    expect(riscoLabel("moderado").emoji).toBe("🟡");
    expect(riscoLabel("tiro_longo").emoji).toBe("🔴");
  });
});
