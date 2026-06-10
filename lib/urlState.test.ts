import { describe, it, expect } from "vitest";
import { withLeague, withMatch, withoutMatch } from "@/lib/urlState";

describe("urlState helpers", () => {
  it("withLeague seta league e limpa match", () => {
    const p = new URLSearchParams("league=1&match=99");
    expect(withLeague(p, "2")).toBe("league=2");
  });

  it("withLeague com id vazio remove league e match", () => {
    const p = new URLSearchParams("league=1&match=99");
    expect(withLeague(p, "")).toBe("");
  });

  it("withMatch seta match preservando league", () => {
    const p = new URLSearchParams("league=1");
    expect(withMatch(p, "42")).toBe("league=1&match=42");
  });

  it("withMatch com id vazio remove match", () => {
    const p = new URLSearchParams("league=1&match=42");
    expect(withMatch(p, "")).toBe("league=1");
  });

  it("withoutMatch remove match mantendo league", () => {
    const p = new URLSearchParams("league=1&match=42");
    expect(withoutMatch(p)).toBe("league=1");
  });
});
