# Rastro Investigativo — design

> Data: 2026-06-08 · Repos: `odd-analyzer-frontend` (front) + `odd-analyzer` (backend)

## Problema

Quando uma análise não encontra oportunidade (lista vazia ou candidato reprovado), o
dono quer saber **por quê de verdade** — não só "edge baixo", mas a causa-raiz na conta.
Hoje o backend calcula a cadeia toda do `lambda` (taxa base → encolhimento → minutos →
fator adversário → fator casa → probabilidade → de-vig → edge/EV) mas **descarta os passos
intermediários**, devolvendo só o agregado. Caixa-preta.

Exemplo real (Mikel Oyarzabal, SOT 1.5, odd 4): `lambda=0.317`, `edge=-0.321`, `ev=-0.808`.
A aritmética final está correta, mas o `lambda` (≈0.45 SOT/90 após encolhimento) é o número
suspeito — e não dá pra ver de onde veio sem ler o código.

## Objetivo

Um **rastro investigativo** emitido quando `diagnostico:true`, servindo **dois consumidores**:

1. **O dono (leigo)** — frases em português do dia a dia: *"Nos últimos 5 jogos fez só 3
   chutes a gol; pra bater precisaria de 2 ou mais por jogo."* Zero jargão.
2. **Uma IA auditora** — o JSON técnico completo (cada input → cada fórmula → cada saída),
   colável numa IA pra investigar se o código/matemática falhou.

**Não-objetivo:** recalcular nada no front; mudar a matemática do modelo; cobrir só SOT.
O rastro é **agnóstico de mercado** (player: SOT/finalizações/desarmes; match: gols/escanteios).

## Princípio agnóstico

O rastro é uma **lista ordenada de passos auto-descritivos**, não campos fixos por mercado.
Cada modelo (player via `playerMuFromGames`, match via `matchModel`) preenche os passos dele.
Mercado novo só adiciona passos — o front não muda.

## Forma dos dados (backend → API)

Campo novo opcional `trace` em cada candidato e cada reprovado, presente só sob `diagnostico:true`:

```ts
interface TraceStep {
  passo: string;        // id curto estável: "taxa_base"
  titulo: string;       // rótulo curto pro dono: "Taxa de chutes a gol"
  formula: string;      // "soma(SOT) ÷ soma(minutos) × 90"
  entradas: Record<string, number | string>;  // {sot_total: 3, minutos_total: 270, jogos: 5}
  saida: number;        // 0.45
  frase: string;        // "Nos últimos 5 jogos fez só 3 chutes a gol"
}

interface Trace {
  alvo: string;         // jogador ou "Spain x Peru"
  linha: number;
  precisa: string;      // "2 ou mais chutes a gol"  (k = floor(linha) + 1)
  passos: TraceStep[];  // ordem: taxa_base → encolhimento → minutos → fator_adversario
                        //        → fator_casa → probabilidade → devig → edge_ev
  veredito_leigo: string; // narrativa final, juntando os passos numa explicação
}
```

Tipos espelhados no front em `lib/types.ts` (mesma chave snake_case PT). `Candidate` e
`RejectedCandidate` ganham `trace?: Trace`.

## Linguagem de leigo — no backend

`frase` (por passo) e `veredito_leigo` (resumo) são gerados **no backend**, onde estão os
números e os limiares de domínio. O front só renderiza.

Justificativa da exceção ao CLAUDE.md ("texto de UI no front"): essas frases são *explicação
da conta*, não chrome de interface — manter no backend evita o front duplicar regra de domínio
(o que conta como "precisa bater", o que é taxa baixa). Fonte única.

## Mudanças no backend (`odd-analyzer`)

- `playerMuFromGames` (em `model/assemble.ts`) passa a, opcionalmente, montar `TraceStep[]`
  com os intermediários que já calcula (`raw_rate`, `shrunk`, minutos, `oppMult`, `haMult`)
  + a evidência crua das janelas (`windowedRate`: SOT total e minutos das últimas N partidas).
- O caminho de probabilidade (`sotModel.probOverLine`) e valor (`devig`, `edgeEv`) acrescentam
  seus passos.
- `buildCandidate` (em `candidates/builder.ts`) recebe e anexa `trace` quando diagnóstico ligado.
- Modelo de partida (`matchModel`) emite seus próprios passos pra gols/escanteios.
- Gerador de frases: função pura que recebe um `TraceStep` cru e devolve `frase`/`veredito_leigo`
  em PT — testável isolada.

## Mudanças no front (`odd-analyzer-frontend`)

- `lib/types.ts`: adicionar `TraceStep`, `Trace`, e `trace?: Trace` em `Candidate`.
- Componente `InvestigationTrace.tsx`: recebe um `Trace`, renderiza narrativa + lista de passos
  (cada passo expande pra `formula`+`entradas`) + botão "Copiar rastro" (copia o JSON).
- Botão **"Mostrar investigação"** integrado ao `DiagnosticsPanel` (reprovados) e ao card de
  candidato aprovado.
- Renderização 100% genérica sobre `trace.passos` — nenhum campo específico de mercado.

## Tratamento de erro / ausência

- `trace` ausente (diagnóstico desligado, ou modelo antigo) → botão "Mostrar investigação"
  não aparece. Sem quebra.
- `passos` vazio → mostra só `veredito_leigo` (ou aviso "sem rastro disponível").

## Testes

- **Backend:** fixture de jogos conhecidos → assert que (a) os `passos` saem na ordem esperada
  com os valores certos, e (b) o `mu`/`lambda` final continua idêntico ao `assembleMu` atual
  (o rastro não pode alterar o número). Gerador de frases testado isolado.
- **Front:** render de `InvestigationTrace` com um `Trace` fixo — narrativa, passos expansíveis,
  e o "Copiar rastro" colocando o JSON certo no clipboard.

## Fora de escopo (YAGNI)

- Histórico/persistência de rastros.
- Comparação automática modelo-vs-casa além do que os passos já expõem.
- Disparo automático de IA auditora — o dono copia e cola onde quiser.
