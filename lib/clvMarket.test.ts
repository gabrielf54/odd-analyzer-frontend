import { describe, it, expect } from "vitest";
import { clvConfidence } from "./clvMarket";

describe("clvConfidence (IC do CLV por mercado → selo de confiança pro leigo)", () => {
  it("IC inteiro acima de zero → a meu favor (confiável)", () => {
    const c = clvConfidence(0.02, 0.08);
    expect(c.tone).toBe("value");
    expect(c.selo).toContain("favor");
  });
  it("IC inteiro abaixo de zero → contra mim (confiável)", () => {
    const c = clvConfidence(-0.09, -0.01);
    expect(c.tone).toBe("bad");
    expect(c.selo).toContain("contra");
  });
  it("IC cruza zero → ainda ruído (não confiável)", () => {
    const c = clvConfidence(-0.03, 0.05);
    expect(c.tone).toBe("muted");
    expect(c.selo).toContain("ruído");
  });
});
