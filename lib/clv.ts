// Helpers PUROS de exibição do CLV (testáveis em node). O número vem do backend
// (GET /jogos/:id/clv); aqui só formatamos pro leigo.
import type { LineupEdge } from "./types";

/** CLV como % com sinal: 0.053 → "+5.3%". null → travessão. Usa o "−" (minus) do tema. */
export function fmtClv(x: number | null): string {
  if (x == null) return "—";
  const sinal = x >= 0 ? "+" : "−";
  return `${sinal}${Math.abs(x * 100).toFixed(1)}%`;
}

/** Frase leiga da recomendação de timing. */
export function timingText(rec: "apostar_pre" | "sem_sinal", edge: LineupEdge): string {
  if (rec === "apostar_pre") {
    return `Apostar antes da escalação — o modelo costuma ganhar ${fmtClv(edge.media)} no salto da escalação (n=${edge.n}).`;
  }
  return "Sem sinal de timing (ou já passou a escalação, ou a amostra ainda não prova vantagem).";
}
