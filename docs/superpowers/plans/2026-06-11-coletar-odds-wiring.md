# Wiring de odds persistidas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Tela Coletar lê/grava/apaga odds no banco (tabela `odds`); abrir o jogo carrega as odds da tabela.

**Architecture:** Aditivo. `api.ts` ganha `getOdds/saveOdds/deleteOdds`; mapper puro `oddsRowsToBatch`; `Detail` hidrata do banco no mount (fallback localStorage), persiste ao adicionar, apaga ao limpar. `analyze()` inalterado.

**Tech Stack:** Next 16, React 19, TS, Vitest.

Spec: `docs/superpowers/specs/2026-06-11-coletar-odds-wiring-design.md`. Backend já entregue.

---

### Task 1: Tipo `OddsRow` + API

**Files:** Modify `lib/types.ts`, `lib/api.ts`

- [ ] **Step 1: `lib/types.ts`** — adicionar ao fim da seção de coleta manual:

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

- [ ] **Step 2: `lib/api.ts`** — importar `OddsRow` e `LinhaRejeitada` no bloco de tipos e adicionar as três funções após `postAnalyzeManual`:

```ts
// ───── Odds persistidas (tabela = fonte de verdade) ─────
export const getOdds = (eventId: string | number) =>
  req<OddsRow[]>(`/jogos/${eventId}/odds`);

export const saveOdds = (body: ManualAnalyzeBody) =>
  req<{ salvas: number; linhas_rejeitadas: LinhaRejeitada[] }>("/odds", { method: "POST", body: JSON.stringify(body) });

export const deleteOdds = (eventId: string | number) =>
  req<{ ok: true }>(`/jogos/${eventId}/odds`, { method: "DELETE" });
```

(O import de tipos no topo passa a incluir `OddsRow, LinhaRejeitada`.)

- [ ] **Step 3: typecheck rápido** — `npx tsc --noEmit` (ou confiar no build na Task 4). Esperado: sem erro novo.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/api.ts
git commit -m "feat: api getOdds/saveOdds/deleteOdds + tipo OddsRow"
```

---

### Task 2: Mapper puro `oddsRowsToBatch` (TDD)

**Files:** Create `lib/oddsRows.ts`, `lib/oddsRows.test.ts`

- [ ] **Step 1: Teste que falha** (`lib/oddsRows.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { oddsRowsToBatch } from "./oddsRows";
import type { OddsRow } from "./types";

describe("oddsRowsToBatch", () => {
  it("mapeia OddsRow[] do banco para ManualOddsLine[] (sem event_id/coletado_em)", () => {
    const rows: OddsRow[] = [
      { event_id: "e1", entidade: "CR7", market_type: "sot", linha: 0.5, odd_over: 1.5, odd_under: null, book: "bet365", coletado_em: "2026-06-11T00:00:00Z" },
    ];
    expect(oddsRowsToBatch(rows)).toEqual([
      { market_type: "sot", entidade: "CR7", linha: 0.5, odd_over: 1.5, odd_under: null, book: "bet365" },
    ]);
  });

  it("vazio → vazio", () => {
    expect(oddsRowsToBatch([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- oddsRows`. Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar** (`lib/oddsRows.ts`):

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

- [ ] **Step 4: Rodar e ver passar** — `npm test -- oddsRows`. Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/oddsRows.ts lib/oddsRows.test.ts
git commit -m "feat: mapper puro oddsRowsToBatch (banco -> lote)"
```

---

### Task 3: `Detail` lê/grava/apaga no banco

**Files:** Modify `app/page.tsx`

- [ ] **Step 1: imports** — adicionar `getOdds, saveOdds, deleteOdds` ao import de `@/lib/api` e `oddsRowsToBatch` de `@/lib/oddsRows`.

- [ ] **Step 2: hidratação DB-primeiro** — trocar o `useEffect` de mount do `Detail`:

```tsx
  // Abrir o jogo carrega as odds do BANCO (fonte de verdade); localStorage é fallback offline.
  useEffect(() => {
    let vivo = true;
    setStored(loadResult(eventId));
    getOdds(eventId)
      .then((rows) => {
        if (!vivo) return;
        if (rows.length) { const b = oddsRowsToBatch(rows); setBatch(b); saveBatch(eventId, b); }
        else setBatch(loadBatch(eventId));
      })
      .catch(() => { if (vivo) setBatch(loadBatch(eventId)); })
      .finally(() => { if (vivo) setHydrated(true); });
    return () => { vivo = false; };
  }, [eventId]);
```

- [ ] **Step 3: `addBatch` persiste no banco** — virar `async`:

```tsx
  async function addBatch() {
    setPasteError("");
    const { lines, error: err } = parsePastedOdds(paste);
    if (err) { setPasteError(err); return; }
    try {
      await saveOdds({ event_id: eventId, coletado_em: new Date().toISOString(), odds: lines });
      setBatch((b) => [...b, ...lines]);
      setPaste("");
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "erro ao salvar odds");
    }
  }
```

- [ ] **Step 4: `clearBatch` apaga no banco** — best-effort:

```tsx
  function clearBatch() {
    setBatch([]); setStored(null); setError(""); setEditing(false);
    clearStored(eventId);
    deleteOdds(eventId).catch(() => { /* limpeza local já feita; ignora falha de rede */ });
  }
```

(`analyze()` fica inalterado — segue enviando `odds: batch`.)

- [ ] **Step 5: build + testes** — `npm run build` e `npm test`. Esperado: compila, suíte verde.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: Detail carrega/grava/apaga odds no banco (abrir hidrata da tabela)"
```

---

## Self-Review
- **Spec coverage:** tipo+API (T1), mapper (T2), hidratação/persistência/limpeza (T3). `analyze` inalterado conforme spec. Resultado em localStorage e escopo_historico fora de escopo (declarado).
- **Placeholders:** nenhum.
- **Type consistency:** `OddsRow` definido em T1, usado em T2/T3; `oddsRowsToBatch` mesma assinatura em T2 e T3; `ManualAnalyzeBody` reusado (já existe em api.ts).
