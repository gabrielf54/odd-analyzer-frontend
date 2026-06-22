// Helpers PUROS do CLV por mercado (testáveis em node). O número vem do backend
// (GET /clv/por-mercado); aqui só traduzimos o IC num selo de confiança pro leigo.

export type ClvTone = "value" | "bad" | "muted";

/** Lê o IC 95% (lo/hi) do CLV de um mercado e devolve o tom + selo pro leigo:
 *  IC todo acima de zero = a meu favor (confiável); todo abaixo = contra mim (confiável);
 *  cruzando zero = ainda ruído (amostra não prova nada). */
export function clvConfidence(lo: number, hi: number): { tone: ClvTone; selo: string } {
  if (lo > 0) return { tone: "value", selo: "a meu favor" };
  if (hi < 0) return { tone: "bad", selo: "contra mim" };
  return { tone: "muted", selo: "ainda ruído" };
}
