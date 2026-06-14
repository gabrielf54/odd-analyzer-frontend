# Redesign do fluxo odds/análise — design

**Data:** 2026-06-14
**Repo:** odd-analyzer-frontend (Next.js 16 / App Router / React 19 / Tailwind v4)
**Branch:** `feat/redesign-odds-analise`
**Backend:** odd-analyzer (sem mudança de endpoint — ver §6)

## Objetivo

Melhorar a UX do fluxo que o usuário mais usa: pesquisar jogos (mesma liga e ligas
diferentes) e analisá-los para achar apostas de valor. Quatro mudanças:

1. Mostrar de qual **casa (book)** veio cada odda/aposta, com um ícone.
2. Layout em **3 colunas**: ligas + jogos + conteúdo, lado a lado.
3. Dividir a tela do jogo em **Etapa 1 (odds)** e **Etapa 2 (análise)** — hoje tudo
   junto numa coluna só.
4. **Tela investigativa de odds** na Etapa 1: ver todas as odds carregadas (são
   muitas, ~300+/jogo) sem estourar, com **edição manual**.

## Decisões (validadas no brainstorming visual)

| Tema | Decisão |
|---|---|
| Layout colunas | **3 colunas fixas** sempre visíveis: `[ligas ~90px][jogos ~150px][conteúdo flex]` |
| Divisão do jogo | **Abas livres** (não stepper): "Etapa 1 · Odds" / "Etapa 2 · Análise" |
| Tela de odds | **Tabela única densa + filtros** (chips de mercado/casa + busca por entidade) |
| Edição | **Editar valor + adicionar linha + remover linha** |
| Semântica do edit | **Sobrescreve a casa** (upsert na mesma PK) — sem linha "manual" duplicada |
| Ícone da casa | **Badge colorido com sigla** (🟢 KTO / 🔵 BET / ⚪ manual) — sem assets de logo |
| Abordagem | **Extrair** o god-component `app/page.tsx` em componentes focados |

## Estado atual (ponto de partida)

- `app/page.tsx` (~430 linhas + WIP) concentra: layout de colunas, `Browse` (lista de
  jogos em largura cheia), `Detail` (tela do jogo com TUDO inline — coleta auto, colar
  manual, lote, recomendação, candidatos, recusadas, diagnóstico, drawer).
- `LeagueRail.tsx` = sidebar de ligas (existe, fica). `MatchList.tsx`/`MatchCard.tsx` =
  lista de jogos (hoje na área principal). `GameTabs.tsx` = abas multi-jogo.
- Componentes de resultado já isolados: `RecommendationCard`, `CandidatesByPlayer`,
  `DiagnosticsPanel`, `SemMatchPanel`, `PlayerDetailDrawer`, `InvestigationTrace`.
- `lib/api.ts` = único ponto de fetch. `lib/types.ts` = tipos espelhando o JSON.
- **Odds JÁ persistem no banco** (tabela `odds`, lida via `GET /jogos/:id/odds` →
  `OddsRow[]`). **`book` JÁ chega** em cada candidato da análise (`book` +
  `casas_comparadas`) — hoje não é renderizado.
- WIP já commitado no branch: helper `coletarOdds` + bloco AutoCollect + EV em %.

## Arquitetura proposta

`app/page.tsx` vira **só o shell de layout das 3 colunas + abas**. A lógica do jogo sai
para componentes focados (cada um: o que faz, como usar, do que depende).

```
app/page.tsx
 ├── <LeagueRail>            col 1 — ligas (existente)
 ├── <MatchRail>             col 2 — jogos da liga selecionada (NOVO; extrai MatchList)
 └── col 3 — conteúdo
      ├── <GameTabs>          abas multi-jogo (existente; mantidas)
      └── <GameDetail>        NOVO — estado do jogo + 2 abas
           ├── OddsTab        NOVO — Etapa 1
           │    ├── AutoCollect    (move do page.tsx; usa coletarOdds)
           │    ├── PromptCopier   (move do page.tsx; colar manual)
           │    └── <OddsTable>    NOVO — tela investigativa + edição
           └── AnalysisTab    NOVO — Etapa 2 (componentes de resultado existentes)
```

### Componentes (contratos)

**`MatchRail.tsx`** — coluna 2.
- **O que faz:** lista vertical e estreita dos jogos da liga selecionada; destaca o jogo
  ativo; clicar abre o jogo (mesma navegação por URL `?league&match` que já existe).
- **Props:** `matches: Match[]`, `activeMatchId`, `onSelect(match)`, `loading`.
- **Depende de:** nada novo (reusa estados já buscados em `page.tsx`). Extrai a lista do
  `MatchList`/`MatchCard` num formato de coluna estreita.

**`GameDetail.tsx`** — dono do estado do jogo (migra o que hoje vive em `Detail`).
- **O que faz:** renderiza header do jogo + as duas abas; guarda o lote, o resultado da
  análise, loading/erros, drawer aberto. Aba ativa em estado local (`"odds" | "analise"`).
- **Props:** `match`, `onBack`, callbacks de cache de aba (como hoje).
- **Aba Análise** mostra empty-state ("rode a análise na Etapa 1") quando não há resultado.

**`OddsTable.tsx`** — tela investigativa (Etapa 1).
- **O que faz:** carrega `GET /jogos/:id/odds`, mostra tabela densa
  (`entidade · mercado · linha · over · under · <BookBadge> · ✎ · 🗑`), com chips de
  filtro (mercado + casa) e busca por entidade. Permite **editar** over/under inline,
  **adicionar** nova linha e **remover** linha. Cada mutação re-fetcha.
- **Props:** `eventId`, `onChange?()` (avisa o pai que o lote mudou).
- **Anti-estouro:** container com `max-height` + `overflow-y-auto`; filtros reduzem o
  conjunto; linhas densas (mesma tipografia mono já usada).

**`BookBadge.tsx`** — ícone da casa.
- **O que faz:** dado um `book: string`, renderiza pílula colorida com sigla. Mapa
  central `book → {sigla, cor}` (kto=verde, betnacional=azul, manual/fallback=cinza;
  desconhecido = cinza com as 3 primeiras letras).
- **Props:** `book?: string | null`, `size?: "sm" | "md"`.
- **Reuso:** `OddsTable`, `RecommendationCard` (de qual casa veio a aposta),
  `CandidatesByPlayer`, `PlayerDetailDrawer`.

### Camada de dados (`lib/api.ts`)

Reusa endpoints existentes — **sem endpoint novo**:
- `saveOdd(eventId, line: OddsLineInput)` → `POST /odds` com `{event_id, coletado_em, odds:[line]}`.
  Serve para **editar** (mesma PK = `entidade,market_type,linha,book` → upsert sobrescreve)
  e **adicionar** (PK nova). `coletado_em` = `new Date().toISOString()` no cliente.
- `removeOdd(eventId, filter: {entidade, market_type, linha, book})` →
  `DELETE /jogos/:id/odds?entidade=…&market_type=…&linha=…&book=…`.
- `getOdds` e `coletarOdds` já existem.

### Tipos (`lib/types.ts`)

- `Candidate` ganha `book?: string | null` e `casas_comparadas?: { book: string; odd_over: number }[]`
  (o backend já manda; só faltava no tipo do front).
- `OddsRow` já existe e basta para a tabela.

### Fluxo de dados

```
abrir jogo → GET /jogos/:id/odds → OddsTable (tabela + filtros)
   editar/add  → saveOdd  → POST /odds (upsert) → re-fetch
   remover     → removeOdd → DELETE /odds (filtro) → re-fetch
analisar (Etapa 1) → POST /analise/manual → resultado
   → Etapa 2: RecommendationCard/CandidatesByPlayer com <BookBadge> do candidato.book
```

## §6 Backend

**Nenhuma mudança de endpoint.** Verificações/ajustes:
- Confirmar que `InMemoryRepo.saveOdds` também faz **upsert** (não append) — para testes
  e paridade com o `SupabaseRepo` (que já faz, `repo.ts:201`).
- `SupabaseRepo.saveOdds` = upsert por `event_id,entidade,market_type,linha,book`
  (confirmado). DELETE com filtro (confirmado, `repo.ts:225`).
- Motor (`model/`, `value/`) **intocado** → gate de paridade do backend permanece verde.

## Tratamento de erros

- OddsTable: erro de fetch/mutação → `ErrorBox` inline; otimismo opcional, mas o padrão é
  re-fetch após sucesso (consistência > velocidade).
- Edição com odd inválida (≤ 1.01) → validação no cliente antes do POST + mensagem; o
  backend já rejeita e devolve `linhas_rejeitadas`.
- Remover: confirma inline (não modal pesado) antes do DELETE.

## Testes (Vitest, no front)

- `BookBadge`: mapa book→sigla/cor; fallback de casa desconhecida.
- `OddsTable`: filtro (mercado/casa/busca), agrupamento/contagem, edição muda o valor
  exibido, add/remove chamam os helpers certos.
- `lib/api`: `saveOdd`/`removeOdd` montam URL/body corretos (mock de `req`).
- Sem tocar o motor → suíte de paridade do backend não é afetada.

## Fora de escopo (YAGNI)

- Logos reais das casas (badge colorido resolve).
- Override "manual" preservando a odd original da casa (decidido: sobrescreve).
- Histórico de odds por data / gráfico de movimento de linha.
- Editar odds em lote / import-export.
- Mudanças no motor de análise ou em mercados.

## Riscos / pontos de atenção

- `app/page.tsx` é grande e tem WIP recém-commitado; a extração deve preservar o
  comportamento do AutoCollect e a navegação por URL/abas.
- Coluna 3 perde ~240px de largura (cols 1+2). A OddsTable densa e a aba de análise
  precisam caber — daí tabela densa + filtros, não cards largos.
- Não quebrar o cache por aba do `GameTabs` ao extrair `GameDetail`.
