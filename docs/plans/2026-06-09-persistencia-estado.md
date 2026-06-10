# Persistência de Estado (URL + localStorage) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liga+jogo selecionados sobrevivem ao F5 via URL; mercado/linha/odds/jogador sobrevivem via localStorage; resultado da análise fica efêmero com botão Limpar.

**Architecture:** Lógica testável (mutação de query params, restauração de jogador por matchId) vive em funções **puras** em `lib/` com testes Vitest (node env). Os hooks React (`useUrlState`, `useLocalStorage`) são wrappers finos sobre essas funções + APIs do Next/browser — verificados por `npm run build` + checklist manual, seguindo o padrão do repo (que só testa funções puras). As páginas passam a derivar `selectedMatch` do param de URL em vez de guardar o objeto em estado.

**Tech Stack:** Next.js 16 App Router, React 19, `next/navigation` (`useSearchParams`/`useRouter`/`usePathname`), Vitest 4 (node).

---

## File Structure

- **Create** `lib/urlState.ts` — helpers puros de mutação de query string (`withLeague`/`withMatch`/`withoutMatch`) + hook `useUrlState`.
- **Create** `lib/urlState.test.ts` — testes dos helpers puros.
- **Create** `lib/persist.ts` — tipo `StoredPlayer` + função pura `restorePlayer`.
- **Create** `lib/persist.test.ts` — testes de `restorePlayer`.
- **Create** `lib/useLocalStorage.ts` — hook genérico SSR-safe.
- **Modify** `app/page.tsx` — usa hooks, deriva match, Suspense, botão Limpar.
- **Modify** `app/pos/page.tsx` — idem, escopo menor.

---

## Task 1: Helpers puros de URL (`lib/urlState.ts` parte pura)

**Files:**
- Create: `lib/urlState.ts`
- Test: `lib/urlState.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/urlState.test.ts
import { describe, it, expect } from "vitest";
import { withLeague, withMatch, withoutMatch } from "@/lib/urlState";

describe("urlState helpers", () => {
  it("withLeague seta league e limpa match", () => {
    const p = new URLSearchParams("league=1&match=99");
    expect(withLeague(p, "2")).toBe("league=2");
  });

  it("withLeague com id vazio remove league e match", () => {
    const p = new URLSearchParams("league=1&match=99");
    expect(withLeague(p, "")).toBe("");
  });

  it("withMatch seta match preservando league", () => {
    const p = new URLSearchParams("league=1");
    expect(withMatch(p, "42")).toBe("league=1&match=42");
  });

  it("withMatch com id vazio remove match", () => {
    const p = new URLSearchParams("league=1&match=42");
    expect(withMatch(p, "")).toBe("league=1");
  });

  it("withoutMatch remove match mantendo league", () => {
    const p = new URLSearchParams("league=1&match=42");
    expect(withoutMatch(p)).toBe("league=1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/urlState.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/urlState"` / helpers não definidos.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/urlState.ts
"use client";

// ───── helpers puros (testáveis em node) ─────
export function withLeague(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  if (id) next.set("league", id);
  else next.delete("league");
  next.delete("match"); // trocar de liga não pode manter jogo de outra liga
  return next.toString();
}

export function withMatch(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  if (id) next.set("match", id);
  else next.delete("match");
  return next.toString();
}

export function withoutMatch(params: URLSearchParams): string {
  return withMatch(params, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/urlState.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/urlState.ts lib/urlState.test.ts
git commit -m "feat: helpers puros de mutacao de query params (liga/jogo)"
```

---

## Task 2: Hook `useUrlState` (wrapper Next)

**Files:**
- Modify: `lib/urlState.ts` (acrescenta o hook abaixo dos helpers)

Sem teste unitário (hook depende de `next/navigation`; repo não tem infra de teste de React). Verificado por typecheck/build na Task 6.

- [ ] **Step 1: Append the hook to `lib/urlState.ts`**

```ts
// ───── hook (wrapper fino sobre os helpers + Next router) ─────
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export interface UrlState {
  leagueId: string;
  matchId: string;
  setLeague: (id: string) => void;
  setMatch: (id: string) => void;
  clearMatch: () => void;
}

export function useUrlState(): UrlState {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = new URLSearchParams(search.toString());

  const go = (qs: string) =>
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

  return {
    leagueId: search.get("league") ?? "",
    matchId: search.get("match") ?? "",
    setLeague: (id) => go(withLeague(current, id)),
    setMatch: (id) => go(withMatch(current, id)),
    clearMatch: () => go(withoutMatch(current)),
  };
}
```

Nota: o `import` fica no topo do arquivo junto do `"use client"` — mova-o pra lá ao editar (não deixe import no meio do arquivo).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/urlState.ts
git commit -m "feat: hook useUrlState (liga/jogo via URL, router.replace)"
```

---

## Task 3: Restauração de jogador por matchId (`lib/persist.ts`)

**Files:**
- Create: `lib/persist.ts`
- Test: `lib/persist.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/persist.test.ts
import { describe, it, expect } from "vitest";
import { restorePlayer, type StoredPlayer } from "@/lib/persist";

describe("restorePlayer", () => {
  it("restaura jogador quando matchId bate", () => {
    const s: StoredPlayer = { matchId: "42", player: "Kaiki" };
    expect(restorePlayer(s, "42")).toBe("Kaiki");
  });

  it("zera quando matchId é de outro jogo", () => {
    const s: StoredPlayer = { matchId: "42", player: "Kaiki" };
    expect(restorePlayer(s, "99")).toBe("");
  });

  it("zera quando não há nada guardado", () => {
    expect(restorePlayer(null, "42")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/persist.test.ts`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/persist.ts
export interface StoredPlayer {
  matchId: string;
  player: string;
}

// Restaura o jogador só se foi escolhido NESTE jogo; senão volta vazio.
export function restorePlayer(stored: StoredPlayer | null, matchId: string): string {
  return stored && stored.matchId === matchId ? stored.player : "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/persist.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/persist.ts lib/persist.test.ts
git commit -m "feat: restorePlayer (jogador persistido marcado por matchId)"
```

---

## Task 4: Hook genérico `useLocalStorage`

**Files:**
- Create: `lib/useLocalStorage.ts`

Sem teste unitário (depende de `localStorage`/efeito React; repo só testa funções puras). Verificado por build + checklist manual.

- [ ] **Step 1: Write the hook**

```ts
// lib/useLocalStorage.ts
"use client";

import { useEffect, useState } from "react";

// SSR-safe: inicia com `initial`, hidrata do localStorage no mount (evita
// mismatch de hidratação). Escreve a cada set.
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // localStorage indisponível ou JSON corrompido — mantém `initial`
    }
  }, [key]);

  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // ignora falha de escrita (quota / modo privado)
    }
  };

  return [value, set];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/useLocalStorage.ts
git commit -m "feat: hook useLocalStorage SSR-safe"
```

---

## Task 5: Refatorar `app/page.tsx` (pré-jogo)

**Files:**
- Modify: `app/page.tsx`

Objetivo: liga+jogo via `useUrlState`, `selectedMatch` derivado, form via `useLocalStorage`, jogador por matchId, Suspense, botão Limpar.

- [ ] **Step 1: Trocar imports e estado de navegação no topo do componente**

No topo do arquivo, acrescente aos imports existentes:

```ts
import { Suspense } from "react";
import { useUrlState } from "@/lib/urlState";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { restorePlayer, type StoredPlayer } from "@/lib/persist";
```

Renomeie o componente atual `export default function PreGame()` para `function PreGameInner()` (remova o `export default`). Dentro dele, substitua as linhas de estado:

```ts
// REMOVER:
//   const [leagueId, setLeagueId] = useState("");
//   const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
//   const [marketKey, setMarketKey] = useState("sot");
//   const [line, setLine] = useState("1.5");
//   const [oddOver, setOddOver] = useState("1.90");
//   const [oddUnder, setOddUnder] = useState("1.90");
//   const [playerRef, setPlayerRef] = useState("");

// POR:
const { leagueId, matchId, setLeague, setMatch, clearMatch } = useUrlState();
const [marketKey, setMarketKey] = useLocalStorage("oa:pre:market", "sot");
const [line, setLine] = useLocalStorage("oa:pre:line", "1.5");
const [oddOver, setOddOver] = useLocalStorage("oa:pre:oddOver", "1.90");
const [oddUnder, setOddUnder] = useLocalStorage("oa:pre:oddUnder", "1.90");
const [storedPlayer, setStoredPlayer] = useLocalStorage<StoredPlayer | null>("oa:pre:player", null);
const selectedMatch = matches.find((m) => String(m.id) === matchId) ?? null;
const playerRef = restorePlayer(storedPlayer, matchId);
const setPlayerRef = (p: string) => setStoredPlayer({ matchId, player: p });
```

Mantenha os demais `useState` (`leagues`, `loadingLeagues`, `matches`, `loadingMatches`, `result`, `loading`, `error`).

- [ ] **Step 2: Ajustar o effect de matches e o goBack**

No `useEffect([leagueId])`, remova `setSelectedMatch(null);` (não existe mais). Fica:

```ts
useEffect(() => {
  if (!leagueId) return;
  setMatches([]); setResult(null); setError(""); setLoadingMatches(true);
  getMatches(leagueId, "notstarted")
    .then(setMatches)
    .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
    .finally(() => setLoadingMatches(false));
}, [leagueId]);
```

Substitua `goBack`:

```ts
function goBack() {
  clearMatch(); setResult(null); setError("");
}
```

- [ ] **Step 3: Ligar URL nos handlers do JSX**

No `LeagueRail`, troque `onSelect={setLeagueId}` por `onSelect={setLeague}`.
No componente `Browse`, a prop `onSelect` é chamada com um `Match`; troque a passagem `onSelect={setSelectedMatch}` por `onSelect={(m) => setMatch(String(m.id))}`.

- [ ] **Step 4: Adicionar botão Limpar no bloco de resultado**

Dentro de `Detail`, no bloco `{result && (`, logo após a abertura `<div className="flex flex-col gap-4">`, adicione um cabeçalho com o botão. O `Detail` já recebe `onBack`; adicione uma nova prop `onClear: () => void` na assinatura e no tipo, passada de `PreGameInner` como `onClear={() => setResult(null)}`. No JSX:

```tsx
<div className="flex items-center justify-between">
  <span className="overline">resultado</span>
  <button onClick={onClear} className="overline transition-colors hover:text-fg">
    ✕ limpar análise
  </button>
</div>
```

Na chamada `<Detail ... onBack={goBack} />` acrescente `onClear={() => setResult(null)}`. Na assinatura de `Detail` e no objeto de tipos, acrescente `onClear: () => void;`.

- [ ] **Step 5: Envolver a página em Suspense (default export novo)**

No fim do arquivo, adicione:

```tsx
export default function PreGame() {
  return (
    <Suspense fallback={<p className="mono text-sm text-value">carregando<span className="blink">_</span></p>}>
      <PreGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros; sem warning de `useSearchParams() should be wrapped in a suspense boundary`.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat: pre-jogo persiste liga/jogo na URL + form no localStorage + Limpar"
```

---

## Task 6: Refatorar `app/pos/page.tsx` (pós-jogo)

**Files:**
- Modify: `app/pos/page.tsx`

Mesmo padrão, sem odds/jogador.

- [ ] **Step 1: Imports + estado de navegação**

Acrescente aos imports:

```ts
import { Suspense } from "react";
import { useUrlState } from "@/lib/urlState";
import { useLocalStorage } from "@/lib/useLocalStorage";
```

Renomeie `export default function PostGame()` para `function PostGameInner()`. Substitua o estado:

```ts
// REMOVER:
//   const [leagueId, setLeagueId] = useState("");
//   const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
//   const [marketKey, setMarketKey] = useState("sot");
//   const [line, setLine] = useState("1.5");

// POR:
const { leagueId, matchId, setLeague, setMatch, clearMatch } = useUrlState();
const [marketKey, setMarketKey] = useLocalStorage("oa:pos:market", "sot");
const [line, setLine] = useLocalStorage("oa:pos:line", "1.5");
const selectedMatch = matches.find((m) => String(m.id) === matchId) ?? null;
```

Mantenha `leagues`, `loadingLeagues`, `matches`, `loadingMatches`, `result`, `loading`, `error`.

- [ ] **Step 2: Effect de matches + goBack**

No `useEffect([leagueId])`, remova `setSelectedMatch(null);`. Fica:

```ts
useEffect(() => {
  if (!leagueId) return;
  setMatches([]); setResult(null); setError(""); setLoadingMatches(true);
  getMatches(leagueId, "finished")
    .then(setMatches)
    .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
    .finally(() => setLoadingMatches(false));
}, [leagueId]);
```

Substitua `goBack`:

```ts
function goBack() {
  clearMatch(); setResult(null); setError("");
}
```

- [ ] **Step 3: Ligar URL nos handlers do JSX**

Troque `onSelect={setLeagueId}` por `onSelect={setLeague}` no `LeagueRail`.
Troque `onSelect={setSelectedMatch}` por `onSelect={(m) => setMatch(String(m.id))}` no `MatchList`.

- [ ] **Step 4: Botão Limpar no bloco de resultado**

No bloco `{result && (` do `Panel` de resultado, antes do `<Panel ...>`, adicione um botão Limpar inline. Como o JSX é todo inline (não há subcomponente `Detail`), adicione logo acima do `<Panel title={...}` :

```tsx
<div className="flex justify-end">
  <button onClick={() => setResult(null)} className="overline transition-colors hover:text-fg">
    ✕ limpar
  </button>
</div>
```

- [ ] **Step 5: Suspense (default export novo)**

No fim do arquivo:

```tsx
export default function PostGame() {
  return (
    <Suspense fallback={<p className="mono text-sm text-cyan">carregando<span className="blink">_</span></p>}>
      <PostGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros nem warning de Suspense.

- [ ] **Step 7: Commit**

```bash
git add app/pos/page.tsx
git commit -m "feat: pos-jogo persiste liga/jogo na URL + mercado/linha no localStorage + Limpar"
```

---

## Task 7: Verificação final (suíte + build + manual)

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar toda a suíte**

Run: `npm test`
Expected: todos verdes, incluindo `lib/urlState.test.ts` (5) e `lib/persist.test.ts` (3).

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: sucesso, sem warning de `useSearchParams`/Suspense.

- [ ] **Step 3: Checklist manual (`npm run dev`, backend `npm run dev` na raiz do odd-analyzer ligado)**

Verifique cada item:
- [ ] Selecionar liga → URL vira `/?league=<id>`. Selecionar jogo → `/?league=<id>&match=<id>`.
- [ ] F5 na tela do jogo → volta no mesmo jogo (após o "carregando jogos_").
- [ ] F5 mantém mercado/linha/odd over/odd under preenchidos.
- [ ] Escolher jogador na escalação, F5 → jogador volta. Voltar e abrir OUTRO jogo → jogador vazio.
- [ ] Botão voltar do browser: jogo → lista de jogos → liga, coerente.
- [ ] Rodar análise, clicar "✕ limpar análise" → some só o resultado, seleção e form ficam.
- [ ] Repetir os itens equivalentes em `/pos` (sem odds/jogador).

- [ ] **Step 4: Commit final (se houver ajuste de checklist no doc)**

```bash
git add -A
git commit -m "chore: verificacao de persistencia de estado (suite + build verdes)" || echo "nada a commitar"
```

---

## Self-Review (resultado)

- **Cobertura do spec:** navegação na URL (T1/T2/T5/T6), form no localStorage (T4/T5/T6), jogador por matchId (T3/T5), resultado efêmero + Limpar (T5/T6), Suspense (T5/T6), critérios de aceite (T7). ✔
- **Sem placeholders:** todo passo tem código/comando concreto. ✔
- **Consistência de tipos:** `withLeague/withMatch/withoutMatch` (T1) usados por `useUrlState` (T2); `StoredPlayer/restorePlayer` (T3) usados em T5; `useLocalStorage<T>` (T4) usado em T5/T6 com as keys `oa:pre:*` / `oa:pos:*`. ✔
