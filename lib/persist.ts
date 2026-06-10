export interface StoredPlayer {
  matchId: string;
  player: string;
}

// Restaura o jogador só se foi escolhido NESTE jogo; senão volta vazio.
export function restorePlayer(stored: StoredPlayer | null, matchId: string): string {
  return stored && stored.matchId === matchId ? stored.player : "";
}
