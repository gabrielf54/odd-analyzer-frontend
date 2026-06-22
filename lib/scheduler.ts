// Helpers PUROS de exibição do painel do Agendador. O backend (GET /scheduler/status)
// manda o estado; aqui só traduzimos pro leigo.

/** Cor pelo status do job: verde=ok, vermelho=erro, apagado=pulado. */
export function statusTone(status: string): string {
  if (status === "ok") return "text-value";
  if (status === "erro") return "text-bad";
  if (status === "pulado") return "text-faint";
  return "text-muted";
}

const MARK_PT: Record<string, string> = {
  base: "abertura", deriva: "deriva", salto: "salto da escalação", fechamento: "fechamento",
};

/** Frase leiga do job (tipo + marco). */
export function jobLabel(jobType: string, mark: string | null): string {
  switch (jobType) {
    case "collect": return `coleta · ${MARK_PT[mark ?? ""] ?? mark ?? "coleta"}`;
    case "lineup_watch": return "vigília da escalação";
    case "forward_log": return "previsão (gols/vitória)";
    case "settle": return "liquidação";
    case "discover": return "descoberta de jogos";
    default: return jobType;
  }
}
