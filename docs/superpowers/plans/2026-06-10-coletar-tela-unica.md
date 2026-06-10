# Coletar como tela única — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promover a tela "Coletar Odds" a tela principal e única (servida em `/`), descontinuando e apagando as telas pré-jogo e pós-jogo e todo o código que passa a ser exclusivo delas.

**Architecture:** Next.js (App Router). A tela coletar é autocontida (`getLeagues/getMatches/getOddsPrompt/postAnalyzeManual/postCrosswalk`). Move-se o conteúdo de `app/coletar/page.tsx` para `app/page.tsx`, deletam-se as rotas/`Nav`/componentes/libs órfãos, e aparam-se exports não usados em `lib/api.ts`, `lib/types.ts` e o variant `pos` de `MatchList`/`MatchCard`. Backend (repo `odd-analyzer`) **não muda**.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Tailwind v4.

**Repo:** `odd-analyzer-frontend`. Rodar todos os comandos a partir da raiz desse repo.

**Spec:** `docs/superpowers/specs/2026-06-10-coletar-tela-unica-design.md`

**Observações para o executor:**
- Não rodar `git checkout`/`reset`/`branch` — trabalhar na working tree atual.
- `next build` já faz typecheck. `npm test` roda Vitest. `npx tsc --noEmit` é o typecheck isolado.
- Não tocar no backend.

---

### Task 1: Coletar vira a raiz `/`; remover rotas pré/pós e o `Nav` do layout

**Files:**
- Create: `app/page.tsx` (sobrescreve o pré-jogo com o conteúdo do coletar)
- Delete: `app/coletar/page.tsx` (e a pasta `app/coletar/`)
- Delete: `app/pos/page.tsx` (e a pasta `app/pos/`)
- Modify: `app/layout.tsx` (remover `Nav`)

- [ ] **Step 1: Copiar o conteúdo de `app/coletar/page.tsx` para `app/page.tsx`**

Sobrescreva `app/page.tsx` inteiro com o conteúdo atual de `app/coletar/page.tsx`, **sem nenhuma alteração** (os imports usam alias `@/`, então o caminho do arquivo não importa). O ajuste do `variant="pre"` desse arquivo acontece na Task 6.

- [ ] **Step 2: Deletar as pastas das rotas antigas**

```bash
git rm app/coletar/page.tsx app/pos/page.tsx
```

(Isso esvazia `app/coletar/` e `app/pos/`; o git remove as pastas ao não restar arquivo rastreado.)

- [ ] **Step 3: Remover o `Nav` do layout**

Em `app/layout.tsx`, apague a linha de import:

```tsx
import { Nav } from "@/components/Nav";
```

e a linha que renderiza o componente (dentro do `<div className="mx-auto flex max-w-6xl ...">`):

```tsx
            <Nav />
```

O restante do header (brand `odd/analyzer`, badge "copa 2026 live") e o footer ficam intactos.

- [ ] **Step 4: Rodar o build e confirmar verde**

Run: `npm run build`
Expected: PASS. Compila sem erro. As rotas `/coletar` e `/pos` deixam de existir; `/` agora serve a tela coletar. (Os componentes `Nav`, `MatchFilter`, etc. ainda existem no repo mas ficam sem importador — isso não quebra o build.)

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: coletar vira tela unica na raiz; remove rotas pre/pos e Nav"
```

---

### Task 2: Deletar componentes exclusivos de pré/pós

**Files:**
- Delete: `components/Nav.tsx`
- Delete: `components/MatchFilter.tsx`
- Delete: `components/Lineup.tsx`
- Delete: `components/MarketChips.tsx`
- Delete: `components/CandidatesTable.tsx`
- Delete: `components/AiVerdict.tsx`

- [ ] **Step 1: Deletar os arquivos**

```bash
git rm components/Nav.tsx components/MatchFilter.tsx components/Lineup.tsx components/MarketChips.tsx components/CandidatesTable.tsx components/AiVerdict.tsx
```

- [ ] **Step 2: Rodar build + testes**

Run: `npm run build`
Expected: PASS. Nenhum arquivo mantido importa esses componentes (verificado: só as rotas já deletadas os usavam). `CandidatesTable` importava `InvestigationTrace`, que continua existindo (também usado por `DiagnosticsPanel`).

Run: `npm test`
Expected: PASS. Nenhum teste cobre esses componentes.

- [ ] **Step 3: Commit**

```bash
git commit -am "chore: remove componentes exclusivos de pre/pos"
```

---

### Task 3: Deletar libs exclusivas de pré/pós

**Files:**
- Delete: `lib/persist.ts`, `lib/persist.test.ts`
- Delete: `lib/matchFilter.ts`, `lib/matchFilter.test.ts`
- Delete: `lib/useLocalStorage.ts`

- [ ] **Step 1: Deletar os arquivos**

```bash
git rm lib/persist.ts lib/persist.test.ts lib/matchFilter.ts lib/matchFilter.test.ts lib/useLocalStorage.ts
```

Justificativa: `persist` (`restorePlayer`) e `matchFilter` (`filterMatches`/`MatchFilter`) só eram usados pelo pré-jogo; `useLocalStorage` só por pré/pós (coletar usa `lib/coletarStorage`).

- [ ] **Step 2: Rodar build + testes**

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS. Os testes `persist.test.ts` e `matchFilter.test.ts` foram removidos junto; os demais continuam verdes.

- [ ] **Step 3: Commit**

```bash
git commit -am "chore: remove libs exclusivas de pre/pos (persist, matchFilter, useLocalStorage)"
```

---

### Task 4: Aparar `lib/api.ts` (remover funções órfãs)

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Ajustar o import de tipos**

Em `lib/api.ts`, troque o bloco de import (linhas 2-5):

```tsx
import type {
  League, Match, Lineup, AnalysisResult, RealResult,
  ManualOddsLine, ManualAnalysisResult,
} from "./types";
```

por:

```tsx
import type {
  League, Match,
  ManualOddsLine, ManualAnalysisResult,
} from "./types";
```

- [ ] **Step 2: Remover `getLineup`**

Apague:

```tsx
export const getLineup = (eventId: string | number) =>
  req<Lineup>(`/jogos/${eventId}/escalacao`);
```

- [ ] **Step 3: Remover `AnalyzeBody` e `postAnalyze`**

Apague o bloco inteiro:

```tsx
export interface AnalyzeBody {
  event_id: string;
  market_key: string;
  linha?: number;
  odd_over?: number;
  odd_under?: number;
  usar_ia?: boolean;
  player_ref?: string | null;
  league_id?: string | number | null;
  diagnostico?: boolean;
}

export const postAnalyze = (body: AnalyzeBody) =>
  req<AnalysisResult>("/analisar", { method: "POST", body: JSON.stringify(body) });
```

- [ ] **Step 4: Remover `getResult`**

Apague:

```tsx
export const getResult = (eventId: string | number, market: string, line: number) =>
  req<RealResult>(`/jogos/${eventId}/resultado?market=${market}&linha=${line}`);
```

As funções mantidas: `getLeagues`, `getMatches`, `getOddsPrompt`, `postAnalyzeManual`, `postCrosswalk` (e `ManualAnalyzeBody`).

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: PASS, sem erro (nenhum arquivo mantido importava `getLineup`/`postAnalyze`/`getResult`).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "chore: apara lib/api.ts (remove getLineup/postAnalyze/getResult)"
```

---

### Task 5: Aparar `lib/types.ts` (remover tipos órfãos)

**Files:**
- Modify: `lib/types.ts`

Remoções (todos só usados por arquivos já deletados — confirmado por grep de `lib/types`):

- [ ] **Step 1: Remover `Player`, `LineupSide`, `Lineup`**

Apague as linhas:

```tsx
export interface Player { id: string; name: string; team_id: string; posicao: string; }

export interface LineupSide { team_name: string; team_id: string; jogadores: Player[]; }
export interface Lineup { origem: string; home: LineupSide; away: LineupSide; }
```

- [ ] **Step 2: Remover `AiBet` e `Ai`**

Apague:

```tsx
export interface AiBet { jogador: string; linha: number; veredito: string; confianca: string; motivo: string; }
export interface Ai { melhor_aposta: AiBet | null; outras: AiBet[]; alertas: string[]; }
```

Mantenha a linha seguinte (`ManualIa`), que é usada pelo `RecommendationCard`:

```tsx
export interface ManualIa { topo_explicacao: string | null; alertas: string[]; }
```

- [ ] **Step 3: Remover `AnalysisResult` e `RealResult`**

Apague:

```tsx
export interface AnalysisResult {
  jogo: string;
  candidatos: Candidate[];
  reprovados: RejectedCandidate[];
  ia: Ai;
  em_validacao: boolean;
}

export type RealResult = Record<string, { valor_real: number; bateu: boolean }>;
```

- [ ] **Step 4: Remover `Market` e `MARKETS`**

Apague o bloco final:

```tsx
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
```

Tipos mantidos (usados pela tela coletar e seus componentes): `League`, `Match`, `TraceStep`, `Trace`, `StatsDetalhadas`, `Candidate`, `ManualIa`, `CutReason`, `RejectedCandidate`, `ManualOddsLine`, `SemMatch`, `LinhaRejeitada`, `ManualAnalysisResult`.

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "chore: apara lib/types.ts (remove tipos orfaos de pre/pos)"
```

---

### Task 6: Aparar o variant `pos` de `MatchList` e `MatchCard`

**Files:**
- Modify: `components/MatchList.tsx`
- Modify: `components/MatchCard.tsx`
- Modify: `app/page.tsx` (call site — remover `variant="pre"`)

- [ ] **Step 1: Reescrever `components/MatchList.tsx`**

Substitua o arquivo inteiro por:

```tsx
import type { Match } from "@/lib/types";
import { groupByDay } from "@/lib/date";
import { MatchCard } from "@/components/MatchCard";

export function MatchList({
  matches,
  onSelect,
}: {
  matches: Match[];
  onSelect: (j: Match) => void;
}) {
  if (!matches.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
        <p className="text-[0.78rem] text-muted">sem jogos não iniciados nessa liga.</p>
      </div>
    );
  }

  const groups = groupByDay(matches);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-1.5">
          <span className="overline">▸ {g.label}</span>
          {g.matches.map((j) => (
            <MatchCard key={j.id} match={j} onClick={() => onSelect(j)} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `components/MatchCard.tsx`**

Substitua o arquivo inteiro por:

```tsx
import type { Match } from "@/lib/types";
import { localTime } from "@/lib/date";

export function MatchCard({
  match,
  onClick,
}: {
  match: Match;
  onClick: () => void;
}) {
  const time = localTime(match.data);
  return (
    <button
      onClick={onClick}
      className="reveal group flex w-full items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-value/55 hover:bg-[rgba(37,224,138,0.055)]"
    >
      <span className="mono w-12 shrink-0 border-r border-line pr-3 text-center text-[0.72rem] text-muted transition-colors group-hover:border-value/30 group-hover:text-value/80">
        {time || "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[0.9rem] font-bold text-fg transition-colors group-hover:text-value">
          {match.mandante}{" "}
          <span className="text-faint group-hover:text-value/70">×</span>{" "}
          {match.visitante}
        </span>
        <span className="overline mt-0.5 block transition-colors group-hover:text-value/70">não iniciado</span>
      </span>
      <span className="text-faint transition-colors group-hover:text-value">▸</span>
    </button>
  );
}
```

- [ ] **Step 3: Atualizar o call site em `app/page.tsx`**

No `app/page.tsx` (conteúdo do coletar, componente `Browse`), a chamada de `MatchList` passa `variant="pre"`. Remova esse atributo. De:

```tsx
        <MatchList matches={matches} variant="pre" onSelect={onSelect} />
```

para:

```tsx
        <MatchList matches={matches} onSelect={onSelect} />
```

- [ ] **Step 4: Typecheck + build + testes**

Run: `npx tsc --noEmit`
Expected: PASS (a prop `variant` deixou de existir e o único call site foi atualizado).

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/MatchList.tsx components/MatchCard.tsx app/page.tsx
git commit -m "chore: apara variant pos de MatchList/MatchCard"
```

---

### Task 7: Verificação final completa

**Files:** nenhum (só verificação)

- [ ] **Step 1: Suíte completa verde**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: PASS. Apenas a rota `/` existe (mais os arquivos estáticos do Next). Sem rota `/coletar` nem `/pos`.

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (sem imports/variáveis órfãos introduzidos).

- [ ] **Step 2: Sanidade manual (opcional, recomendado)**

Run: `npm run dev` e abra `http://localhost:3000`.
Expected: a tela coletar carrega na raiz; o header não mostra mais abas de navegação; o fluxo copiar-prompt → colar JSON → analisar funciona; `http://localhost:3000/pos` retorna 404.

(O backend precisa estar rodando em `localhost:3001` para o fluxo de dados; isso é só sanidade de UI, não faz parte do gate de testes.)
