import type { Candidate } from "@/lib/types";

const MERCADO_PT: Record<string, string> = {
  sot: "chutes a gol",
  finalizacoes: "finalizações",
  desarmes: "desarmes",
  escanteios: "escanteios",
  gols: "gols",
  vitoria: "resultado",
};

/** "over 2.5 desarmes" → "3+ desarmes" (rótulo de limiar da bet365, mais legível). */
export function friendlyLine(marketType: string, linha: number): string {
  const limiar = Math.ceil(linha); // 2.5 → 3, 0.5 → 1
  const nome = MERCADO_PT[marketType] ?? marketType;
  return `${limiar}+ ${nome}`;
}

/** EV (lucro por R$1 no longo prazo) → "+R$2,75 / R$10". */
export function evToReais(ev: number): string {
  const por10 = ev * 10;
  const sinal = por10 >= 0 ? "+" : "−";
  const valor = Math.abs(por10).toFixed(2).replace(".", ",");
  return `${sinal}R$${valor} / R$10`;
}

export type Risco = NonNullable<Candidate["risco"]>;

const RISCO_INFO: Record<Risco, { emoji: string; texto: string; tone: "value" | "warn" | "bad" }> = {
  seguro: { emoji: "🟢", texto: "seguro", tone: "value" },
  moderado: { emoji: "🟡", texto: "moderado", tone: "warn" },
  tiro_longo: { emoji: "🔴", texto: "tiro-longo", tone: "bad" },
};

export function riscoLabel(risco: Risco) {
  return RISCO_INFO[risco];
}

const POSICAO_PT: Record<string, string> = { G: "goleiro", D: "defensor", M: "meio-campo", F: "atacante" };

export function posicaoLabel(pos: string | null | undefined): string | null {
  if (!pos) return null;
  return POSICAO_PT[pos] ?? null;
}

/** Selo de titularidade pro meio-termo pré-lineup: ninguém some, mas o risco de
 * banco fica visível. Confirmado → null (o tag "titular ✓" já cobre). */
export function titularidadeInfo(
  c: Pick<Candidate, "titularidade" | "alerta_minutos">,
): { texto: string; tone: "warn" | "bad" } | null {
  if (c.titularidade === "provavel") {
    return c.alerta_minutos
      ? { texto: "escalação prevista — pode começar no banco", tone: "warn" }
      : { texto: "escalação prevista", tone: "warn" };
  }
  if (c.titularidade === "fora_do_xi") return { texto: "fora do time confirmado", tone: "bad" };
  if (c.titularidade === "desconhecido") return { texto: "sem escalação — confirme antes", tone: "warn" };
  return null;
}
