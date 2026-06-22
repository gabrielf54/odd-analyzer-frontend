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
  // Casa (book) que deu a odd usada + comparação cross-casa (já vêm do backend).
  book?: string | null;
  casas_comparadas?: { book: string; odd_over: number }[];
}

export interface ManualIa { topo_explicacao: string | null; alertas: string[]; }

// Diagnóstico: candidato que NÃO passou nos cortes + quais cortes falharam.
// `motivos` espelha os códigos do backend (snake_case PT, como as demais chaves).
export type CutReason = "edge" | "ev" | "titular" | "amostra";
export interface RejectedCandidate extends Candidate { motivos: CutReason[]; }

// ───── Fluxo de coleta manual de odds (IA externa cola JSON) ─────
// Linha de odd colada (espelha o contrato do backend src/manual/schema.ts).
export interface ManualOddsLine {
  market_type: string;
  entidade: string;
  linha?: number;
  odd_over: number;
  odd_under: number | null;
  book: string;
  // Nome como a casa exibe, só quando difere de `entidade` (auditoria de match
  // em tempo de coleta — não vai pro backend). Vem do formato compacto `ent^casa`.
  entidade_casa?: string;
}

// Jogador da casa que não casou na hora — o operador liga na mão (1 clique).
export interface SemMatch {
  nome_casa: string;
  market_type: string;
  candidatos: { id: string; name: string; confianca: number }[];
}

// Jogador casado SOZINHO com confiança intermediária [0.75,0.85): o sistema ligou,
// mas mostra "liguei sozinho — confira" pro operador confirmar ou corrigir.
export interface AutoLigado {
  nome_casa: string;
  market_type: string;
  player_id: string;
  player_name: string;
  confianca: number;
  candidatos: { id: string; name: string; confianca: number }[];
}

// Linha que a validação do backend recusou (não entra no money-path).
export interface LinhaRejeitada { linha_crua: unknown; motivo: string; }

export interface ManualAnalysisResult {
  jogo: string;
  candidatos: Candidate[];
  reprovados: RejectedCandidate[];
  jogadores_sem_match: SemMatch[];
  // Opcional: análises salvas ANTES desta feature não têm o campo (retrocompat).
  auto_ligados?: AutoLigado[];
  linhas_rejeitadas: LinhaRejeitada[];
  ia: ManualIa;
}

// Linha de odd persistida (espelha a tabela `odds` do backend; retorno do GET).
export interface OddsRow {
  event_id: string;
  entidade: string;
  market_type: string;
  linha: number;
  odd_over: number;
  odd_under: number | null;
  book: string;
  coletado_em?: string;
}

// Linha do ESPELHO canônico (tabela `odds_unificadas`): 1 por aposta, melhor preço.
// É o que a ANÁLISE consome; a tabela crua `odds` fica só como log.
export interface UnifiedOddsRow {
  event_id: string;
  entidade_norm: string;
  market_type: string;
  linha: number;
  entidade: string;
  odd_over: number;
  odd_under: number | null;
  book: string;
  casas_comparadas: { book: string; odd_over: number }[];
  divergencia: boolean;
  spread_pp: number | null;
  coletado_em?: string;
}


// ───── CLV / movimento de linha (GET /jogos/:id/clv) — espelha o backend ─────
export interface ClvSegments {
  pre_escalacao: number | null;
  salto_escalacao: number | null;
  pos_escalacao: number | null;
  total: number | null;
  marcos: {
    entrada_em: string | null;
    escalacao_em: string | null;
    kickoff: string;
    entrada_odd: number | null;
    fechamento_odd: number | null;
  };
}
export interface LineupEdge { media: number; lo: number; hi: number; n: number; }
export interface ClvBet {
  jogador: string;
  player_id: string | null;
  market_type: string;
  linha: number;
  segmentos: ClvSegments;
  pre_lineup: boolean;
  recomendacao: "apostar_pre" | "sem_sinal";
}
export interface ClvResult {
  kickoff: string | null;
  apostas: ClvBet[];
  resumo_por_mercado: Record<string, LineupEdge>;
}

// ───── CLV AGREGADO por mercado, entre todos os jogos (GET /clv/por-mercado) ─────
export interface MarketClv {
  market_type: string;
  n: number;
  clv_medio: number; // CLV médio entrada→fechamento
  lo: number;        // IC 95% (bootstrap)
  hi: number;
}
export interface ClvPorMercadoResult {
  por_mercado: MarketClv[];
  limitacao: string; // gap honesto: CLV só p/ prop com odd; edge precisa de odds 2 lados
}

// ───── Agendador 24h (GET /scheduler/status) ─────
export interface ScheduledJob {
  event_id: string;
  jogo: string;
  job_type: string;   // 'collect' | 'lineup_watch'
  mark: string | null;
  fireAt: number;     // epoch ms
  kickoff: string;
}
export interface SchedulerRun {
  event_id?: string | null;
  jogo?: string | null;
  job_type: string;
  mark?: string | null;
  status: string;     // 'ok' | 'erro' | 'pulado'
  detalhe?: any;
  criado_em: string;
}
export interface SchedulerStatus {
  enabled: boolean;
  scheduled: ScheduledJob[];
  runs: SchedulerRun[];
}
