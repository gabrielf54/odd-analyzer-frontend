// Espelham o JSON do backend (chaves snake_case PT).
export interface Liga { id: number | string; nome: string; pais?: string; }

export interface Jogo {
  id: string | number;
  mandante: string;
  visitante: string;
  data: string | null;
  status: string;
  placar: string | null;
  league_id: number | string;
}

export interface Jogador { id: string; name: string; team_id: string; posicao: string; }

export interface LadoEscalacao { team_name: string; team_id: string; jogadores: Jogador[]; }
export interface Escalacao { origem: string; home: LadoEscalacao; away: LadoEscalacao; }

export interface Candidato {
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
}

export interface IaAposta { jogador: string; linha: number; veredito: string; confianca: string; motivo: string; }
export interface Ia { melhor_aposta: IaAposta | null; outras: IaAposta[]; alertas: string[]; }

export interface AnaliseResult { jogo: string; candidatos: Candidato[]; ia: Ia; em_validacao: boolean; }

export type ResultadoReal = Record<string, { valor_real: number; bateu: boolean }>;

export interface Mercado { key: string; label: string; nivel: "jogador" | "partida"; }

// Espelha o registry do backend (model/markets). Usado só p/ popular o select.
export const MERCADOS: Mercado[] = [
  { key: "sot", label: "Chutes a Gol (SOT)", nivel: "jogador" },
  { key: "finalizacoes", label: "Finalizações Totais", nivel: "jogador" },
  { key: "desarmes", label: "Desarmes", nivel: "jogador" },
  { key: "escanteios", label: "Escanteios (Total)", nivel: "partida" },
  { key: "gols", label: "Gols (Total)", nivel: "partida" },
  { key: "vitoria", label: "Resultado (1X2)", nivel: "partida" },
];
