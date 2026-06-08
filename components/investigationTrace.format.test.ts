import { describe, it, expect } from "vitest";
import { formatTraceForCopy } from "./InvestigationTrace";
import type { Trace } from "@/lib/types";

const trace: Trace = {
  alvo: "Mikel Oyarzabal", linha: 1.5, precisa: "2 ou mais",
  veredito_leigo: "Sem valor.",
  passos: [
    { passo: "taxa_base", titulo: "Ritmo", formula: "soma÷min×90", entradas: { stat_total: 3 }, saida: 0.45, frase: "fez 3" },
    { passo: "comparacao", titulo: "vs casa", formula: "edge", entradas: { edge: -0.32 }, saida: -0.32, frase: "sem vantagem" },
  ],
};

describe("formatTraceForCopy", () => {
  it("gera JSON válido com alvo e passos", () => {
    const s = formatTraceForCopy(trace);
    const parsed = JSON.parse(s);
    expect(parsed.alvo).toBe("Mikel Oyarzabal");
    expect(parsed.passos).toHaveLength(2);
    expect(parsed.passos[0].passo).toBe("taxa_base");
  });
});
