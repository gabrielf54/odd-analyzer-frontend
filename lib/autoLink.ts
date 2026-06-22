// Lógica do painel "liguei sozinho — confira" (auto-link de nome com confiança [0.75,0.85)).
import type { AutoLigado } from "./types";

/** Opções de CORREÇÃO de um auto-link = os candidatos parecidos MENOS o que já foi
 * ligado (não faz sentido "corrigir" pro mesmo jogador). Preserva a ordem por confiança. */
export function correctionOptions(al: AutoLigado): { id: string; name: string; confianca: number }[] {
  return al.candidatos.filter((c) => c.id !== al.player_id);
}
