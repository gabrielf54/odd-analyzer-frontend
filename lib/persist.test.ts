import { describe, it, expect } from "vitest";
import { restorePlayer, type StoredPlayer } from "@/lib/persist";

describe("restorePlayer", () => {
  it("restaura jogador quando matchId bate", () => {
    const s: StoredPlayer = { matchId: "42", player: "Kaiki" };
    expect(restorePlayer(s, "42")).toBe("Kaiki");
  });

  it("zera quando matchId é de outro jogo", () => {
    const s: StoredPlayer = { matchId: "42", player: "Kaiki" };
    expect(restorePlayer(s, "99")).toBe("");
  });

  it("zera quando não há nada guardado", () => {
    expect(restorePlayer(null, "42")).toBe("");
  });
});
