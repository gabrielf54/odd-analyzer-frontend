import type { Candidate } from "@/lib/types";

const MERCADO_PT: Record<string, string> = {
  sot: "chutes a gol",
  finalizacoes: "finalizações",
  desarmes: "desarmes",
  // a casa liquida `fouls` (faltas COMETIDAS pelo jogador), não as sofridas — o
  // rótulo precisa dizer qual, senão o operador não sabe o que está apostando.
  faltas: "faltas cometidas",
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

/** 1X2: o candidato de vitória chega como "Time A x Time B (1|X|2)" — o sufixo é o
 * código de lado que o backend cola (1=mandante, X=empate, 2=visitante; ver
 * pipeline.ts SUFIXO). Traduz pro desfecho legível ("Time B vence" / "empate").
 * Retorna null se não for 1X2 ou não der pra parsear (fail-safe pro chamador). */
export function vitoriaOutcome(jogador: string): string | null {
  const m = jogador.match(/^(.*) \(([1X2])\)\s*$/);
  if (!m) return null;
  const [, partida, lado] = m;
  if (lado === "X") return "empate";
  const times = partida.split(" x ");
  if (times.length !== 2) return null;
  const [home, away] = times.map((t) => t.trim());
  return lado === "1" ? `${home} vence` : `${away} vence`;
}

type LineFields = { market_type: string; linha: number; jogador: string };

/** Rótulo da LINHA no card. Contagem → "2+ desarmes" / "2+ faltas cometidas".
 * 1X2 → o desfecho ("Bósnia vence"), nunca "0+ resultado" (linha 0 é falsa em 1X2). */
export function lineLabel(c: LineFields): string {
  if (c.market_type === "vitoria") return vitoriaOutcome(c.jogador) ?? "resultado";
  return friendlyLine(c.market_type, c.linha);
}

/** Nome do GRUPO/título. Pra 1X2, tira o código cru "(1|X|2)" do fim, deixando só o
 * nome do jogo no cabeçalho (o desfecho vai na linha). Pro resto, o próprio nome. */
export function displayName(c: Pick<LineFields, "market_type" | "jogador">): string {
  if (c.market_type === "vitoria") return c.jogador.replace(/\s*\([1X2]\)\s*$/, "");
  return c.jogador;
}

/** EV como percentual de vantagem → "+28%". É o lucro médio por R$1 apostado no
 * longo prazo (ev = prob_modelo×odd − 1). Mostra como % e não como "R$2,87 / R$10"
 * porque o leigo lia o R$ como ganho de UMA aposta — e é média de muitas. */
export function evToPct(ev: number): string {
  const pontos = Math.round(ev * 100);
  const sinal = pontos >= 0 ? "+" : "−";
  return `${sinal}${Math.abs(pontos)}%`;
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

// Motivos de recusa do backend (src/manual/schema.ts) → frase leiga.
// Match por prefixo/trecho estável; fallback genérico pra motivo novo.
// Acoplado às strings literais de lá — mudou a mensagem no backend, atualize aqui (fallback cobre o resto).
const REJECTION_RULES: Array<[RegExp, string]> = [
  [/^odd_over deve ser/, "a odd da aposta veio inválida (1,01 ou menor) — confira o que a IA copiou do site"],
  [/^odd_under deve ser/, "o outro lado da aposta (under) veio com odd inválida — confira o que a IA copiou"],
  [/^market_type desconhecido/, "tipo de mercado que o sistema não conhece — essa linha não é analisável"],
  [/^mercado de jogador exige/, "faltou o nome do jogador ou a quantidade (linha) nessa aposta"],
  [/^mercado de partida/, "apostas de total do jogo precisam dos dois lados (mais de / menos de) e da linha"],
  [/^formato inválido/, "a linha veio num formato que o sistema não entendeu"],
];

export function friendlyRejection(motivo: string): string {
  for (const [re, frase] of REJECTION_RULES) if (re.test(motivo)) return frase;
  return "linha recusada — confira o que a IA devolveu";
}
