import { describe, it, expect } from "vitest";
import { fmtClv, timingText } from "./clv";

describe("fmtClv", () => {
  it("formata CLV como % com sinal; null → travessão", () => {
    expect(fmtClv(0.053)).toBe("+5.3%");
    expect(fmtClv(-0.021)).toBe("−2.1%");
    expect(fmtClv(0)).toBe("+0.0%");
    expect(fmtClv(null)).toBe("—");
  });
});

describe("timingText", () => {
  it("apostar_pre → frase de agir antes da escalação; sem_sinal → neutro", () => {
    const t = timingText("apostar_pre", { media: 0.05, lo: 0.02, hi: 0.08, n: 12 });
    expect(t).toContain("antes da escalação");
    expect(timingText("sem_sinal", { media: 0, lo: -0.01, hi: 0.01, n: 3 })).toContain("Sem sinal de timing");
  });
});
