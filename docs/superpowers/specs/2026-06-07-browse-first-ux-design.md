# Browse-first UX — odd-analyzer-frontend

**Data:** 2026-06-07
**Status:** aprovado (brainstorming)

## Problema

Hoje a seleção de jogo está enterrada num `<select>`. Não dá pra ver datas/horários nem
navegar os jogos. O dono quer a experiência de uma **casa de aposta**: lista de jogos
navegável, com data/horário e detalhes, não um dropdown.

Mudança é de **UX/apresentação e navegação**. Lógica do modelo, `lib/api.ts`, tipos e tema
**não mudam**.

## Decisões (do brainstorming)

1. **Fluxo browse-first** (não manter form-first). Lista de jogos estilo casa de aposta.
2. **Detalhe assume a tela** ao selecionar um jogo (não split). Igual abrir um jogo numa casa.
3. Mesmo padrão aplicado ao **pós-jogo** para consistência.

## Fluxo — Pré-jogo (`/`)

Dois estados na mesma rota, alternados por haver ou não um jogo selecionado (`jogoSel`):

### Estado 1 — Browse

```
┌─────────┬──────────────────────────────────┐
│ ligas   │  ▸ hoje · 07 jun                  │
│ • Bras. │  16:00  Flamengo × Palmeiras   ▸  │
│   Copa  │  18:30  Grêmio × Inter         ▸  │
│   Prem. │  ▸ amanhã · 08 jun               │
│         │  11:00  Santos × Corinthians   ▸  │
└─────────┴──────────────────────────────────┘
```

- **Trilho de ligas** à esquerda. Item ativo destacado (borda verde, fundo `panel-2`).
- **Lista de jogos** ao centro, status `notstarted`, agrupada por dia com headers
  (`hoje` / `amanhã` / `qua 10 jun`).
- Cada **card de jogo**: horário (do campo `data`) · `mandante × visitante` · selo de status.
- Liga sem jogos → estado vazio "sem jogos não iniciados nessa liga".
- Nenhuma liga selecionada → estado inicial "escolha uma liga".

### Estado 2 — Detalhe (jogo selecionado)

```
‹ voltar aos jogos
┌──────────────────────────────────────────────┐
│ Flamengo × Palmeiras    hoje 16:00            │
│ [SOT] [finalizações] [desarmes] [gols ⚠]      │  ← MercadoChips
│ linha 1.5 · odd 1.90/1.90 · jogador [____]  [analisar] │
├──────────────────────────────────────────────┤
│ veredito da IA  (IaVeredito — reuso)          │
│ candidatos · N  (CandidatosTabela — reuso)    │
└──────────────────────────────────────────────┘
```

- Lista some; abre a página do confronto, full-width (trilho de ligas permanece).
- **Cabeçalho**: `mandante × visitante` + data/hora formatada.
- **MercadoChips** substituem o `<select>` de mercado. Mercado `nivel: "partida"`
  (gols/escanteios/vitoria) recebe marca **em validação** (chip âmbar).
- **Strip de parâmetros**: linha, odd over, odd under e (se mercado `jogador`) campo jogador,
  + botão analisar. Mesma semântica de hoje.
- Ao analisar: banner "em validação / não apostar" quando `result.em_validacao` (já existe),
  `IaVeredito` e `CandidatosTabela` renderizados (reuso intacto).
- `‹ voltar aos jogos` limpa `jogoSel` e o `result`, volta ao Browse.

## Fluxo — Pós-jogo (`/pos`)

Mesmo padrão:

- Trilho de ligas + lista de jogos **finalizados** (status `finished`), agrupada por dia.
- Card de jogo finalizado mostra o **placar** (`mandante PLACAR visitante`).
- Selecionar → detalhe: cabeçalho do confronto + strip (mercado jogador via chips, linha) +
  botão conferir → tabela de resultado real (reuso da renderização atual).
- `‹ voltar aos jogos`.

## Componentes

Novos, isolados, uma responsabilidade cada:

| Componente | Arquivo | Responsabilidade | Depende de |
|---|---|---|---|
| `LigaRail` | `components/LigaRail.tsx` | lista de ligas + ativo; emite `onSelect(ligaId)` | `Liga[]` (props) |
| `JogosLista` | `components/JogosLista.tsx` | agrupa `Jogo[]` por dia e renderiza headers + cards; emite `onSelect(jogo)` | `agruparPorData`, `JogoCard` |
| `JogoCard` | `components/JogoCard.tsx` | um card: horário/placar, times, status; clicável | `Jogo` (props) |
| `MercadoChips` | `components/MercadoChips.tsx` | chips dos `MERCADOS`, marca em validação; emite `onSelect(key)` | `MERCADOS` |
| `agruparPorData` | `lib/date.ts` | função pura: agrupa jogos por dia, gera label (`hoje`/`amanhã`/`qua 10 jun`), ordena | nada |

Reuso intacto: `CandidatosTabela`, `IaVeredito`, `Panel`/`Field`/`Tag`/`Readout`.

### Interfaces

```ts
// lib/date.ts
interface GrupoDia { label: string; chave: string; jogos: Jogo[] }
function agruparPorData(jogos: Jogo[]): GrupoDia[]
// ordena por data asc; jogos com data null → grupo "sem data" no fim.
// label: "hoje" / "amanhã" / "qua 10 jun" (pt-BR), comparado pela data local.

// LigaRail
{ ligas: Liga[]; ativa: string; onSelect: (id: string) => void }
// JogosLista
{ jogos: Jogo[]; onSelect: (j: Jogo) => void; variante: "pre" | "pos" }
// JogoCard
{ jogo: Jogo; variante: "pre" | "pos"; onClick: () => void }
// MercadoChips
{ mercados: Mercado[]; ativo: string; onSelect: (key: string) => void }
```

## Estado das páginas

- `lib/api.ts` **não muda** — `getLigas`, `getJogos(ligaId, status)`, `postAnalisar`,
  `getResultado` já bastam.
- `app/page.tsx` e `app/pos/page.tsx` reescritos como Client Components controlando:
  `ligaId`, `jogos`, `jogoSel` (Jogo | null), e (pré) os params + `result`; (pós) `result`.
- `jogoSel === null` → Browse; senão → Detalhe.

## Estados de borda

- Erro de API: banner de erro existente (vermelho), reusado.
- Carregando jogos (após escolher liga): skeleton/linha "carregando jogos…".
- Carregando análise: estado `Carregando` atual reusado.
- Lista vazia de candidatos: estado existente em `CandidatosTabela`.
- Jogo com `data: null`: card sem horário, agrupado em "sem data".

## Testes

- `agruparPorData`: unit tests da função pura — ordenação, labels hoje/amanhã/data,
  jogos com `data null`, lista vazia. (Único bloco com lógica não-trivial.)
- Demais componentes: verificação visual no app rodando (ponta-a-ponta), conforme convenção
  do projeto ("foco em funcionar ponta-a-ponta").

## Fora de escopo (YAGNI)

- Logos/escudos de times (backend não fornece).
- Odds na lista de jogos (backend não fornece; valor só após analisar).
- Busca/filtro de jogos dentro da liga.
- Mudanças em `lib/api.ts`, `lib/types.ts`, tema ou lógica do modelo.
