import { describe, it, expect } from "vitest";
import { bookMeta } from "./bookMeta";

describe("bookMeta", () => {
  it("kto vira sigla KTO", () => {
    expect(bookMeta("kto").sigla).toBe("KTO");
  });
  it("betnacional vira sigla BET", () => {
    expect(bookMeta("betnacional").sigla).toBe("BET");
  });
  it("manual vira sigla MAN", () => {
    expect(bookMeta("manual").sigla).toBe("MAN");
  });
  it("casa desconhecida usa 3 primeiras letras maiusculas", () => {
    expect(bookMeta("superbet").sigla).toBe("SUP");
  });
  it("null/undefined cai em manual", () => {
    expect(bookMeta(null).sigla).toBe("MAN");
    expect(bookMeta(undefined).sigla).toBe("MAN");
  });
  it("entrada e case-insensitive e ignora espacos", () => {
    expect(bookMeta(" KTO ").sigla).toBe("KTO");
  });
  it("toda casa tem classes de cor (dot e text)", () => {
    expect(bookMeta("kto").dotClass).toBeTruthy();
    expect(bookMeta("kto").textClass).toBeTruthy();
  });
});
