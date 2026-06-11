# Wiring de odds persistidas na tela Coletar — design

**Data:** 2026-06-11
**Repo:** odd-analyzer-frontend (Next). Backend já entregou a persistência (tabela `odds` = fonte de verdade; endpoints `POST /odds`, `GET/DELETE /jogos/:id/odds`; `/analise/manual` lê do repo).

## Objetivo

Fechar o ciclo da persistência de odds no front. Hoje a tela Coletar (`app/page.tsx`, componente `Detail`) hidrata o lote **só do `localStorage`** e persiste só lá. O backend já guarda as odds na tabela, mas a tela não lê de lá — então trocar de máquina/navegador ou limpar o cache faz as odds "sumirem" da tela, apesar de estarem no banco.

Wire a tela ao banco: **abrir o jogo carrega as odds da tabela** (o fix central da dor original), **colar persiste no banco**, **limpar apaga no banco**. O `localStorage` vira espelho offline (resiliência quando o GET falha), não a fonte.

## Decisões

- **Aditivo e de baixo risco.** Não reescrever o fluxo: adicionar GET-ao-abrir, POST-ao-adicionar, DELETE-ao-limpar. O `analyze()` **continua mandando o lote** no corpo (o backend faz upsert idempotente e relê do repo) — garante que o que está na tela é o que foi analisado, mesmo se um POST anterior falhou.
- **Banco é a fonte na carga; `localStorage` é fallback.** No mount: `GET /jogos/:id/odds`. Se vier, hidrata o lote do banco e espelha no `localStorage`. Se o GET falhar (backend fora/offline), cai para `loadBatch` (localStorage).
- **Persistir ao adicionar** (`POST /odds`), não só ao analisar — assim colar e sair sem analisar já guarda. Em erro de POST, o lote local é mantido e o erro é mostrado (nada se perde).
- **Resultado da análise** segue só em `localStorage` (é derivado — re-analisa). Fora de escopo.
- **`escopo_historico`**: não há UI hoje; segue default `todos` no backend. Fora de escopo.

## Mudanças

### `lib/types.ts`
Adicionar o tipo que espelha a linha da tabela (retorno do GET):

```ts
// Linha de odd persistida (espelha a tabela `odds` do backend).
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
```

### `lib/api.ts`
Três funções novas no único ponto de fetch:

```ts
export const getOdds = (eventId: string | number) =>
  req<OddsRow[]>(`/jogos/${eventId}/odds`);

export const saveOdds = (body: ManualAnalyzeBody) =>
  req<{ salvas: number; linhas_rejeitadas: LinhaRejeitada[] }>("/odds", { method: "POST", body: JSON.stringify(body) });

export const deleteOdds = (eventId: string | number) =>
  req<{ ok: true }>(`/jogos/${eventId}/odds`, { method: "DELETE" });
```

### `lib/oddsRows.ts` (novo) — mapper puro testável
Converte o retorno do banco no formato do lote da tela:

```ts
import type { OddsRow, ManualOddsLine } from "./types";

/** OddsRow[] (tabela) → ManualOddsLine[] (lote da tela). Descarta event_id/coletado_em. */
export function oddsRowsToBatch(rows: OddsRow[]): ManualOddsLine[] {
  return rows.map((r) => ({
    market_type: r.market_type,
    entidade: r.entidade,
    linha: r.linha,
    odd_over: r.odd_over,
    odd_under: r.odd_under,
    book: r.book,
  }));
}
```

### `app/page.tsx` — componente `Detail`
- **Mount:** trocar a hidratação por DB-primeiro. `getOdds(eventId)` → se `rows.length`, `setBatch(oddsRowsToBatch(rows))` e espelha no `localStorage` (`saveBatch`); senão e em erro, `setBatch(loadBatch(eventId))`. Mantém `loadResult` do localStorage. `setHydrated(true)` no fim.
- **`addBatch()`:** vira `async`. Após `parsePastedOdds`, persiste com `saveOdds({ event_id, coletado_em: now, odds: lines })`; em sucesso, `setBatch((b)=>[...b, ...lines])`; em erro, `setPasteError(msg)` e não some com o texto. (O `useEffect` de `saveBatch` segue espelhando no localStorage.)
- **`clearBatch()`:** chamar `deleteOdds(eventId)` (best-effort; erro não trava a limpeza local) além de `clearStored` + reset de estado.
- **`analyze()`:** inalterado (continua enviando `odds: batch`).

## Verificação
No repo front, todos verdes:
- `npm test` (Vitest — inclui o novo `lib/oddsRows.test.ts`).
- `npm run build` (Next compila; nenhuma importação quebrada).
- typecheck via build (`tsc` do Next) — sem tipo órfão.

## Fora de escopo
- Mudança no backend (já entregue).
- UI de `escopo_historico`; botão de remover 1 linha (só limpar lote inteiro por ora).
- Testes de componente React (não há testing-library no projeto) — cobertura via mapper puro + build/typecheck.
- Merge da tela única (este wiring assenta sobre o branch `feat/coletar-tela-unica`).
