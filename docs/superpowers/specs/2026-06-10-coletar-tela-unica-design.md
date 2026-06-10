# Coletar como tela única — design

**Data:** 2026-06-10
**Repo:** odd-analyzer-frontend (Next.js). Backend (odd-analyzer) **não muda**.

## Objetivo

Descontinuar as telas **pré-jogo** (`/`) e **pós-jogo** (`/pos`). Promover **Coletar Odds** (`/coletar`) a tela principal e única, servida na raiz `/`. Remover de vez o código que passa a ser exclusivo das telas descontinuadas (decisão do dono: "apagar de vez", repo limpo — o histórico do git guarda o que foi removido).

## Decisões do dono

- **Apagar de vez** o código das telas antigas (não deixar dormente).
- **Header sem Nav**: com tela única não há para onde navegar. Mantém o header com a brand `odd/analyzer` + badge "copa 2026 live" e o footer.
- **Título mantido**: o h1 continua "coletar odds".
- **Aparar variant `pos`** de `MatchList`/`MatchCard` (placar) — código morto após remover o pós-jogo.

## Mudanças

### Rotas
- Mover `app/coletar/page.tsx` → `app/page.tsx`. Coletar passa a responder em `/`.
- Deletar `app/coletar/` (pasta) e `app/pos/` (pasta).
- `lib/urlState` é agnóstico de rota (lê query `league`/`match`) — não muda.

### Layout / header
- `app/layout.tsx`: remover import e uso de `<Nav/>`. Manter brand, badge live e footer intactos.

### Arquivos deletados

**Componentes** (exclusivos pré/pós):
- `components/Nav.tsx`
- `components/MatchFilter.tsx`
- `components/Lineup.tsx`
- `components/MarketChips.tsx`
- `components/CandidatesTable.tsx`
- `components/AiVerdict.tsx`

**Libs** (exclusivas pré/pós):
- `lib/persist.ts` + `lib/persist.test.ts`
- `lib/matchFilter.ts` + `lib/matchFilter.test.ts`
- `lib/useLocalStorage.ts` (só pré/pós usavam; coletar usa `coletarStorage`)

### Arquivos aparados (remover exports órfãos)
- `lib/api.ts`: remover `getLineup`, `postAnalyze`, `getResult`.
- `lib/types.ts`: remover os tipos/consts que ficam sem uso — `MARKETS`, `Market`, `AnalysisResult`, `RealResult`, tipo `Lineup` (e quaisquer auxiliares só deles). Lista exata confirmada na implementação via typecheck/detecção de não-usados. **Não** remover os tipos que coletar usa: `League`, `Match`, `ManualOddsLine`, `ManualAnalysisResult`, `Candidate`.
- `components/MatchList.tsx` + `components/MatchCard.tsx`: remover o branch/variant `"pos"` (placar). Coletar usa só `variant="pre"`.

### Mantidos (coletar depende)
LeagueRail, MatchList→MatchCard (só variant pre), DiagnosticsPanel→InvestigationTrace (+test), SemMatchPanel, RecommendationCard, CandidatesByPlayer, PlayerDetailDrawer, ui. Libs: coletarStorage (+test), manualOdds (+test), candidateFilters (+test), clipboard, date (+test), detailText (+test), format (+test), urlState (+test).

## Backend (fora de escopo, não tocar)
Os endpoints `/analyze`, `/lineup`, `/result` do backend ficam **dormentes** — sem remoção neste trabalho. Removê-los é decisão futura separada.

## Verificação
No repo frontend, todos verdes:
- `npm run build` (Next compila, nenhuma importação quebrada)
- `npm test` (Vitest — suíte dos arquivos mantidos)
- typecheck (sem export órfão referenciado)

## Fora de escopo
- Qualquer mudança no backend.
- Redesign visual da tela coletar (mantida como está).
- Remoção de endpoints dormentes do backend.
