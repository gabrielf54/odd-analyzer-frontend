# Redesign do fluxo odds/análise — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o fluxo de análise do front em 3 colunas (ligas · jogos · conteúdo), dividir a tela do jogo em abas Etapa 1 (odds) / Etapa 2 (análise), com tela investigativa de odds editável e ícone da casa (book) em toda parte.

**Architecture:** Extrair o god-component `app/page.tsx` em componentes focados. Lógica pura vai pra `lib/` (testável com Vitest); componentes React são finos e verificados por `typecheck`/`build`. Backend intocado — edição reusa `POST /odds` (upsert) e `DELETE /odds` (com filtro).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, Vitest 4 (só lógica pura — não há @testing-library).

**Spec:** `docs/superpowers/specs/2026-06-14-redesign-fluxo-odds-analise-design.md`

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `lib/types.ts` | tipos do fio | Modificar — `Candidate` ganha `book`, `casas_comparadas` |
| `lib/bookMeta.ts` | mapa book → sigla/cor | Criar |
| `lib/bookMeta.test.ts` | teste do mapa | Criar |
| `components/BookBadge.tsx` | pílula da casa | Criar |
| `lib/api.ts` | fetch único | Modificar — `saveOdd`, `removeOdd` |
| `lib/api.test.ts` | teste dos helpers | Criar |
| `lib/oddsTable.ts` | filtro/opções da tabela | Criar |
| `lib/oddsTable.test.ts` | teste do filtro | Criar |
| `components/OddsTable.tsx` | tela investigativa + edição | Criar |
| `components/MatchRail.tsx` | coluna 2 (jogos) | Criar |
| `components/GameDetail.tsx` | estado do jogo + 2 abas | Criar (extrai de page.tsx) |
| `app/page.tsx` | shell de 3 colunas | Modificar (encolhe) |
| `components/RecommendationCard.tsx` | recomendação | Modificar — BookBadge |
| `components/CandidatesByPlayer.tsx` | candidatos | Modificar — BookBadge |
| `components/PlayerDetailDrawer.tsx` | drawer | Modificar — BookBadge |

---

## Task 1: Tipo Candidate ganha `book` e `casas_comparadas`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Localizar a interface `Candidate`**

Run: `grep -n "casas_comparadas\|interface Candidate\|book" lib/types.ts`
Expected: encontra `interface Candidate` (e confirma que `book`/`casas_comparadas` ainda NÃO existem nela).

- [ ] **Step 2: Adicionar os campos**

No corpo de `interface Candidate`, adicionar:

```ts
  book?: string | null;
  casas_comparadas?: { book: string; odd_over: number }[];
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (sem novos erros).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): Candidate carrega book e casas_comparadas (ja vem do backend)"
```

---

## Task 2: `lib/bookMeta.ts` (mapa da casa) — TDD

**Files:**
- Create: `lib/bookMeta.ts`
- Test: `lib/bookMeta.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/bookMeta.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bookMeta } from "./bookMeta";

describe("bookMeta", () => {
  it("kto vira sigla KTO", () => {
    expect(bookMeta("kto").sigla).toBe("KTO");
  });
  it("betnacional vira sigla BET", () => {
    expect(bookMeta("betnacional").sigla).toBe("BET");
  });
  it("manual vira sigla MAN", () => {
    expect(bookMeta("manual").sigla).toBe("MAN");
  });
  it("casa desconhecida usa 3 primeiras letras maiusculas", () => {
    expect(bookMeta("superbet").sigla).toBe("SUP");
  });
  it("null/undefined cai em manual", () => {
    expect(bookMeta(null).sigla).toBe("MAN");
    expect(bookMeta(undefined).sigla).toBe("MAN");
  });
  it("entrada e case-insensitive e ignora espacos", () => {
    expect(bookMeta(" KTO ").sigla).toBe("KTO");
  });
  it("toda casa tem classes de cor (dot e text)", () => {
    expect(bookMeta("kto").dotClass).toBeTruthy();
    expect(bookMeta("kto").textClass).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/bookMeta.test.ts`
Expected: FAIL ("Cannot find module './bookMeta'").

- [ ] **Step 3: Implementar**

Criar `lib/bookMeta.ts`:

```ts
export interface BookMeta {
  sigla: string;   // "KTO", "BET", "MAN"
  label: string;   // nome legivel
  dotClass: string;  // classe Tailwind do ponto/fundo
  textClass: string; // classe Tailwind do texto
}

const KNOWN: Record<string, BookMeta> = {
  kto:         { sigla: "KTO", label: "KTO",         dotClass: "bg-[#25e08a]", textClass: "text-[#25e08a]" },
  betnacional: { sigla: "BET", label: "Betnacional", dotClass: "bg-[#3b9dff]", textClass: "text-[#3b9dff]" },
  manual:      { sigla: "MAN", label: "Manual",      dotClass: "bg-[#8a8a8a]", textClass: "text-[#8a8a8a]" },
};

/** Mapeia o nome da casa para sigla + cores. Fallback p/ casa desconhecida:
 *  3 primeiras letras + cinza neutro. null/undefined => manual. */
export function bookMeta(book?: string | null): BookMeta {
  const key = (book ?? "manual").trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  const sigla = key.slice(0, 3).toUpperCase() || "MAN";
  return { sigla, label: key || "manual", dotClass: "bg-[#8a8a8a]", textClass: "text-[#8a8a8a]" };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/bookMeta.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/bookMeta.ts lib/bookMeta.test.ts
git commit -m "feat(book): mapa bookMeta (sigla+cor por casa) com fallback"
```

---

## Task 3: `components/BookBadge.tsx`

**Files:**
- Create: `components/BookBadge.tsx`

- [ ] **Step 1: Implementar o componente**

Criar `components/BookBadge.tsx`:

```tsx
import { bookMeta } from "@/lib/bookMeta";

/** Pilula da casa de aposta. Usa o mapa central bookMeta. */
export function BookBadge({ book, size = "sm" }: { book?: string | null; size?: "sm" | "md" }) {
  const m = bookMeta(book);
  const pad = size === "md" ? "px-2 py-0.5 text-[0.7rem]" : "px-1.5 py-px text-[0.6rem]";
  return (
    <span
      title={m.label}
      className={`inline-flex items-center gap-1 rounded-sm border border-line ${pad} ${m.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dotClass}`} />
      {m.sigla}
    </span>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/BookBadge.tsx
git commit -m "feat(book): componente BookBadge (pilula da casa)"
```

---

## Task 4: `lib/api.ts` — `saveOdd` + `removeOdd` — TDD

**Files:**
- Modify: `lib/api.ts`
- Test: `lib/api.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveOdd, removeOdd } from "./api";

function mockFetchOk() {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ salvas: 1, linhas_rejeitadas: [] }) }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("saveOdd", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("faz POST /odds com a linha num lote de 1", async () => {
    const fn = mockFetchOk();
    await saveOdd("evt1", { market_type: "sot", entidade: "Saka", linha: 0.5, odd_over: 1.9, odd_under: 1.9, book: "kto" });
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/odds$/);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.event_id).toBe("evt1");
    expect(body.odds).toHaveLength(1);
    expect(body.odds[0].entidade).toBe("Saka");
    expect(typeof body.coletado_em).toBe("string");
  });
});

describe("removeOdd", () => {
  beforeEach(() => vi.unstubAllGlobals());
  it("faz DELETE /jogos/:id/odds com filtro na querystring", async () => {
    const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fn);
    await removeOdd("evt1", { entidade: "Saka", market_type: "sot", linha: 0.5, book: "kto" });
    const [url, init] = fn.mock.calls[0];
    expect(init.method).toBe("DELETE");
    const u = String(url);
    expect(u).toContain("/jogos/evt1/odds?");
    expect(u).toContain("entidade=Saka");
    expect(u).toContain("market_type=sot");
    expect(u).toContain("linha=0.5");
    expect(u).toContain("book=kto");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/api.test.ts`
Expected: FAIL ("saveOdd is not exported" / não existe).

- [ ] **Step 3: Implementar**

Em `lib/api.ts`, depois de `deleteOdds` (linha ~71), adicionar:

```ts
// Upsert de UMA odd (editar valor OU adicionar linha). Mesma PK
// (entidade,market_type,linha,book) => o backend sobrescreve.
export const saveOdd = (eventId: string | number, line: ManualOddsLine) =>
  saveOdds({ event_id: String(eventId), coletado_em: new Date().toISOString(), odds: [line] });

// Remove UMA odd via filtro na querystring (DELETE /jogos/:id/odds).
export const removeOdd = (
  eventId: string | number,
  filter: { entidade: string; market_type: string; linha: number; book: string },
) => {
  const qs = new URLSearchParams({
    entidade: filter.entidade,
    market_type: filter.market_type,
    linha: String(filter.linha),
    book: filter.book,
  });
  return req<{ ok: true }>(`/jogos/${eventId}/odds?${qs.toString()}`, { method: "DELETE" });
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/api.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts lib/api.test.ts
git commit -m "feat(api): saveOdd (upsert 1 linha) + removeOdd (DELETE com filtro)"
```

---

## Task 5: `lib/oddsTable.ts` (filtro/opções) — TDD

**Files:**
- Create: `lib/oddsTable.ts`
- Test: `lib/oddsTable.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/oddsTable.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterOdds, marketOptions, bookOptions } from "./oddsTable";
import type { OddsRow } from "./types";

const rows: OddsRow[] = [
  { event_id: "e", entidade: "Saka",    market_type: "sot",      linha: 0.5, odd_over: 1.9, odd_under: 1.9, book: "kto" },
  { event_id: "e", entidade: "Saka",    market_type: "sot",      linha: 1.5, odd_over: 3.4, odd_under: 1.3, book: "betnacional" },
  { event_id: "e", entidade: "Rodri",   market_type: "desarmes", linha: 1.5, odd_over: 1.8, odd_under: 1.9, book: "kto" },
  { event_id: "e", entidade: "partida", market_type: "escanteios", linha: 9.5, odd_over: 1.9, odd_under: 1.9, book: "kto" },
];

describe("marketOptions / bookOptions", () => {
  it("lista mercados unicos ordenados", () => {
    expect(marketOptions(rows)).toEqual(["desarmes", "escanteios", "sot"]);
  });
  it("lista casas unicas ordenadas", () => {
    expect(bookOptions(rows)).toEqual(["betnacional", "kto"]);
  });
});

describe("filterOdds", () => {
  it("sem filtro devolve tudo", () => {
    expect(filterOdds(rows, { markets: [], books: [], search: "" })).toHaveLength(4);
  });
  it("filtra por mercado", () => {
    expect(filterOdds(rows, { markets: ["sot"], books: [], search: "" })).toHaveLength(2);
  });
  it("filtra por casa", () => {
    expect(filterOdds(rows, { markets: [], books: ["kto"], search: "" })).toHaveLength(3);
  });
  it("busca por entidade e case-insensitive", () => {
    expect(filterOdds(rows, { markets: [], books: [], search: "saka" })).toHaveLength(2);
  });
  it("combina mercado + casa + busca (AND)", () => {
    expect(filterOdds(rows, { markets: ["sot"], books: ["kto"], search: "saka" })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/oddsTable.test.ts`
Expected: FAIL ("Cannot find module './oddsTable'").

- [ ] **Step 3: Implementar**

Criar `lib/oddsTable.ts`:

```ts
import type { OddsRow } from "./types";

export interface OddsFilters {
  markets: string[]; // vazio = todos
  books: string[];   // vazio = todas
  search: string;    // busca por entidade
}

export const marketOptions = (rows: OddsRow[]): string[] =>
  [...new Set(rows.map((r) => r.market_type))].sort();

export const bookOptions = (rows: OddsRow[]): string[] =>
  [...new Set(rows.map((r) => r.book))].sort();

export function filterOdds(rows: OddsRow[], f: OddsFilters): OddsRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.markets.length && !f.markets.includes(r.market_type)) return false;
    if (f.books.length && !f.books.includes(r.book)) return false;
    if (q && !r.entidade.toLowerCase().includes(q)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/oddsTable.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/oddsTable.ts lib/oddsTable.test.ts
git commit -m "feat(odds): filtro/opcoes puros da tela investigativa de odds"
```

---

## Task 6: `components/OddsTable.tsx` (tela investigativa + edição)

**Files:**
- Create: `components/OddsTable.tsx`

Dependências já prontas: `getOdds`, `saveOdd`, `removeOdd` (api), `filterOdds`/`marketOptions`/`bookOptions` (oddsTable), `BookBadge`, `OddsRow` (types), `ErrorBox`/`Tag` (ui), `marketNoun` (detailText), `lineLabel` (format).

- [ ] **Step 1: Implementar o componente**

Criar `components/OddsTable.tsx`:

```tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { getOdds, saveOdd, removeOdd } from "@/lib/api";
import { filterOdds, marketOptions, bookOptions } from "@/lib/oddsTable";
import type { OddsFilters } from "@/lib/oddsTable";
import type { OddsRow, ManualOddsLine } from "@/lib/types";
import { BookBadge } from "@/components/BookBadge";
import { Tag, ErrorBox } from "@/components/ui";
import { marketNoun } from "@/lib/detailText";

const blank = (): ManualOddsLine => ({ market_type: "", entidade: "", linha: 0.5, odd_over: 0, odd_under: null, book: "manual" });

export function OddsTable({ eventId, onChange }: { eventId: string; onChange?: () => void }) {
  const [rows, setRows] = useState<OddsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OddsFilters>({ markets: [], books: [], search: "" });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [adding, setAdding] = useState<ManualOddsLine | null>(null);

  const keyOf = (r: OddsRow) => `${r.entidade}|${r.market_type}|${r.linha}|${r.book}`;

  async function load() {
    setLoading(true); setError("");
    try { setRows(await getOdds(eventId)); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao carregar odds"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);

  const markets = useMemo(() => marketOptions(rows), [rows]);
  const books = useMemo(() => bookOptions(rows), [rows]);
  const shown = useMemo(() => filterOdds(rows, filters), [rows, filters]);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  async function commitEdit(r: OddsRow, odd_over: number, odd_under: number | null) {
    setError("");
    if (!(odd_over > 1.01)) { setError("odd_over deve ser > 1.01"); return; }
    try {
      await saveOdd(eventId, { market_type: r.market_type, entidade: r.entidade, linha: r.linha, odd_over, odd_under, book: r.book });
      setEditKey(null); await load(); onChange?.();
    } catch (e) { setError(e instanceof Error ? e.message : "erro ao salvar"); }
  }
  async function commitAdd(l: ManualOddsLine) {
    setError("");
    if (!l.market_type || !l.entidade) { setError("preencha mercado e entidade"); return; }
    if (!(l.odd_over > 1.01)) { setError("odd_over deve ser > 1.01"); return; }
    try { await saveOdd(eventId, l); setAdding(null); await load(); onChange?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao adicionar"); }
  }
  async function remove(r: OddsRow) {
    setError("");
    try { await removeOdd(eventId, { entidade: r.entidade, market_type: r.market_type, linha: r.linha, book: r.book }); await load(); onChange?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao remover"); }
  }

  if (loading) return <p className="mono text-xs text-muted">carregando odds…</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {markets.map((m) => (
          <button key={m} onClick={() => setFilters((f) => ({ ...f, markets: toggle(f.markets, m) }))}
            className={`rounded-sm border px-2 py-0.5 text-[0.66rem] ${filters.markets.includes(m) ? "border-value/50 text-value" : "border-line text-faint"}`}>
            {marketNoun(m)}
          </button>
        ))}
        <span className="mx-1 text-faint">·</span>
        {books.map((b) => (
          <button key={b} onClick={() => setFilters((f) => ({ ...f, books: toggle(f.books, b) }))}
            className={`rounded-sm border px-2 py-0.5 text-[0.66rem] ${filters.books.includes(b) ? "border-value/50 text-value" : "border-line text-faint"}`}>
            <BookBadge book={b} />
          </button>
        ))}
      </div>
      <input className="input" placeholder="🔎 buscar jogador / partida"
        value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />

      {error && <ErrorBox msg={error} />}

      <div className="flex items-center justify-between text-[0.66rem] text-faint">
        <span>{shown.length} de {rows.length} odds</span>
        <button className="text-value" onClick={() => setAdding(blank())}>＋ adicionar odd</button>
      </div>

      {adding && (
        <AddRow line={adding} onCancel={() => setAdding(null)} onSave={commitAdd} markets={markets} />
      )}

      <div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-sm border border-line">
        <table className="w-full border-collapse text-[0.7rem]">
          <thead className="sticky top-0 bg-panel-2 text-faint">
            <tr>
              <th className="px-2 py-1 text-left">entidade</th>
              <th className="px-1 py-1 text-left">mercado</th>
              <th className="px-1 py-1 text-right">linha</th>
              <th className="px-1 py-1 text-right">over</th>
              <th className="px-1 py-1 text-right">under</th>
              <th className="px-1 py-1 text-left">casa</th>
              <th className="px-1 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Row key={keyOf(r)} r={r} editing={editKey === keyOf(r)}
                onEdit={() => setEditKey(keyOf(r))} onCancel={() => setEditKey(null)}
                onSave={(ov, un) => commitEdit(r, ov, un)} onRemove={() => remove(r)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ r, editing, onEdit, onCancel, onSave, onRemove }: {
  r: OddsRow; editing: boolean; onEdit: () => void; onCancel: () => void;
  onSave: (over: number, under: number | null) => void; onRemove: () => void;
}) {
  const [over, setOver] = useState(String(r.odd_over));
  const [under, setUnder] = useState(r.odd_under == null ? "" : String(r.odd_under));
  return (
    <tr className="border-t border-line-soft">
      <td className="px-2 py-1">{r.entidade}</td>
      <td className="px-1 py-1 text-muted">{r.market_type}</td>
      <td className="px-1 py-1 text-right">{r.linha}</td>
      <td className="px-1 py-1 text-right">
        {editing ? <input className="input w-14 px-1 py-0 text-right" value={over} onChange={(e) => setOver(e.target.value)} /> : r.odd_over}
      </td>
      <td className="px-1 py-1 text-right">
        {editing ? <input className="input w-14 px-1 py-0 text-right" value={under} onChange={(e) => setUnder(e.target.value)} /> : (r.odd_under ?? "—")}
      </td>
      <td className="px-1 py-1"><BookBadge book={r.book} /></td>
      <td className="px-1 py-1 text-right whitespace-nowrap">
        {editing ? (
          <>
            <button className="text-value" onClick={() => onSave(Number(over), under === "" ? null : Number(under))}>✓</button>
            <button className="ml-2 text-faint" onClick={onCancel}>✕</button>
          </>
        ) : (
          <>
            <button className="text-faint hover:text-fg" title="editar" onClick={onEdit}>✎</button>
            <button className="ml-2 text-faint hover:text-bad" title="remover" onClick={onRemove}>🗑</button>
          </>
        )}
      </td>
    </tr>
  );
}

function AddRow({ line, markets, onCancel, onSave }: {
  line: ManualOddsLine; markets: string[]; onCancel: () => void; onSave: (l: ManualOddsLine) => void;
}) {
  const [l, setL] = useState<ManualOddsLine>(line);
  const set = (patch: Partial<ManualOddsLine>) => setL((x) => ({ ...x, ...patch }));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-sm border border-value/40 bg-panel-2 p-2 text-[0.7rem] sm:grid-cols-4">
      <input className="input" placeholder="entidade" value={l.entidade} onChange={(e) => set({ entidade: e.target.value })} />
      <input className="input" placeholder="mercado" list="mkts" value={l.market_type} onChange={(e) => set({ market_type: e.target.value })} />
      <datalist id="mkts">{markets.map((m) => <option key={m} value={m} />)}</datalist>
      <input className="input" placeholder="linha" value={String(l.linha ?? "")} onChange={(e) => set({ linha: Number(e.target.value) })} />
      <input className="input" placeholder="casa" value={l.book} onChange={(e) => set({ book: e.target.value })} />
      <input className="input" placeholder="odd over" value={l.odd_over ? String(l.odd_over) : ""} onChange={(e) => set({ odd_over: Number(e.target.value) })} />
      <input className="input" placeholder="odd under" value={l.odd_under == null ? "" : String(l.odd_under)} onChange={(e) => set({ odd_under: e.target.value === "" ? null : Number(e.target.value) })} />
      <button className="btn" onClick={() => onSave(l)}>salvar</button>
      <button className="text-faint" onClick={onCancel}>cancelar</button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Se `marketNoun` não aceitar string crua, usar `String(m)`.)

- [ ] **Step 3: Commit**

```bash
git add components/OddsTable.tsx
git commit -m "feat(odds): OddsTable investigativa (tabela densa, filtros, editar/add/remover)"
```

---

## Task 7: `components/MatchRail.tsx` (coluna 2 — jogos)

**Files:**
- Create: `components/MatchRail.tsx`
- Read first: `components/MatchList.tsx`, `components/MatchCard.tsx` (para reusar formatação de hora/label)

- [ ] **Step 1: Implementar (coluna estreita vertical)**

Criar `components/MatchRail.tsx`. Reusa a lógica de exibição do `MatchCard` num formato compacto de coluna:

```tsx
"use client";
import type { Match } from "@/lib/types";
import { matchTime } from "@/lib/date";

export function MatchRail({ matches, activeId, onSelect, loading, empty }: {
  matches: Match[]; activeId: string | null; onSelect: (m: Match) => void; loading: boolean; empty: string;
}) {
  if (loading) return <p className="mono px-2 py-3 text-[0.7rem] text-muted">carregando jogos…</p>;
  if (!matches.length) return <p className="px-2 py-3 text-[0.72rem] text-faint">{empty}</p>;
  return (
    <div className="flex max-h-[calc(100vh-9rem)] flex-col gap-0.5 overflow-y-auto pr-1">
      {matches.map((m) => {
        const active = String(m.id) === activeId;
        const t = matchTime(m);
        return (
          <button key={m.id} onClick={() => onSelect(m)}
            className={`shrink-0 rounded-sm border-l-2 px-2 py-1.5 text-left ${active ? "border-value bg-panel-2 text-fg" : "border-transparent text-muted hover:bg-panel"}`}>
            <span className="mono block text-[0.62rem] text-faint">{t ?? "—"}</span>
            <span className="display block truncate text-[0.78rem] font-semibold">{m.home} <span className="text-faint">×</span> {m.away}</span>
          </button>
        );
      })}
    </div>
  );
}
```

> **Atenção:** confirmar os nomes reais dos campos de `Match` (`id`, `home`, `away`) e a função de hora em `lib/date.ts` ao ler os arquivos no Step 0. Ajustar `matchTime`/`m.home` ao que existir (em `MatchCard.tsx`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/MatchRail.tsx
git commit -m "feat(layout): MatchRail (coluna de jogos da liga selecionada)"
```

---

## Task 8: `components/GameDetail.tsx` (extrai a tela do jogo de page.tsx, com 2 abas)

**Files:**
- Create: `components/GameDetail.tsx`
- Read first: `app/page.tsx` (função `Detail`, ~linha 174-428, e os blocos `AutoCollect`/`PromptCopier`/`BatchSummaryBar`)

Esta task MOVE o conteúdo do `Detail` para `GameDetail`, dividido em duas abas. Nenhum comportamento muda — só a organização.

- [ ] **Step 1: Criar o esqueleto com abas**

Criar `components/GameDetail.tsx` com:
- Toda a lógica de estado hoje em `Detail` (paste, batch, stored/result, loading, error, detail, collecting/collectInfo, semMatch, fase).
- Um estado novo `const [aba, setAba] = useState<"odds" | "analise">("odds")`.
- Header do jogo (igual ao atual) + barra de abas:

```tsx
<div className="flex items-stretch border-b border-line">
  {(["odds", "analise"] as const).map((t) => (
    <button key={t} onClick={() => setAba(t)}
      className={`relative px-4 py-2 text-[0.72rem] ${aba === t ? "text-value" : "text-faint hover:text-muted"}`}>
      {aba === t && <span className="absolute inset-x-0 top-0 h-[2px] bg-value" />}
      {t === "odds" ? "Etapa 1 · Odds" : "Etapa 2 · Análise"}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Aba ODDS — mover os blocos de coleta + OddsTable**

Quando `aba === "odds"`, renderizar (movidos do `Detail` atual):
- `AutoCollect` (passo 1 — botão obter odds automático).
- `PromptCopier` (alternativa manual).
- Bloco de colar odds (textarea + adicionar ao lote + analisar).
- **NOVO:** `<OddsTable eventId={String(match.id)} onChange={refetchLoteResumo} />` para investigar/editar o que está no banco.

Após `analyze()` rodar com sucesso, fazer `setAba("analise")` (leva o usuário pro resultado).

- [ ] **Step 3: Aba ANÁLISE — mover os blocos de resultado**

Quando `aba === "analise"`, renderizar (movidos do `Detail` atual):
- `BatchSummaryBar` (resumo + editar/re-analisar — "editar" volta `setAba("odds")`).
- `SemMatchPanel`, `RecommendationCard`, `CandidatesByPlayer`, RejectedLines, `DiagnosticsPanel`, `PlayerDetailDrawer`.
- Empty-state quando não há `result`:

```tsx
{!result && !loading && (
  <p className="mono py-10 text-center text-xs text-muted">rode a análise na <strong className="text-value">Etapa 1 · Odds</strong>.</p>
)}
```

- [ ] **Step 4: Trocar a assinatura para o page.tsx consumir**

`export function GameDetail({ match, onBack, ...cacheProps }: GameDetailProps)`. Manter os mesmos props de cache de aba que o `Detail` recebia (para `GameTabs` não quebrar).

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS (build do Next compila a página).

- [ ] **Step 6: Commit**

```bash
git add components/GameDetail.tsx
git commit -m "feat(jogo): GameDetail com abas Etapa1 Odds / Etapa2 Analise (extrai de page.tsx)"
```

---

## Task 9: `app/page.tsx` — shell de 3 colunas

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Reescrever o layout para 3 colunas**

Substituir o container atual (`[sidebar][main]`) por três colunas:

```tsx
<div className="flex gap-3">
  <aside className="w-[90px] shrink-0"><LeagueRail .../></aside>
  <aside className="w-[150px] shrink-0">
    <MatchRail matches={matches} activeId={activeMatchId} onSelect={openMatch}
      loading={matchesLoading} empty={leagueId ? "sem jogos" : "escolha uma liga"} />
  </aside>
  <section className="min-w-0 flex-1">
    <GameTabs ... />
    {activeMatch
      ? <GameDetail match={activeMatch} onBack={closeMatch} ...cacheProps />
      : <p className="mono py-10 text-center text-xs text-muted">escolha um jogo na coluna ao lado.</p>}
  </section>
</div>
```

- [ ] **Step 2: Remover a antiga `Browse` (lista de jogos em largura cheia)**

Os jogos agora vivem na coluna 2 (`MatchRail`). Remover o componente/branch `Browse` e o `Detail` interno (agora em `GameDetail`). Manter os estados de fetch de ligas/jogos e a navegação por URL (`useUrlState`).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(layout): 3 colunas fixas (ligas | jogos | conteudo); page vira shell"
```

---

## Task 10: BookBadge na Etapa 2 (recomendação, candidatos, drawer)

**Files:**
- Modify: `components/RecommendationCard.tsx`
- Modify: `components/CandidatesByPlayer.tsx`
- Modify: `components/PlayerDetailDrawer.tsx`

- [ ] **Step 1: RecommendationCard — mostrar a casa da aposta**

Importar `BookBadge` e, na linha do nome/odd (após `@ {best.odd}`), adicionar `{best.book && <BookBadge book={best.book} size="md" />}`.

- [ ] **Step 2: CandidatesByPlayer — casa por linha**

Importar `BookBadge` e, na linha de cada candidato (perto de `@ {c.odd}`), adicionar `{c.book && <BookBadge book={c.book} />}`.

- [ ] **Step 3: PlayerDetailDrawer — casa no header**

Importar `BookBadge` e exibir `{c.book && <BookBadge book={c.book} size="md" />}` no cabeçalho do drawer (perto da odd).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/RecommendationCard.tsx components/CandidatesByPlayer.tsx components/PlayerDetailDrawer.tsx
git commit -m "feat(book): BookBadge na recomendacao, candidatos e drawer"
```

---

## Task 11: Verificação final + integração

- [ ] **Step 1: Suíte completa**

Run: `npm test`
Expected: PASS (incl. bookMeta, api, oddsTable, format).

- [ ] **Step 2: Typecheck + build limpos**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sem erros novos (warnings pré-existentes tolerados).

- [ ] **Step 4: Smoke manual (dev)**

Run: `npm run dev` e abrir o app. Conferir: 3 colunas; selecionar liga enche jogos; abrir jogo mostra abas; Etapa 1 tem coleta + OddsTable (carrega/edita/add/remove); analisar leva pra Etapa 2 com BookBadge na recomendação/candidatos.

- [ ] **Step 5: Decidir integração**

Usar superpowers:finishing-a-development-branch (merge em main ou PR).

---

## Self-Review (cobertura do spec)

- §1 ícone da casa → Tasks 2,3,10 (BookBadge em odds + recomendação/candidatos/drawer). ✓
- §2 layout 3 colunas → Tasks 7,9 (MatchRail + shell). ✓
- §3 abas Etapa1/Etapa2 → Task 8 (GameDetail). ✓
- §4 tela investigativa + edição → Tasks 4,5,6 (api saveOdd/removeOdd + oddsTable + OddsTable). ✓
- §5 backend sem endpoint novo → confirmado no spec; nenhuma task de backend (só reuso). ✓
- §6 testes → Tasks 2,4,5 (TDD puro) + Task 11 (suíte/build). ✓

Sem placeholders. Tipos consistentes (`OddsFilters`, `bookMeta`, `saveOdd`/`removeOdd`, `BookBadge` usados igual entre tasks).
