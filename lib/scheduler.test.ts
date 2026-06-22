import { describe, it, expect } from "vitest";
import { statusTone, jobLabel } from "./scheduler";

describe("scheduler helpers", () => {
  it("statusTone mapeia ok/erro/pulado", () => {
    expect(statusTone("ok")).toBe("text-value");
    expect(statusTone("erro")).toBe("text-bad");
    expect(statusTone("pulado")).toBe("text-faint");
  });
  it("jobLabel traduz marco pro leigo", () => {
    expect(jobLabel("collect", "base")).toBe("coleta · abertura");
    expect(jobLabel("collect", "deriva")).toBe("coleta · deriva");
    expect(jobLabel("collect", "salto")).toBe("coleta · salto da escalação");
    expect(jobLabel("collect", "fechamento")).toBe("coleta · fechamento");
    expect(jobLabel("lineup_watch", "lineup_watch")).toBe("vigília da escalação");
    expect(jobLabel("forward_log", null)).toBe("previsão (gols/vitória)");
    expect(jobLabel("settle", null)).toBe("liquidação");
    expect(jobLabel("discover", null)).toBe("descoberta de jogos");
  });
});
