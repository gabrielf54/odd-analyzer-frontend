# Spec — Persistência de estado de seleção (URL + localStorage)

**Data:** 2026-06-09
**Repo:** odd-analyzer-frontend (Next.js App Router)
**Status:** aprovado, pronto pra plano de implementação

## Problema

Nas telas pré-jogo (`app/page.tsx`) e pós-jogo (`app/pos/page.tsx`), toda a
seleção do usuário vive só em `useState`. Consequência:

- **F5** remonta os componentes → todo `useState` volta ao default →
  liga e jogo selecionados somem.
- Selecionar itens dentro do jogo (mercado, linha, odds, jogador) também
  se perde no reload, porque nada é persistido.

Não há URL refletindo a navegação nem nenhum storage.

## Decisão (rota B)

- **Navegação (liga + jogo)** → query params na **URL**. Sobrevive a F5 e ao
  botão voltar do browser; link fica navegável.
- **Form (mercado, linha, odds)** → **localStorage**. Mantém a URL limpa.
- **Resultado da análise** → permanece efêmero em `useState`; some no F5
  (aceito). Um botão **Limpar** novo zera o resultado manualmente.

## Unidades novas (lib, reusadas nas duas telas)

### `lib/useUrlState.ts` — navegação na URL
- Lê `league` e `match` de `useSearchParams()`.
- Expõe setters que fazem `router.replace(...)` (NÃO `push` — não empilhar
  histórico a cada clique de liga/jogo).
- Regras:
  - setar `league` para um valor novo **limpa** `match` (trocar de liga não
    pode manter jogo de outra liga).
  - setar `match` grava o id do jogo selecionado.
  - voltar aos jogos (`goBack`) limpa `match`, mantém `league`.
- Contrato sugerido:
  ```ts
  function useUrlState(): {
    leagueId: string;            // "" quando ausente
    matchId: string;             // "" quando ausente
    setLeague(id: string): void; // limpa match junto
    setMatch(id: string): void;
    clearMatch(): void;
  }
  ```
- Valores sempre string (param de URL). Comparar com `String(match.id)` ao
  derivar (o tipo `Match.id` é `string | number`).

### `lib/useLocalStorage.ts` — hook genérico
- Assinatura: `useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void]`.
- **SSR-safe:** estado inicial = `initial`; lê do localStorage dentro de
  `useEffect` no mount (evita mismatch de hidratação entre server e client).
- Escreve no localStorage sempre que o valor muda.
- Serialização JSON.

## Mudanças por tela

### `app/page.tsx` (pré-jogo)

1. `leagueId` deixa de ser `useState` → vem de `useUrlState().leagueId`.
   `LeagueRail onSelect` → `setLeague`.
2. `selectedMatch` deixa de ser estado → **derivado**:
   `matches.find((m) => String(m.id) === matchId) ?? null`.
   - `MatchList onSelect={(m) => setMatch(String(m.id))}`.
   - `goBack` → `clearMatch()` (mantém `result` clear como hoje).
3. O `useEffect([leagueId])` que busca matches permanece. Ele já reseta
   `result`/`error` ao trocar de liga — ok; no mount com `leagueId` da URL
   roda uma vez e é inócuo (result já null).
4. Form via `useLocalStorage`:
   - `marketKey` (key `oa:pre:market`, default `"sot"`)
   - `line` (`oa:pre:line`, default `"1.5"`)
   - `oddOver` (`oa:pre:oddOver`, default `"1.90"`)
   - `oddUnder` (`oa:pre:oddUnder`, default `"1.90"`)
5. `playerRef`: localStorage **marcado por matchId**. Guardar
   `{ matchId, player }` (key `oa:pre:player`). No load, restaura `player`
   só se `matchId` bate o jogo atual; senão começa vazio. Trocar de jogo
   zera o jogador.
6. Botão **Limpar** (`✕ limpar análise`) junto do bloco de resultado →
   `setResult(null)`. Aparece só quando há `result`.

### `app/pos/page.tsx` (pós-jogo)

Mesmo tratamento, escopo menor (sem odds nem jogador):
1. `leagueId` → URL; `selectedMatch` → derivado por `matchId`.
2. Form via `useLocalStorage`: `marketKey` (`oa:pos:market`, default `"sot"`),
   `line` (`oa:pos:line`, default `"1.5"`).
3. `result` (`RealResult`) efêmero; botão **Limpar** zera.

## Next.js — Suspense

`useSearchParams()` exige um `<Suspense>` em volta (bailout de CSR / build).
Refatorar cada página:
```tsx
export default function Page() {
  return <Suspense fallback={<Loading/>}><Inner/></Suspense>;
}
```
O componente atual vira `Inner`. `fallback` simples (mesmo estilo dos
"carregando_" já usados).

## Fora de escopo (YAGNI)

- Persistir o `result` da análise / re-rodar automático no load (custo de
  chamada IA/backend; usuário optou por Limpar manual).
- Compartilhar form via URL.
- Sincronização entre abas.

## Critérios de aceite

- F5 com liga+jogo selecionados → volta exatamente na tela do jogo, com o
  jogo certo carregado, sem flash de tela vazia (além do loading normal).
- F5 mantém mercado/linha/odds do form (pré) e mercado/linha (pós).
- F5 no mesmo jogo restaura o jogador escolhido; trocar de jogo zera.
- Botão voltar do browser navega liga ↔ jogo coerente.
- Botão Limpar zera só o resultado, mantendo seleção e form.
- `npm run build` e `npm test` verdes (sem warning de Suspense/useSearchParams).
