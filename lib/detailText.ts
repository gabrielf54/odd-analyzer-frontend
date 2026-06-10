// Frases leigas do drawer de detalhe. Só transforma campos recebidos em texto —
// campo null some da lista, nunca estimar (mesma regra do backend).
import type { Candidate } from "./types";

const NOUN: Record<string, string> = {
  desarmes: "desarmes",
  sot: "chutes a gol",
  finalizacoes: "finalizações",
  escanteios: "escanteios",
  gols: "gols",
};

export function marketNoun(marketType: string): string {
  return NOUN[marketType] ?? marketType;
}

// decimal com vírgula sem depender de ICU (Node minimal quebra toLocaleString pt-BR)
const br = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

export function playerStatLines(c: Candidate): string[] {
  const s = c.stats_detalhadas;
  if (!s) return [];
  const noun = marketNoun(c.market_type);
  const n5 = Math.min(5, c.amostra_jogos);
  const n10 = Math.min(10, c.amostra_jogos);
  const out: string[] = [];
  if (s.media_5 != null && n5 > 0) out.push(`Média de ${br(s.media_5)} ${noun} por jogo nos últimos ${n5} jogos.`);
  if (s.media_10 != null && n10 > n5) out.push(`A média nos últimos ${n10} jogos é ${br(s.media_10)} por jogo.`);
  if (s.ultimos_valores.length > 0) out.push(`Jogo a jogo (do mais recente): ${s.ultimos_valores.join(", ")}.`);
  if (s.media_casa != null) out.push(`Em casa: ${br(s.media_casa)} por jogo (${s.jogos_casa} jogos).`);
  if (s.media_fora != null) out.push(`Fora: ${br(s.media_fora)} por jogo (${s.jogos_fora} jogos).`);
  if (s.minutos_medios != null) out.push(`Costuma ficar em campo uns ${Math.round(s.minutos_medios)} minutos por jogo.`);
  return out;
}

export function confrontoLines(c: Candidate): string[] {
  const noun = marketNoun(c.market_type);
  const out: string[] = [];
  if (c.concedido_adversario && !String(c.concedido_adversario).startsWith("n/d")) {
    out.push(`O adversário costuma ceder ${c.concedido_adversario} ${noun} por jogo aos rivais.`);
  }
  if (c.concedido_posicao) out.push(`Contra jogadores da posição dele: ${c.concedido_posicao}.`);
  return out;
}
