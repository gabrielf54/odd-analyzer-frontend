import { describe, it, expect } from "vitest";
import { friendlyLine, evToReais, riscoLabel, friendlyRejection } from "./format";

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

import { titularidadeInfo, posicaoLabel } from "@/lib/format";

describe("titularidadeInfo", () => {
  it("provavel + alerta de minutos → aviso de banco", () => {
    const t = titularidadeInfo({ titularidade: "provavel", alerta_minutos: true } as never);
    expect(t?.texto).toMatch(/banco/);
    expect(t?.tone).toBe("warn");
  });
  it("provavel sem alerta → escalação prevista", () => {
    const t = titularidadeInfo({ titularidade: "provavel", alerta_minutos: false } as never);
    expect(t?.texto).toMatch(/prevista/);
  });
  it("confirmado → null (o tag 'titular ✓' existente cobre)", () => {
    expect(titularidadeInfo({ titularidade: "confirmado", alerta_minutos: false } as never)).toBeNull();
  });
});

describe("posicaoLabel", () => {
  it("traduz G/D/M/F e devolve null pro resto", () => {
    expect(posicaoLabel("M")).toBe("meio-campo");
    expect(posicaoLabel("F")).toBe("atacante");
    expect(posicaoLabel("?")).toBeNull();
    expect(posicaoLabel(null)).toBeNull();
  });
});

describe("friendlyRejection", () => {
  it("traduz os motivos do backend pra frase leiga", () => {
    expect(friendlyRejection("odd_over deve ser > 1.01")).toMatch(/odd .*inválida/i);
    expect(friendlyRejection("odd_under deve ser > 1.01")).toMatch(/outro lado/i);
    expect(friendlyRejection("market_type desconhecido: xpto")).toMatch(/mercado/i);
    expect(friendlyRejection("mercado de jogador exige entidade (nome) e linha")).toMatch(/nome|linha/i);
    expect(friendlyRejection("mercado de partida (totais) exige os dois lados e linha")).toMatch(/dois lados/i);
    expect(friendlyRejection("formato inválido da linha")).toMatch(/formato/i);
    expect(friendlyRejection("qualquer coisa nova")).toMatch(/confira/i);
  });
});
