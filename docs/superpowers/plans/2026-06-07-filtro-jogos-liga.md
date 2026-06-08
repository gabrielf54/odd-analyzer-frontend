# Filtro de Jogos na Liga — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar busca por time, filtro por período (Todos/Hoje/Próximos 7 dias) e ordenação por horário dentro do dia na lista de jogos da liga (tela Pré-jogo `/`).

**Architecture:** Lógica pura nova em `lib/jogosFiltro.ts` (testada com vitest), ajuste de ordenação em `lib/date.ts`, componente de UI `components/JogosFiltro.tsx` (client, estilo dos chips de mercado) e fiação de estado no `Browse` de `app/page.tsx`. Tudo client-side sobre os ≤50 jogos já carregados — **sem mudança de API**.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4, Vitest 4 (env node, alias `@` → raiz).

---

## File Structure

- **Create** `lib/jogosFiltro.ts` — tipos `Periodo`/`FiltroJogos` + função pura `filtrarJogos`.
- **Create** `lib/jogosFiltro.test.ts` — testes de `filtrarJogos`.
- **Modify** `lib/date.ts` — ordenar jogos por horário dentro de cada `GrupoDia`.
- **Create** `lib/date.test.ts` — teste da ordenação intra-dia.
- **Create** `components/JogosFiltro.tsx` — barra de filtro (busca + 3 chips).
- **Modify** `app/page.tsx` — estado `busca`/`periodo` no `Browse`, aplica filtro, renderiza barra, contagem/limpar, estado vazio por filtro.

Testes co-locados em `lib/` (não existe convenção anterior; vitest acha `*.test.ts` em qualquer lugar fora de `node_modules`).

---

## Task 1: `filtrarJogos` — busca por nome de time

**Files:**
- Create: `lib/jogosFiltro.ts`
- Test: `lib/jogosFiltro.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/jogosFiltro.test.ts
import { describe, it, expect } from "vitest";
import { filtrarJogos } from "@/lib/jogosFiltro";
import type { Jogo } from "@/lib/types";

function jogo(over: Partial<Jogo>): Jogo {
  return {
    id: "1", mandante: "Time A", visitante: "Time B",
    data: "2026-06-07T18:00:00Z", status: "notstarted", placar: null, league_id: 1,
    ...over,
  };
}

describe("filtrarJogos — busca", () => {
  const base = [
    jogo({ id: "1", mandante: "Flamengo", visitante: "Vasco" }),
    jogo({ id: "2", mandante: "Palmeiras", visitante: "Corinthians" }),
  ];

  it("casa no mandante", () => {
    const r = filtrarJogos(base, { busca: "fla", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("casa no visitante", () => {
    const r = filtrarJogos(base, { busca: "corint", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["2"]);
  });

  it("é case-insensitive e ignora espaços nas bordas", () => {
    const r = filtrarJogos(base, { busca: "  VASCO ", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1"]);
  });

  it("busca vazia passa tudo", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "todos" });
    expect(r.map((j) => j.id)).toEqual(["1", "2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/jogosFiltro.test.ts`
Expected: FAIL — não consegue resolver `@/lib/jogosFiltro` / `filtrarJogos` não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/jogosFiltro.ts
import type { Jogo } from "./types";

export type Periodo = "todos" | "hoje" | "7d";
export interface FiltroJogos {
  busca: string;
  periodo: Periodo;
}

export function filtrarJogos(
  jogos: Jogo[],
  filtro: FiltroJogos,
  _agora: Date = new Date(),
): Jogo[] {
  const termo = filtro.busca.trim().toLowerCase();
  return jogos.filter((j) => {
    if (termo) {
      const casa =
        j.mandante.toLowerCase().includes(termo) ||
        j.visitante.toLowerCase().includes(termo);
      if (!casa) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/jogosFiltro.test.ts`
Expected: PASS (4 testes de busca).

- [ ] **Step 5: Commit**

```bash
git add lib/jogosFiltro.ts lib/jogosFiltro.test.ts
git commit -m "feat: filtrarJogos com busca por nome de time"
```

---

## Task 2: `filtrarJogos` — filtro por período (hoje / 7d / sem-data)

**Files:**
- Modify: `lib/jogosFiltro.ts`
- Test: `lib/jogosFiltro.test.ts`

- [ ] **Step 1: Write the failing test** (adicionar ao mesmo arquivo)

```ts
describe("filtrarJogos — periodo", () => {
  const agora = new Date("2026-06-07T12:00:00"); // horário local de referência
  const base = [
    jogo({ id: "hoje",  data: "2026-06-07T20:00:00" }),
    jogo({ id: "ontem", data: "2026-06-06T20:00:00" }),
    jogo({ id: "d6",    data: "2026-06-13T10:00:00" }), // hoje + 6 dias
    jogo({ id: "d7",    data: "2026-06-14T10:00:00" }), // hoje + 7 dias (fora)
    jogo({ id: "nula",  data: null }),
  ];

  it("todos passa tudo, inclusive sem data", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "todos" }, agora);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "d7", "hoje", "nula", "ontem"]);
  });

  it("hoje: só o jogo de hoje", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "hoje" }, agora);
    expect(r.map((j) => j.id)).toEqual(["hoje"]);
  });

  it("7d: de hoje até hoje+6 inclusive; exclui passado, hoje+7 e sem data", () => {
    const r = filtrarJogos(base, { busca: "", periodo: "7d" }, agora);
    expect(r.map((j) => j.id).sort()).toEqual(["d6", "hoje"]);
  });

  it("combina busca E periodo (AND)", () => {
    const comNome = [
      jogo({ id: "x", mandante: "Santos", data: "2026-06-07T20:00:00" }),
      jogo({ id: "y", mandante: "Bahia",  data: "2026-06-07T20:00:00" }),
      jogo({ id: "z", mandante: "Santos", data: "2026-06-14T20:00:00" }),
    ];
    const r = filtrarJogos(comNome, { busca: "santos", periodo: "hoje" }, agora);
    expect(r.map((j) => j.id)).toEqual(["x"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/jogosFiltro.test.ts`
Expected: FAIL — período é ignorado, então "hoje"/"7d" retornam tudo.

- [ ] **Step 3: Write minimal implementation** (substituir o corpo de `filtrarJogos`)

```ts
// lib/jogosFiltro.ts
import type { Jogo } from "./types";

export type Periodo = "todos" | "hoje" | "7d";
export interface FiltroJogos {
  busca: string;
  periodo: Periodo;
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function filtrarJogos(
  jogos: Jogo[],
  filtro: FiltroJogos,
  agora: Date = new Date(),
): Jogo[] {
  const termo = filtro.busca.trim().toLowerCase();
  const ini = inicioDoDia(agora);
  const fimHoje = new Date(ini);
  fimHoje.setDate(fimHoje.getDate() + 1); // início de amanhã (exclusivo)
  const fim7d = new Date(ini);
  fim7d.setDate(fim7d.getDate() + 7); // hoje..hoje+6 → exclusivo no 7º dia

  return jogos.filter((j) => {
    if (termo) {
      const casa =
        j.mandante.toLowerCase().includes(termo) ||
        j.visitante.toLowerCase().includes(termo);
      if (!casa) return false;
    }
    if (filtro.periodo === "todos") return true;

    const d = j.data ? new Date(j.data) : null;
    if (!d || isNaN(d.getTime())) return false; // sem data não posiciona no tempo

    if (filtro.periodo === "hoje") return d >= ini && d < fimHoje;
    return d >= ini && d < fim7d; // "7d"
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/jogosFiltro.test.ts`
Expected: PASS (busca + período, todos os testes).

- [ ] **Step 5: Commit**

```bash
git add lib/jogosFiltro.ts lib/jogosFiltro.test.ts
git commit -m "feat: filtrarJogos com filtro por periodo (hoje/7d)"
```

---

## Task 3: Ordenar jogos por horário dentro do dia

**Files:**
- Modify: `lib/date.ts` (função `agruparPorData`, linhas ~24-53)
- Test: `lib/date.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/date.test.ts
import { describe, it, expect } from "vitest";
import { agruparPorData } from "@/lib/date";
import type { Jogo } from "@/lib/types";

function jogo(over: Partial<Jogo>): Jogo {
  return {
    id: "1", mandante: "A", visitante: "B",
    data: "2026-06-07T18:00:00", status: "notstarted", placar: null, league_id: 1,
    ...over,
  };
}

describe("agruparPorData — ordem dentro do dia", () => {
  const agora = new Date("2026-06-07T08:00:00");

  it("ordena jogos do mesmo dia por horário (mais cedo primeiro)", () => {
    const jogos = [
      jogo({ id: "tarde", data: "2026-06-07T21:00:00" }),
      jogo({ id: "cedo",  data: "2026-06-07T16:00:00" }),
      jogo({ id: "meio",  data: "2026-06-07T18:30:00" }),
    ];
    const grupos = agruparPorData(jogos, agora);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].jogos.map((j) => j.id)).toEqual(["cedo", "meio", "tarde"]);
  });

  it("jogo com data inválida vai ao fim do grupo", () => {
    const jogos = [
      jogo({ id: "ruim", data: "data-invalida" }),
      jogo({ id: "ok",   data: "2026-06-07T16:00:00" }),
    ];
    const grupos = agruparPorData(jogos, agora);
    const semData = grupos.find((g) => g.chave === "sem-data");
    const hoje = grupos.find((g) => g.chave !== "sem-data");
    // "data-invalida" cai no grupo sem-data; o grupo de hoje tem só "ok"
    expect(hoje?.jogos.map((j) => j.id)).toEqual(["ok"]);
    expect(semData?.jogos.map((j) => j.id)).toEqual(["ruim"]);
  });

  it("mantém ordem crescente entre dias", () => {
    const jogos = [
      jogo({ id: "amanha", data: "2026-06-08T16:00:00" }),
      jogo({ id: "hoje",   data: "2026-06-07T16:00:00" }),
    ];
    const grupos = agruparPorData(jogos, agora);
    expect(grupos.map((g) => g.jogos[0].id)).toEqual(["hoje", "amanha"]);
  });
});
```

> Nota: data inválida já é roteada para o grupo `sem-data` pela lógica existente (`isNaN` →
> chave `SEM_DATA`). O segundo teste documenta esse comportamento; a ordenação intra-dia
> opera sobre datas válidas. Mantido para travar o comportamento.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/date.test.ts`
Expected: FAIL no 1º teste — ordem atual é a da entrada (`tarde, cedo, meio`), não ordenada.

- [ ] **Step 3: Write minimal implementation**

Em `lib/date.ts`, dentro de `agruparPorData`, **antes** do `return [...map.values()].sort(...)`, adicionar a ordenação intra-grupo:

```ts
  // Ordena jogos por horário dentro de cada dia (mais cedo primeiro).
  for (const g of map.values()) {
    g.jogos.sort((a, b) => {
      const ta = a.data ? new Date(a.data).getTime() : NaN;
      const tb = b.data ? new Date(b.data).getTime() : NaN;
      const aRuim = isNaN(ta);
      const bRuim = isNaN(tb);
      if (aRuim && bRuim) return 0;
      if (aRuim) return 1;
      if (bRuim) return -1;
      return ta - tb;
    });
  }

  return [...map.values()].sort((a, b) => {
```

(A linha `return [...map.values()].sort((a, b) => {` é a já existente — o bloco `for` entra logo acima dela.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/date.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts lib/date.test.ts
git commit -m "feat: ordena jogos por horario dentro de cada dia"
```

---

## Task 4: Componente `JogosFiltro`

**Files:**
- Create: `components/JogosFiltro.tsx`

Sem teste unitário: vitest está em env `node` (sem jsdom). Verificação por `lint` + `build`.

- [ ] **Step 1: Criar o componente**

```tsx
// components/JogosFiltro.tsx
"use client";

import type { Periodo } from "@/lib/jogosFiltro";

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Próximos 7 dias" },
];

export function JogosFiltro({
  busca,
  setBusca,
  periodo,
  setPeriodo,
}: {
  busca: string;
  setBusca: (v: string) => void;
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <input
        className="input sm:max-w-[16rem]"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="buscar time…"
        aria-label="buscar time"
      />
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => {
          const on = p.key === periodo;
          return (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
                on
                  ? "border-value text-value bg-[rgba(37,224,138,0.07)]"
                  : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar lint/typecheck**

Run: `npm run lint`
Expected: sem erros no arquivo novo.

- [ ] **Step 3: Commit**

```bash
git add components/JogosFiltro.tsx
git commit -m "feat: componente JogosFiltro (busca + chips de periodo)"
```

---

## Task 5: Fiar o filtro no `Browse` (estado, contagem, limpar, vazio)

**Files:**
- Modify: `app/page.tsx` (função `Browse`, linhas ~96-122; imports no topo)

- [ ] **Step 1: Adicionar imports no topo de `app/page.tsx`**

Após a linha `import { JogosLista } from "@/components/JogosLista";`, adicionar:

```tsx
import { JogosFiltro } from "@/components/JogosFiltro";
import { filtrarJogos, type Periodo } from "@/lib/jogosFiltro";
```

E adicionar `useMemo` ao import do React (linha 3):

```tsx
import { useEffect, useMemo, useState } from "react";
```

- [ ] **Step 2: Reescrever a função `Browse`**

Substituir toda a função `Browse` (da assinatura até o `}` de fechamento) por:

```tsx
function Browse({
  ligaId, jogos, loading, erro, onSelect,
}: {
  ligaId: string; jogos: Jogo[]; loading: boolean; erro: string; onSelect: (j: Jogo) => void;
}) {
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todos");

  const filtrados = useMemo(
    () => filtrarJogos(jogos, { busca, periodo }),
    [jogos, busca, periodo],
  );

  const filtroAtivo = busca.trim() !== "" || periodo !== "todos";
  const mostrarBarra = !!ligaId && !loading && jogos.length > 0;

  function limpar() {
    setBusca("");
    setPeriodo("todos");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="display text-2xl font-extrabold leading-none text-fg">buscar valor</h1>
        <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
          o modelo aponta onde há <span className="text-value">edge / ev positivo</span> sobre a odd
          da casa sem margem. escolha a liga, depois o jogo.
        </p>
      </div>

      {erro && <ErroBox msg={erro} />}

      {!ligaId ? (
        <Vazio titulo="escolha uma liga" texto="selecione uma liga à esquerda para ver os jogos não iniciados." />
      ) : loading ? (
        <p className="mono text-sm text-value">carregando jogos<span className="blink">_</span></p>
      ) : (
        <>
          {mostrarBarra && (
            <JogosFiltro
              busca={busca} setBusca={setBusca}
              periodo={periodo} setPeriodo={setPeriodo}
            />
          )}

          {filtroAtivo && jogos.length > 0 && (
            <div className="flex items-center justify-between text-[0.72rem] text-faint">
              <span>{filtrados.length} de {jogos.length} jogos</span>
              <button onClick={limpar} className="transition-colors hover:text-fg">limpar</button>
            </div>
          )}

          {jogos.length > 0 && filtrados.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
              <p className="text-[0.78rem] text-muted">nenhum jogo bate o filtro — ajuste a busca ou o período.</p>
            </div>
          ) : (
            <JogosLista jogos={filtrados} variante="pre" onSelect={onSelect} />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar lint/typecheck**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 4: Build de produção (typecheck completo + compila)**

Run: `npm run build`
Expected: build conclui sem erros de tipo nem de compilação.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: fia filtro de jogos no Browse (contagem, limpar, vazio)"
```

---

## Task 6: Verificação manual end-to-end

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir backend e front**

Backend (repo `odd-analyzer`): `npm run dev` (porta 3001).
Front: `npm run dev` (porta 3000).

- [ ] **Step 2: Conferir comportamento**

No navegador (`http://localhost:3000`):
- Escolher uma liga com vários jogos → barra de filtro aparece acima da lista.
- Digitar parte do nome de um time → lista reduz; contagem "N de M jogos" e "limpar" aparecem.
- Clicar "Hoje" / "Próximos 7 dias" → lista recorta por período; dentro de cada dia os jogos saem do mais cedo ao mais tarde.
- Filtro que zera resultado → mensagem "nenhum jogo bate o filtro".
- "limpar" → volta a "Todos" e busca vazia.
- Trocar de liga → filtro reseta (estado local do `Browse`).

- [ ] **Step 3: Rodar a suíte completa**

Run: `npm test`
Expected: todos os testes passam (`jogosFiltro` + `date`).

---

## Self-Review

- **Cobertura do spec:** busca (Task 1), período Todos/Hoje/7d + sem-data + AND (Task 2),
  ordenação intra-dia (Task 3), componente (Task 4), fiação + contagem/limpar + vazio por
  filtro (Task 5), verificação manual (Task 6). Sem mudança de API ✓.
- **Sem persistência entre ligas:** estado vive no `Browse`, que é re-montado/limpo via
  fluxo atual da página → reseta ao trocar de liga, conforme spec.
- **Tipos consistentes:** `Periodo` e `FiltroJogos` definidos em `lib/jogosFiltro.ts` (Task 2)
  e reusados em `JogosFiltro` (Task 4) e `Browse` (Task 5). `filtrarJogos(jogos, filtro, agora?)`
  com mesma assinatura em todos os usos.
