# Browse-first UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o fluxo do front de "form com dropdowns" para "browse-first estilo casa de aposta": trilho de ligas + lista de jogos com data/horário, e detalhe do confronto que assume a tela ao selecionar um jogo.

**Architecture:** Páginas (`/` e `/pos`) viram Client Components com dois estados (browse / detalhe) controlados por `jogoSel`. Componentes novos e isolados (`LigaRail`, `JogosLista`, `JogoCard`, `MercadoChips`) + uma função pura testável (`lib/date.ts`). `lib/api.ts`, `lib/types.ts`, tema e componentes de resultado (`CandidatosTabela`, `IaVeredito`, `ui.tsx`) **não mudam**.

**Tech Stack:** Next 16 (App Router), React 19, TypeScript, Tailwind v4. Vitest p/ o único bloco com lógica (data).

**Spec:** `docs/superpowers/specs/2026-06-07-browse-first-ux-design.md`

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/date.ts` | criar | `agruparPorData` (pura) + `horaLocal`. Única lógica não-trivial. |
| `lib/date.test.ts` | criar | unit tests da lógica de data. |
| `vitest.config.ts` | criar | config do vitest + alias `@/`. |
| `components/LigaRail.tsx` | criar | trilho de ligas. |
| `components/JogoCard.tsx` | criar | card de um jogo. |
| `components/JogosLista.tsx` | criar | agrupa por dia + renderiza cards. |
| `components/MercadoChips.tsx` | criar | chips de mercado (marca em validação). |
| `app/page.tsx` | reescrever | pré-jogo: browse + detalhe. |
| `app/pos/page.tsx` | reescrever | pós-jogo: browse + detalhe. |
| `package.json` | modificar | devDeps vitest + script `test`. |

Convenção de teste: só `lib/date.ts` tem unit tests (lógica). Componentes/páginas são visuais → verificados via `npm run build`, `npm run lint` e app rodando.

---

## Task 1: Função de data (`lib/date.ts`) com TDD

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/date.ts`
- Test: `lib/date.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar vitest**

Run:
```bash
npm install -D vitest
```
Expected: adiciona `vitest` em devDependencies, sem erros.

- [ ] **Step 2: Adicionar script de teste**

Em `package.json`, dentro de `"scripts"`, adicionar a linha `test`:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Config do vitest com alias `@/`**

Criar `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Escrever os testes (falhando)**

Criar `lib/date.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { agruparPorData, horaLocal } from "@/lib/date";
import type { Jogo } from "@/lib/types";

const base = (over: Partial<Jogo>): Jogo => ({
  id: "x", mandante: "A", visitante: "B", data: null,
  status: "notstarted", placar: null, league_id: 1, ...over,
});

// referência fixa: 07 jun 2026, 12:00 local
const AGORA = new Date(2026, 5, 7, 12, 0, 0);

describe("agruparPorData", () => {
  it("lista vazia → []", () => {
    expect(agruparPorData([], AGORA)).toEqual([]);
  });

  it("rotula hoje e amanhã", () => {
    const jogos = [
      base({ id: "1", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 8, 11, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g.map((x) => x.label)).toEqual(["hoje", "amanhã"]);
  });

  it("ordena dias em ordem crescente", () => {
    const jogos = [
      base({ id: "1", data: new Date(2026, 5, 10, 16, 0).toISOString() }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g.map((x) => x.label)).toEqual(["hoje", "qua 10 jun"]);
  });

  it("jogos sem data caem em 'sem data' no fim", () => {
    const jogos = [
      base({ id: "1", data: null }),
      base({ id: "2", data: new Date(2026, 5, 7, 16, 0).toISOString() }),
    ];
    const g = agruparPorData(jogos, AGORA);
    expect(g[g.length - 1].label).toBe("sem data");
  });
});

describe("horaLocal", () => {
  it("formata HH:MM", () => {
    expect(horaLocal(new Date(2026, 5, 7, 16, 5).toISOString())).toBe("16:05");
  });
  it("null → ''", () => {
    expect(horaLocal(null)).toBe("");
  });
  it("data inválida → ''", () => {
    expect(horaLocal("não-é-data")).toBe("");
  });
});
```

- [ ] **Step 5: Rodar os testes (devem falhar)**

Run:
```bash
npm test
```
Expected: FAIL — `agruparPorData`/`horaLocal` não existem (erro de import/módulo).

- [ ] **Step 6: Implementar `lib/date.ts`**

Criar `lib/date.ts`:
```ts
import type { Jogo } from "./types";

export interface GrupoDia {
  chave: string;
  label: string;
  jogos: Jogo[];
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEM_DATA = "sem-data";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function horaLocal(data: string | null): string {
  if (!data) return "";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function agruparPorData(jogos: Jogo[], agora: Date = new Date()): GrupoDia[] {
  const hoje = ymd(agora);
  const amanhaDate = new Date(agora);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanha = ymd(amanhaDate);

  const map = new Map<string, GrupoDia>();

  for (const j of jogos) {
    const d = j.data ? new Date(j.data) : null;
    const valido = d !== null && !isNaN(d.getTime());
    const chave = valido ? ymd(d!) : SEM_DATA;

    if (!map.has(chave)) {
      let label: string;
      if (chave === SEM_DATA) label = "sem data";
      else if (chave === hoje) label = "hoje";
      else if (chave === amanha) label = "amanhã";
      else label = `${DIAS[d!.getDay()]} ${d!.getDate()} ${MESES[d!.getMonth()]}`;
      map.set(chave, { chave, label, jogos: [] });
    }
    map.get(chave)!.jogos.push(j);
  }

  return [...map.values()].sort((a, b) => {
    if (a.chave === SEM_DATA) return 1;
    if (b.chave === SEM_DATA) return -1;
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });
}
```

- [ ] **Step 7: Rodar os testes (devem passar)**

Run:
```bash
npm test
```
Expected: PASS — todos os testes verdes.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts lib/date.ts lib/date.test.ts package.json package-lock.json
git commit -m "feat: lib/date.ts (agruparPorData, horaLocal) + vitest"
```

---

## Task 2: `LigaRail`

**Files:**
- Create: `components/LigaRail.tsx`

- [ ] **Step 1: Implementar o componente**

Criar `components/LigaRail.tsx`:
```tsx
import type { Liga } from "@/lib/types";

export function LigaRail({
  ligas,
  ativa,
  onSelect,
}: {
  ligas: Liga[];
  ativa: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      <span className="overline mb-2 block">ligas</span>
      {ligas.length === 0 && (
        <span className="text-[0.72rem] text-faint">carregando…</span>
      )}
      {ligas.map((l) => {
        const on = String(l.id) === ativa;
        return (
          <button
            key={l.id}
            onClick={() => onSelect(String(l.id))}
            className={`truncate rounded-sm border-l-2 px-2.5 py-1.5 text-left text-[0.78rem] transition-colors ${
              on
                ? "border-value bg-panel-2 text-fg"
                : "border-transparent text-muted hover:bg-panel hover:text-fg"
            }`}
          >
            {l.nome}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verificar compilação (lint)**

Run:
```bash
npm run lint
```
Expected: sem erros novos referentes a `LigaRail.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/LigaRail.tsx
git commit -m "feat: componente LigaRail"
```

---

## Task 3: `JogoCard`

**Files:**
- Create: `components/JogoCard.tsx`

- [ ] **Step 1: Implementar o componente**

Criar `components/JogoCard.tsx`:
```tsx
import type { Jogo } from "@/lib/types";
import { horaLocal } from "@/lib/date";

export function JogoCard({
  jogo,
  variante,
  onClick,
}: {
  jogo: Jogo;
  variante: "pre" | "pos";
  onClick: () => void;
}) {
  const hora = horaLocal(jogo.data);
  const placar = variante === "pos" && jogo.placar ? jogo.placar : null;
  return (
    <button
      onClick={onClick}
      className="reveal group flex w-full items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-[#2c3744]"
    >
      <span className="mono w-12 shrink-0 border-r border-line pr-3 text-center text-[0.72rem] text-muted">
        {variante === "pos" ? "fim" : hora || "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[0.9rem] font-bold text-fg">
          {jogo.mandante}{" "}
          {placar ? (
            <span className="text-value">{placar}</span>
          ) : (
            <span className="text-faint">×</span>
          )}{" "}
          {jogo.visitante}
        </span>
        {variante === "pre" && <span className="overline mt-0.5 block">não iniciado</span>}
      </span>
      <span className="text-faint transition-colors group-hover:text-value">▸</span>
    </button>
  );
}
```

- [ ] **Step 2: Verificar compilação (lint)**

Run:
```bash
npm run lint
```
Expected: sem erros novos referentes a `JogoCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/JogoCard.tsx
git commit -m "feat: componente JogoCard"
```

---

## Task 4: `JogosLista`

**Files:**
- Create: `components/JogosLista.tsx`

- [ ] **Step 1: Implementar o componente**

Criar `components/JogosLista.tsx`:
```tsx
import type { Jogo } from "@/lib/types";
import { agruparPorData } from "@/lib/date";
import { JogoCard } from "@/components/JogoCard";

export function JogosLista({
  jogos,
  onSelect,
  variante,
}: {
  jogos: Jogo[];
  onSelect: (j: Jogo) => void;
  variante: "pre" | "pos";
}) {
  if (!jogos.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
        <p className="text-[0.78rem] text-muted">
          {variante === "pos"
            ? "sem jogos finalizados nessa liga."
            : "sem jogos não iniciados nessa liga."}
        </p>
      </div>
    );
  }

  const grupos = agruparPorData(jogos);

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => (
        <div key={g.chave} className="flex flex-col gap-1.5">
          <span className="overline">▸ {g.label}</span>
          {g.jogos.map((j) => (
            <JogoCard key={j.id} jogo={j} variante={variante} onClick={() => onSelect(j)} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação (lint)**

Run:
```bash
npm run lint
```
Expected: sem erros novos referentes a `JogosLista.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/JogosLista.tsx
git commit -m "feat: componente JogosLista (agrupa por dia)"
```

---

## Task 5: `MercadoChips`

**Files:**
- Create: `components/MercadoChips.tsx`

- [ ] **Step 1: Implementar o componente**

Criar `components/MercadoChips.tsx`:
```tsx
import type { Mercado } from "@/lib/types";

export function MercadoChips({
  mercados,
  ativo,
  onSelect,
}: {
  mercados: Mercado[];
  ativo: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {mercados.map((m) => {
        const on = m.key === ativo;
        const validacao = m.nivel === "partida";
        return (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
              on
                ? validacao
                  ? "border-warn text-warn bg-[rgba(255,177,61,0.08)]"
                  : "border-value text-value bg-[rgba(37,224,138,0.07)]"
                : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
            }`}
          >
            {m.label}
            {validacao ? " ⚠" : ""}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação (lint)**

Run:
```bash
npm run lint
```
Expected: sem erros novos referentes a `MercadoChips.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/MercadoChips.tsx
git commit -m "feat: componente MercadoChips"
```

---

## Task 6: Reescrever `app/page.tsx` (pré-jogo browse-first)

**Files:**
- Modify (rewrite): `app/page.tsx`

- [ ] **Step 1: Reescrever o arquivo inteiro**

Substituir todo o conteúdo de `app/page.tsx` por:
```tsx
"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, postAnalisar } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type AnaliseResult, type Mercado } from "@/lib/types";
import { horaLocal } from "@/lib/date";
import { LigaRail } from "@/components/LigaRail";
import { JogosLista } from "@/components/JogosLista";
import { MercadoChips } from "@/components/MercadoChips";
import { CandidatosTabela } from "@/components/CandidatosTabela";
import { IaVeredito } from "@/components/IaVeredito";
import { Panel, Field, Tag } from "@/components/ui";

export default function PreJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [oddOver, setOddOver] = useState("1.90");
  const [oddUnder, setOddUnder] = useState("1.90");
  const [playerRef, setPlayerRef] = useState("");
  const [result, setResult] = useState<AnaliseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getLigas().then(setLigas).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoSel(null); setResult(null); setErro(""); setLoadingJogos(true);
    getJogos(ligaId, "notstarted")
      .then(setJogos)
      .catch((e) => setErro(e.message))
      .finally(() => setLoadingJogos(false));
  }, [ligaId]);

  const mercado = MERCADOS.find((m) => m.key === marketKey)!;

  function voltar() {
    setJogoSel(null); setResult(null); setErro("");
  }

  async function analisar() {
    if (!jogoSel) return;
    setErro(""); setResult(null); setLoading(true);
    try {
      const r = await postAnalisar({
        event_id: String(jogoSel.id), market_key: marketKey,
        linha: Number(linha), odd_over: Number(oddOver), odd_under: Number(oddUnder),
        player_ref: mercado.nivel === "jogador" && playerRef ? playerRef : null,
        league_id: ligaId,
      });
      setResult(r);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LigaRail ligas={ligas} ativa={ligaId} onSelect={setLigaId} />
      </aside>

      <div className="min-w-0">
        {!jogoSel ? (
          <Browse ligaId={ligaId} jogos={jogos} loading={loadingJogos} erro={erro} onSelect={setJogoSel} />
        ) : (
          <Detalhe
            jogo={jogoSel}
            marketKey={marketKey} setMarketKey={setMarketKey} mercado={mercado}
            linha={linha} setLinha={setLinha}
            oddOver={oddOver} setOddOver={setOddOver}
            oddUnder={oddUnder} setOddUnder={setOddUnder}
            playerRef={playerRef} setPlayerRef={setPlayerRef}
            result={result} loading={loading} erro={erro}
            onAnalisar={analisar} onVoltar={voltar}
          />
        )}
      </div>
    </div>
  );
}

function Browse({
  ligaId, jogos, loading, erro, onSelect,
}: {
  ligaId: string; jogos: Jogo[]; loading: boolean; erro: string; onSelect: (j: Jogo) => void;
}) {
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
        <JogosLista jogos={jogos} variante="pre" onSelect={onSelect} />
      )}
    </div>
  );
}

function Detalhe({
  jogo, marketKey, setMarketKey, mercado, linha, setLinha, oddOver, setOddOver,
  oddUnder, setOddUnder, playerRef, setPlayerRef, result, loading, erro, onAnalisar, onVoltar,
}: {
  jogo: Jogo;
  marketKey: string; setMarketKey: (k: string) => void; mercado: Mercado;
  linha: string; setLinha: (v: string) => void;
  oddOver: string; setOddOver: (v: string) => void;
  oddUnder: string; setOddUnder: (v: string) => void;
  playerRef: string; setPlayerRef: (v: string) => void;
  result: AnaliseResult | null; loading: boolean; erro: string;
  onAnalisar: () => void; onVoltar: () => void;
}) {
  const hora = horaLocal(jogo.data);
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onVoltar} className="overline self-start transition-colors hover:text-fg">
        ‹ voltar aos jogos
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <h1 className="display text-2xl font-extrabold leading-none text-fg">
          {jogo.mandante} <span className="text-faint">×</span> {jogo.visitante}
        </h1>
        {hora && <span className="overline">{hora}</span>}
      </div>

      <Panel title="mercado">
        <div className="flex flex-col gap-3.5">
          <MercadoChips mercados={MERCADOS} ativo={marketKey} onSelect={setMarketKey} />

          {mercado.nivel === "jogador" && (
            <Field label="jogador" hint="vazio = varre o elenco inteiro">
              <input className="input" value={playerRef} onChange={(e) => setPlayerRef(e.target.value)} placeholder="ex.: Messi" />
            </Field>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <Field label="linha"><input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} /></Field>
            <Field label="odd over"><input className="input" value={oddOver} onChange={(e) => setOddOver(e.target.value)} /></Field>
            <Field label="odd under"><input className="input" value={oddUnder} onChange={(e) => setOddUnder(e.target.value)} /></Field>
          </div>

          <button onClick={onAnalisar} disabled={loading} className="btn w-full justify-center">
            {loading ? "analisando…" : "▸ analisar"}
          </button>

          {erro && <ErroBox msg={erro} />}
        </div>
      </Panel>

      {loading && <Carregando />}

      {result && (
        <div className="flex flex-col gap-4">
          {result.em_validacao && (
            <div className="reveal flex items-start gap-2.5 rounded-sm border border-warn/45 bg-[rgba(255,177,61,0.07)] px-3.5 py-3">
              <span className="text-warn">⚠</span>
              <p className="text-[0.74rem] leading-relaxed text-warn">
                mercado <strong>em validação</strong> — exibido só para estudo. <strong>não apostar</strong>:
                ainda não passou na calibração (detector de mentira do modelo).
              </p>
            </div>
          )}

          <div className="reveal">
            <Panel title="veredito da ia" glow badge={<Tag tone="muted">explica · não inventa</Tag>}>
              <IaVeredito ia={result.ia} />
            </Panel>
          </div>

          <div className="reveal" style={{ animationDelay: "60ms" }}>
            <Panel title={`candidatos · ${result.candidatos.length}`} badge={<Tag tone="value">edge &gt; 0</Tag>}>
              <CandidatosTabela candidatos={result.candidatos} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">⌖</div>
        <p className="display mt-3 text-lg font-bold text-muted">{titulo}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{texto}</p>
      </div>
    </Panel>
  );
}

function Carregando() {
  return (
    <Panel className="grid min-h-[260px] place-items-center">
      <div className="text-center">
        <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
        <p className="mt-2 text-[0.68rem] text-faint">produção de um lado × vulnerabilidade do outro</p>
      </div>
    </Panel>
  );
}

function ErroBox({ msg }: { msg: string }) {
  return (
    <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
      erro: {msg}
    </p>
  );
}
```

- [ ] **Step 2: Verificar build**

Run:
```bash
npm run build
```
Expected: build sem erros de TypeScript/lint.

- [ ] **Step 3: Verificação visual (app rodando)**

Run (backend já rodando na 3001):
```bash
npm run dev
```
Abrir `http://localhost:3000`. Confirmar:
- trilho de ligas à esquerda; clicar numa liga lista jogos agrupados por dia (hoje/amanhã/data) com horário;
- clicar num jogo → tela vira detalhe (cabeçalho + chips de mercado + strip + analisar);
- mercado de partida (gols/escanteios/vitória) aparece com ⚠ e, ao analisar, mostra banner "em validação";
- `‹ voltar aos jogos` retorna à lista.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: pré-jogo browse-first (lista de jogos + detalhe do confronto)"
```

---

## Task 7: Reescrever `app/pos/page.tsx` (pós-jogo browse-first)

**Files:**
- Modify (rewrite): `app/pos/page.tsx`

- [ ] **Step 1: Reescrever o arquivo inteiro**

Substituir todo o conteúdo de `app/pos/page.tsx` por:
```tsx
"use client";

import { useEffect, useState } from "react";
import { getLigas, getJogos, getResultado } from "@/lib/api";
import { MERCADOS, type Liga, type Jogo, type ResultadoReal } from "@/lib/types";
import { horaLocal } from "@/lib/date";
import { LigaRail } from "@/components/LigaRail";
import { JogosLista } from "@/components/JogosLista";
import { MercadoChips } from "@/components/MercadoChips";
import { Panel, Field, Tag } from "@/components/ui";

const MERCADOS_JOGADOR = MERCADOS.filter((m) => m.nivel === "jogador");

export default function PosJogo() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaId, setLigaId] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [linha, setLinha] = useState("1.5");
  const [result, setResult] = useState<ResultadoReal | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getLigas().then(setLigas).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!ligaId) return;
    setJogos([]); setJogoSel(null); setResult(null); setErro(""); setLoadingJogos(true);
    getJogos(ligaId, "finished")
      .then(setJogos)
      .catch((e) => setErro(e.message))
      .finally(() => setLoadingJogos(false));
  }, [ligaId]);

  function voltar() {
    setJogoSel(null); setResult(null); setErro("");
  }

  async function conferir() {
    if (!jogoSel) return;
    setErro(""); setResult(null); setLoading(true);
    try {
      setResult(await getResultado(String(jogoSel.id), marketKey, Number(linha)));
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  const linhas = result ? Object.entries(result) : [];
  const acertos = linhas.filter(([, r]) => r.bateu).length;
  const mercado = MERCADOS.find((m) => m.key === marketKey)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LigaRail ligas={ligas} ativa={ligaId} onSelect={setLigaId} />
      </aside>

      <div className="min-w-0">
        {!jogoSel ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="display text-2xl font-extrabold leading-none text-fg">conferir resultado</h1>
              <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
                o jogo acabou — veja por jogador o <span className="text-cyan">valor real</span> do stat e se
                bateu a linha. escolha a liga, depois o jogo finalizado.
              </p>
            </div>
            {erro && <ErroBox msg={erro} />}
            {!ligaId ? (
              <Vazio titulo="escolha uma liga" texto="selecione uma liga à esquerda para ver os jogos finalizados." />
            ) : loadingJogos ? (
              <p className="mono text-sm text-cyan">carregando jogos<span className="blink">_</span></p>
            ) : (
              <JogosLista jogos={jogos} variante="pos" onSelect={setJogoSel} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button onClick={voltar} className="overline self-start transition-colors hover:text-fg">
              ‹ voltar aos jogos
            </button>

            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <h1 className="display text-2xl font-extrabold leading-none text-fg">
                {jogoSel.mandante}{" "}
                {jogoSel.placar ? <span className="text-value">{jogoSel.placar}</span> : <span className="text-faint">×</span>}{" "}
                {jogoSel.visitante}
              </h1>
              {horaLocal(jogoSel.data) && <span className="overline">finalizado</span>}
            </div>

            <Panel title="mercado">
              <div className="flex flex-col gap-3.5">
                <MercadoChips mercados={MERCADOS_JOGADOR} ativo={marketKey} onSelect={setMarketKey} />
                <Field label="linha">
                  <input className="input" value={linha} onChange={(e) => setLinha(e.target.value)} />
                </Field>
                <button onClick={conferir} disabled={loading} className="btn w-full justify-center">
                  {loading ? "conferindo…" : "▸ conferir"}
                </button>
                {erro && <ErroBox msg={erro} />}
              </div>
            </Panel>

            {loading && (
              <Panel className="grid min-h-[200px] place-items-center">
                <p className="mono text-sm text-cyan">buscando resultado real<span className="blink">_</span></p>
              </Panel>
            )}

            {result && (
              <Panel
                title={`${mercado.label} · linha ${linha}`}
                glow
                badge={<Tag tone={acertos ? "value" : "muted"}>{acertos}/{linhas.length} bateram</Tag>}
              >
                {linhas.length === 0 ? (
                  <p className="px-1 py-3 text-[0.74rem] text-muted">sem dados de jogadores para esse mercado/linha.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-[1fr_5rem_6rem] gap-3 px-3">
                      <span className="overline">jogador</span>
                      <span className="overline text-right">valor real</span>
                      <span className="overline text-right">linha {linha}</span>
                    </div>
                    {linhas.map(([pid, r]) => (
                      <div
                        key={pid}
                        className="reveal grid grid-cols-[1fr_5rem_6rem] items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5"
                      >
                        <span className="mono truncate text-[0.8rem] text-fg">{pid}</span>
                        <span className="mono text-right text-sm font-semibold tabular-nums text-fg">{r.valor_real}</span>
                        <span className="text-right">
                          {r.bateu ? <Tag tone="value">✓ bateu</Tag> : <Tag tone="muted">não</Tag>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">✓</div>
        <p className="display mt-3 text-lg font-bold text-muted">{titulo}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{texto}</p>
      </div>
    </Panel>
  );
}

function ErroBox({ msg }: { msg: string }) {
  return (
    <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
      erro: {msg}
    </p>
  );
}
```

- [ ] **Step 2: Verificar build**

Run:
```bash
npm run build
```
Expected: build sem erros.

- [ ] **Step 3: Verificação visual (app rodando)**

Abrir `http://localhost:3000/pos`. Confirmar:
- trilho de ligas → lista de jogos finalizados agrupados por dia, com placar no card;
- clicar num jogo → detalhe com chips (só mercados de jogador), linha, conferir;
- conferir mostra tabela de valor real / bateu;
- `‹ voltar aos jogos` retorna à lista.

- [ ] **Step 4: Commit**

```bash
git add app/pos/page.tsx
git commit -m "feat: pós-jogo browse-first (lista de finalizados + conferir)"
```

---

## Task 8: Verificação final

- [ ] **Step 1: Lint + testes + build limpos**

Run:
```bash
npm run lint && npm test && npm run build
```
Expected: lint sem erros, testes PASS, build OK.

- [ ] **Step 2: Smoke ponta-a-ponta**

Com backend (3001) e front (3000) no ar, percorrer pré-jogo (liga → jogo → mercado jogador → analisar → voltar) e pós-jogo (liga → finalizado → conferir). Sem erros no console.

---

## Notas de execução

- `lib/api.ts` e `lib/types.ts` **não devem ser tocados** — se algum passo parecer exigir mudança neles, parar e revisar o spec.
- Componentes novos não levam `"use client"`: são renderizados dentro de páginas que já são client e só recebem props/handlers.
- Tema/cores vêm de `globals.css` — usar só classes/variáveis já existentes (`text-value`, `border-line`, `overline`, `panel`, `btn`, `input`, etc.).
