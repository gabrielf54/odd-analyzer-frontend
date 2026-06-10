// Espelham o JSON do backend (chaves snake_case PT — não traduzir).
export interface League { id: number | string; nome: string; pais?: string; }

export interface Match {
  id: string | number;
  mandante: string;
  visitante: string;
  data: string | null;
  status: string;
  placar: string | null;
  league_id: number | string;
}

export interface Player { id: string; name: string; team_id: string; posicao: string; }

export interface LineupSide { team_name: string; team_id: string; jogadores: Player[]; }
export interface Lineup { origem: string; home: LineupSide; away: LineupSide; }

// Rastro investigativo (só vem sob diagnostico:true). snake_case PT espelhando o backend.
export interface TraceStep {
  passo: string;
  titulo: string;
  formula: string;
  entradas: Record<string, number | string>;
  saida: number;
  frase: string;
}
export interface Trace {
  alvo: string;
  linha: number;
  precisa: string;
  passos: TraceStep[];
  veredito_leigo: string;
}

// Bloco descritivo por candidato (espelha src/model/detailedStats.ts do backend).
export interface StatsDetalhadas {
  media_5: number | null;
  media_10: number | null;
  ultimos_valores: number[];
  minutos_medios: number | null;
  media_casa: number | null;
  media_fora: number | null;
  jogos_casa: number;
  jogos_fora: number;
}

export interface Candidate {
  jogador: string;
  player_id: string | null;
  linha: number;
  odd: number;
  prob_modelo: number;
  prob_devig: number;
  edge: number;
  ev: number;
  lambda: number;
  minutos_esperados: number;
  xi_confirmado: boolean;
  amostra_jogos: number;
  concedido_adversario: string;
  incerteza: string;
  market_type: string;
  posicao?: string | null;
  titularidade?: "confirmado" | "provavel" | "fora_do_xi" | "desconhecido" | null;
  alerta_minutos?: boolean;
  concedido_posicao?: string | null;
  trace?: Trace;
  stats_detalhadas?: StatsDetalhadas | null;
  // ───── enriquecimento da rota manual (rank + IA revisora) ─────
  risco?: "seguro" | "moderado" | "tiro_longo";
  recomendado?: boolean;
  ia_revisao?: { stance: "concorda" | "ressalva" | "veta"; nota: string | null } | null;
}

export interface AiBet { jogador: string; linha: number; veredito: string; confianca: string; motivo: string; }
export interface Ai { melhor_aposta: AiBet | null; outras: AiBet[]; alertas: string[]; }
export interface ManualIa { topo_explicacao: string | null; alertas: string[]; }

// Diagnóstico: candidato que NÃO passou nos cortes + quais cortes falharam.
// `motivos` espelha os códigos do backend (snake_case PT, como as demais chaves).
export type CutReason = "edge" | "ev" | "titular" | "amostra";
export interface RejectedCandidate extends Candidate { motivos: CutReason[]; }

export interface AnalysisResult {
  jogo: string;
  candidatos: Candidate[];
  reprovados: RejectedCandidate[];
  ia: Ai;
  em_validacao: boolean;
}

export type RealResult = Record<string, { valor_real: number; bateu: boolean }>;

// ───── Fluxo de coleta manual de odds (IA externa cola JSON) ─────
// Linha de odd colada (espelha o contrato do backend src/manual/schema.ts).
export interface ManualOddsLine {
  market_type: string;
  entidade: string;
  linha?: number;
  odd_over: number;
  odd_under: number | null;
  book: string;
}

// Jogador da casa que não casou na hora — o operador liga na mão (1 clique).
export interface SemMatch {
  nome_casa: string;
  market_type: string;
  candidatos: { id: string; name: string; confianca: number }[];
}

// Linha que a validação do backend recusou (não entra no money-path).
export interface LinhaRejeitada { linha_crua: unknown; motivo: string; }

export interface ManualAnalysisResult {
  jogo: string;
  candidatos: Candidate[];
  reprovados: RejectedCandidate[];
  jogadores_sem_match: SemMatch[];
  linhas_rejeitadas: LinhaRejeitada[];
  ia: ManualIa;
}

export interface Market { key: string; label: string; level: "player" | "match"; }

// Espelha o registry do backend (model/markets). Usado só p/ popular o select.
export const MARKETS: Market[] = [
  { key: "sot", label: "Chutes a Gol (SOT)", level: "player" },
  { key: "finalizacoes", label: "Finalizações Totais", level: "player" },
  { key: "desarmes", label: "Desarmes", level: "player" },
  { key: "escanteios", label: "Escanteios (Total)", level: "match" },
  { key: "gols", label: "Gols (Total)", level: "match" },
  { key: "vitoria", label: "Resultado (1X2)", level: "match" },
];
