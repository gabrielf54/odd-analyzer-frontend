import { describe, it, expect } from "vitest";
import { friendlyLine, marketLabelPt, lineLabel, displayName, vitoriaOutcome, evToPct, riscoLabel, friendlyRejection } from "./format";

describe("marketLabelPt", () => {
  it("traduz o market_type pro nome por extenso (sem o limiar)", () => {
    expect(marketLabelPt("sot")).toBe("chutes a gol");
    expect(marketLabelPt("desarmes")).toBe("desarmes");
  });
  it("faltas diz 'cometidas' (a casa liquida fouls, não as sofridas)", () => {
    expect(marketLabelPt("faltas")).toBe("faltas cometidas");
  });
  it("mercado desconhecido cai no próprio key", () => {
    expect(marketLabelPt("xpto")).toBe("xpto");
  });
});

describe("friendlyLine", () => {
  it("converte over X.5 em 'N+' com o mercado por extenso", () => {
    expect(friendlyLine("desarmes", 2.5)).toBe("3+ desarmes");
    expect(friendlyLine("desarmes", 0.5)).toBe("1+ desarmes");
    expect(friendlyLine("finalizacoes", 1.5)).toBe("2+ finalizações");
    expect(friendlyLine("sot", 0.5)).toBe("1+ chutes a gol");
  });
  it("faltas diz 'cometidas' (a casa liquida fouls, não as sofridas)", () => {
    expect(friendlyLine("faltas", 0.5)).toBe("1+ faltas cometidas");
    expect(friendlyLine("faltas", 1.5)).toBe("2+ faltas cometidas");
  });
  it("mercado desconhecido cai no próprio key", () => {
    expect(friendlyLine("xpto", 1.5)).toBe("2+ xpto");
  });
});

describe("vitoriaOutcome", () => {
  it("traduz o código de lado pro desfecho legível", () => {
    expect(vitoriaOutcome("Canada x Bosnia & Herzegovina (1)")).toBe("Canada vence");
    expect(vitoriaOutcome("Canada x Bosnia & Herzegovina (X)")).toBe("empate");
    expect(vitoriaOutcome("Canada x Bosnia & Herzegovina (2)")).toBe("Bosnia & Herzegovina vence");
  });
  it("retorna null quando não é 1X2 com sufixo de lado", () => {
    expect(vitoriaOutcome("Luc De Fougerolles")).toBeNull();
    expect(vitoriaOutcome("Time sem separador (2)")).toBeNull();
  });
});

describe("lineLabel", () => {
  it("contagem → 'N+ mercado'", () => {
    expect(lineLabel({ market_type: "faltas", linha: 1.5, jogador: "Luc De Fougerolles" })).toBe("2+ faltas cometidas");
  });
  it("1X2 → desfecho, nunca '0+ resultado'", () => {
    expect(lineLabel({ market_type: "vitoria", linha: 0, jogador: "Canada x Bosnia & Herzegovina (2)" })).toBe("Bosnia & Herzegovina vence");
  });
  it("1X2 não-parseável cai em 'resultado' (fail-safe)", () => {
    expect(lineLabel({ market_type: "vitoria", linha: 0, jogador: "partida" })).toBe("resultado");
  });
});

describe("displayName", () => {
  it("1X2 → tira o código de lado do título", () => {
    expect(displayName({ market_type: "vitoria", jogador: "Canada x Bosnia & Herzegovina (2)" })).toBe("Canada x Bosnia & Herzegovina");
  });
  it("jogador → nome intacto", () => {
    expect(displayName({ market_type: "faltas", jogador: "Luc De Fougerolles" })).toBe("Luc De Fougerolles");
  });
});

describe("evToPct", () => {
  it("mostra a vantagem como % com sinal, arredondado", () => {
    expect(evToPct(0.2825)).toBe("+28%"); // card real: modelo 45% @ 2.85
    expect(evToPct(0.275)).toBe("+28%"); // 27,5 arredonda p/ cima
    expect(evToPct(0.898)).toBe("+90%"); // EV alto vira % grande
    expect(evToPct(-0.05)).toBe("−5%"); // negativo usa o mesmo minus do código
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
