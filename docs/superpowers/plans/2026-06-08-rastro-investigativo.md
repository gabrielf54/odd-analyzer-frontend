# Rastro Investigativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir, sob `diagnostico:true`, um rastro passo-a-passo de como cada candidato foi calculado — em português leigo (pro dono) e em JSON técnico (pra uma IA auditora) — e exibi-lo no front.

**Architecture:** O backend (`odd-analyzer`) monta um `Trace` agnóstico = lista ordenada de passos auto-descritivos. O caminho de jogador preenche os passos do ritmo→mu em `entityRate`; `buildCandidate` fecha com os passos de probabilidade→edge. O front (`odd-analyzer-frontend`) renderiza qualquer `trace.passos` genericamente + botão "Copiar rastro".

**Tech Stack:** TypeScript, Vitest (ambos repos), Next App Router + Tailwind (front).

**Repos & cwd:**
- Backend: `C:\Users\gabri\Documents\projects\odd-analyzer` — rode testes com `npx vitest run <arquivo>` na raiz do repo.
- Front: `C:\Users\gabri\Documents\projects\odd-analyzer-frontend` — rode testes com `npx vitest run <arquivo>` na raiz do repo.

> **Ordem:** Parte A (backend) inteira antes da Parte B (front) — o front consome os tipos da Parte A. Commits frequentes, um por task.

---

## PARTE A — Backend (`odd-analyzer`)

### Task A1: Tipos do trace + montagem dos passos (módulo puro)

**Files:**
- Create: `src/model/trace.ts`
- Test: `src/model/trace.test.ts`

- [ ] **Step 1: Write the failing test**

`src/model/trace.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildRateTrace, finalizeTrace, statLabelFor } from "./trace.js";

describe("statLabelFor", () => {
  it("traduz stat_field pra termo leigo", () => {
    expect(statLabelFor("shots_on_target")).toBe("chutes a gol");
    expect(statLabelFor("desconhecido")).toBe("desconhecido");
  });
});

describe("buildRateTrace", () => {
  const games = [
    { shots_on_target: 1, minutes_played: 90 },
    { shots_on_target: 0, minutes_played: 90 },
    { shots_on_target: 2, minutes_played: 90 },
  ];
  const rt = buildRateTrace({
    statField: "shots_on_target", games,
    rawRate: 1.0, shrunk: 0.45, priorRate: 0.4, priorStrength: 12, n: 3,
    minutos: 63.2, oppMult: 1.0, haMult: 0.92, oppConceded: 3.3, isHome: false, mu: 0.317,
  });

  it("emite os passos do ritmo na ordem certa", () => {
    expect(rt.passos.map((p) => p.passo)).toEqual([
      "taxa_base", "encolhimento", "minutos", "fator_adversario", "fator_casa", "esperado_final",
    ]);
  });

  it("taxa_base soma o stat e os minutos da janela", () => {
    const base = rt.passos[0];
    expect(base.entradas.stat_total).toBe(3);
    expect(base.entradas.minutos_total).toBe(270);
    expect(base.frase).toContain("3 chutes a gol");
  });

  it("guarda mu e statField pra finalizar", () => {
    expect(rt.mu).toBe(0.317);
    expect(rt.statField).toBe("shots_on_target");
  });

  it("omite fator_adversario quando oppConceded é null", () => {
    const rt2 = buildRateTrace({
      statField: "shots_on_target", games,
      rawRate: 1, shrunk: 0.45, priorRate: 0.4, priorStrength: 12, n: 3,
      minutos: 90, oppMult: 1, haMult: 1, oppConceded: null, isHome: true, mu: 0.45,
    });
    expect(rt2.passos.map((p) => p.passo)).not.toContain("fator_adversario");
  });
});

describe("finalizeTrace", () => {
  const rt = buildRateTrace({
    statField: "shots_on_target", games: [{ shots_on_target: 1, minutes_played: 90 }],
    rawRate: 1, shrunk: 0.45, priorRate: 0.4, priorStrength: 12, n: 1,
    minutos: 63.2, oppMult: 1, haMult: 0.92, oppConceded: 3.3, isHome: false, mu: 0.317,
  });
  const trace = finalizeTrace(rt, {
    alvo: "Mikel Oyarzabal", linha: 1.5, probModelo: 0.048, probDevig: 0.369, edge: -0.321, ev: -0.808,
  });

  it("anexa probabilidade, casa_devig e comparacao", () => {
    const ids = trace.passos.map((p) => p.passo);
    expect(ids.slice(-3)).toEqual(["probabilidade", "casa_devig", "comparacao"]);
  });

  it("preenche alvo, linha e precisa", () => {
    expect(trace.alvo).toBe("Mikel Oyarzabal");
    expect(trace.linha).toBe(1.5);
    expect(trace.precisa).toBe("2 ou mais");
  });

  it("veredito_leigo aponta falta de valor quando edge negativo", () => {
    expect(trace.veredito_leigo.toLowerCase()).toContain("sem valor");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (na raiz do backend): `npx vitest run src/model/trace.test.ts`
Expected: FAIL — `Cannot find module './trace.js'`.

- [ ] **Step 3: Write minimal implementation**

`src/model/trace.ts`:

```ts
export interface TraceStep {
  passo: string;
  titulo: string;
  formula: string;
  entradas: Record<string, number | string>;
  saida: number;
  frase: string;
}

export interface Trace {
  alvo: string;
  linha: number;
  precisa: string;
  passos: TraceStep[];
  veredito_leigo: string;
}

/** Rastro parcial (cadeia do ritmo → mu). `buildCandidate` o finaliza com os
 * passos de valor (probabilidade/de-vig/comparação), que dependem da linha/odds. */
export interface RateTrace {
  statField: string;
  mu: number;
  passos: TraceStep[];
}

const STAT_LABEL: Record<string, string> = {
  shots_on_target: "chutes a gol",
  total_shots: "finalizações",
  total_tackle: "desarmes",
  corners: "escanteios",
  goals: "gols",
};

export function statLabelFor(statField: string): string {
  return STAT_LABEL[statField] ?? statField;
}

const r2 = (x: number): number => Math.round(x * 100) / 100;
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const numField = (g: Record<string, unknown>, f: string): number => {
  const v = g[f];
  return typeof v === "number" ? v : Number(v) || 0;
};

export interface RateTraceArgs {
  statField: string;
  games: Array<Record<string, unknown>>; // ordem crescente (recente no fim)
  rawRate: number;
  shrunk: number;
  priorRate: number;
  priorStrength: number;
  n: number;
  minutos: number;
  oppMult: number;
  haMult: number;
  oppConceded: number | null;
  isHome: boolean;
  mu: number;
}

export function buildRateTrace(a: RateTraceArgs): RateTrace {
  const label = statLabelFor(a.statField);
  const window = a.games.slice(-5);
  const statTotal = window.reduce((s, g) => s + numField(g, a.statField), 0);
  const minTotal = window.reduce((s, g) => s + numField(g, "minutes_played"), 0);
  const passos: TraceStep[] = [];

  passos.push({
    passo: "taxa_base",
    titulo: `Ritmo recente de ${label}`,
    formula: "soma(stat) ÷ soma(minutos) × 90",
    entradas: { stat_total: statTotal, minutos_total: minTotal, jogos: window.length },
    saida: r2(a.rawRate),
    frase: `Nos últimos ${window.length} jogos fez ${statTotal} ${label} em ${minTotal} min — ritmo de ${r2(a.rawRate)} por 90 min.`,
  });

  passos.push({
    passo: "encolhimento",
    titulo: "Ajuste pela pouca amostra",
    formula: "média ponderada entre ritmo recente e a média típica do mercado",
    entradas: { ritmo_recente: r2(a.rawRate), media_tipica: a.priorRate, peso_jogos: a.n, peso_media: a.priorStrength },
    saida: r2(a.shrunk),
    frase: `Como são só ${a.n} jogos, puxamos pra média típica (${a.priorRate}): vira ${r2(a.shrunk)} por 90 min.`,
  });

  const porMinutos = (a.shrunk * a.minutos) / 90;
  passos.push({
    passo: "minutos",
    titulo: "Ajuste pelos minutos esperados",
    formula: "ritmo × minutos ÷ 90",
    entradas: { ritmo: r2(a.shrunk), minutos_esperados: r2(a.minutos) },
    saida: r2(porMinutos),
    frase: `Deve jogar ~${Math.round(a.minutos)} min, o que dá ${r2(porMinutos)} ${label}.`,
  });

  if (a.oppConceded != null) {
    passos.push({
      passo: "fator_adversario",
      titulo: "Defesa do adversário",
      formula: "concedido pelo adversário ÷ média da liga (limitado 0.7–1.4)",
      entradas: { concedido_adversario: a.oppConceded, multiplicador: r2(a.oppMult) },
      saida: r2(a.oppMult),
      frase: a.oppMult >= 1
        ? `Adversário cede bastante (${a.oppConceded}), empurra o número pra cima (×${r2(a.oppMult)}).`
        : `Adversário defende bem (${a.oppConceded}), segura o número (×${r2(a.oppMult)}).`,
    });
  }

  passos.push({
    passo: "fator_casa",
    titulo: a.isHome ? "Jogando em casa" : "Jogando fora",
    formula: "fator de mando",
    entradas: { mando: a.isHome ? "casa" : "fora", multiplicador: r2(a.haMult) },
    saida: r2(a.haMult),
    frase: a.isHome
      ? `Em casa, leve ajuste pra cima (×${r2(a.haMult)}).`
      : `Fora de casa, leve ajuste pra baixo (×${r2(a.haMult)}).`,
  });

  passos.push({
    passo: "esperado_final",
    titulo: `Total esperado de ${label}`,
    formula: "ritmo ajustado × fatores",
    entradas: { esperado: r2(a.mu) },
    saida: r2(a.mu),
    frase: `No total, esperamos ${r2(a.mu)} ${label} nesta partida.`,
  });

  return { statField: a.statField, mu: a.mu, passos };
}

export interface FinalizeArgs {
  alvo: string;
  linha: number;
  probModelo: number;
  probDevig: number;
  edge: number;
  ev: number;
}

export function finalizeTrace(rt: RateTrace, v: FinalizeArgs): Trace {
  const label = statLabelFor(rt.statField);
  const k = Math.floor(v.linha) + 1;
  const precisa = `${k} ou mais`;
  const passos = [...rt.passos];

  passos.push({
    passo: "probabilidade",
    titulo: `Chance de ${precisa} ${label}`,
    formula: `P(X ≥ ${k})`,
    entradas: { esperado: r2(rt.mu), precisa: k },
    saida: v.probModelo,
    frase: `Com esse esperado, a chance de ${precisa} ${label} é ${pct(v.probModelo)}.`,
  });

  passos.push({
    passo: "casa_devig",
    titulo: "Chance que a casa embute",
    formula: "odd justa, tirando a margem da casa",
    entradas: { prob_casa: v.probDevig },
    saida: v.probDevig,
    frase: `A casa, tirando o lucro dela, dá ${pct(v.probDevig)} pra isso acontecer.`,
  });

  passos.push({
    passo: "comparacao",
    titulo: "Nosso número vs a casa",
    formula: "edge = nossa chance − chance da casa",
    entradas: { nossa_chance: v.probModelo, chance_casa: v.probDevig, edge: r2(v.edge), ev: r2(v.ev) },
    saida: r2(v.edge),
    frase: v.edge > 0
      ? `Achamos ${pct(v.probModelo)} contra ${pct(v.probDevig)} da casa — vantagem a favor.`
      : `Achamos só ${pct(v.probModelo)} contra ${pct(v.probDevig)} da casa — sem vantagem.`,
  });

  const veredito_leigo = v.edge > 0
    ? `Esperamos ${r2(rt.mu)} ${label} nesta partida; a chance de ${precisa} é ${pct(v.probModelo)}, acima dos ${pct(v.probDevig)} da casa. Tem valor.`
    : `Esperamos ${r2(rt.mu)} ${label} nesta partida; a chance de ${precisa} é ${pct(v.probModelo)}, abaixo dos ${pct(v.probDevig)} da casa. Sem valor — a odd não paga o risco.`;

  return { alvo: v.alvo, linha: v.linha, precisa, passos, veredito_leigo };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/model/trace.test.ts`
Expected: PASS (todos os casos).

- [ ] **Step 5: Commit**

```bash
git add src/model/trace.ts src/model/trace.test.ts
git commit -m "feat: modulo de rastro investigativo (passos leigos + finalizacao)"
```

---

### Task A2: `EntityRate` carrega o rastro parcial; `entityRate` o monta

**Files:**
- Modify: `src/providers/types.ts:16-23` (interface `EntityRate`)
- Modify: `src/providers/stats.ts:1-8` (import) e `:104-116` (montagem em `entityRate`)
- Test: `src/providers/stats.trace.test.ts`

- [ ] **Step 1: Write the failing test**

`src/providers/stats.trace.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { BSDStatsProvider } from "./stats.js";
import { MARKETS } from "../model/markets.js";

// Client fake: 3 jogos do jogador; sem stats de adversário (oppConceded → null).
function fakeClient() {
  return {
    async playerStats() {
      return { results: [
        { shots_on_target: 2, minutes_played: 90, team_id: "T1" },
        { shots_on_target: 0, minutes_played: 90, team_id: "T1" },
        { shots_on_target: 1, minutes_played: 90, team_id: "T1" },
      ] };
    },
    async events() { return { results: [] }; },
    async eventStats() { return { stats: {} }; },
  };
}

describe("entityRate trace", () => {
  it("anexa um rateTrace com mu igual ao mu retornado", async () => {
    const sp = new BSDStatsProvider(fakeClient());
    const ctx = { is_home: false, league_avg_conceded: 4.55, entity_team_id: "T1",
      opp_team_id: "T2", xi_team_ids: new Set<string>(), escopo_historico: "todos" };
    const rate = await sp.entityRate("p1", MARKETS.sot!, ctx);
    expect(rate).not.toBeNull();
    expect(rate!.trace).toBeDefined();
    expect(rate!.trace!.mu).toBeCloseTo(rate!.mu, 6);
    expect(rate!.trace!.statField).toBe("shots_on_target");
    expect(rate!.trace!.passos[0]!.passo).toBe("taxa_base");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/providers/stats.trace.test.ts`
Expected: FAIL — `rate.trace` é `undefined`.

- [ ] **Step 3: Write minimal implementation**

Em `src/providers/types.ts`, importe o tipo e adicione o campo:

```ts
import type { MarketSpec } from "../model/markets.js";
import type { RateTrace } from "../model/trace.js";
```

```ts
export interface EntityRate {
  mu: number;
  minutos_esperados: number;
  xi_confirmado: boolean;
  amostra_jogos: number;
  concedido_adversario: string;
  incerteza: string;
  trace?: RateTrace;
}
```

Em `src/providers/stats.ts`, adicione ao import do topo (linha 2-4 já importa de `../model/assemble.js`; acrescente um import novo):

```ts
import { buildRateTrace } from "../model/trace.js";
```

No fim de `entityRate`, antes do `return`, monte o trace e inclua no objeto. Substitua o bloco `return { mu: calc.mu, ... }` (linhas ~110-115) por:

```ts
    const trace = buildRateTrace({
      statField: market.stat_field,
      games,
      rawRate: calc.raw_rate,
      shrunk: calc.shrunk,
      priorRate: market.prior_rate,
      priorStrength: market.prior_strength,
      n,
      minutos: minutes,
      oppMult,
      haMult,
      oppConceded,
      isHome,
      mu: calc.mu,
    });
    return {
      mu: calc.mu, minutos_esperados: minutes,
      xi_confirmado: xiConfirmed, amostra_jogos: n,
      concedido_adversario: oppConceded != null ? oppConceded.toFixed(1) : "n/d (neutro)",
      incerteza: uncertaintyFor(n),
      trace,
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/providers/stats.trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/types.ts src/providers/stats.ts src/providers/stats.trace.test.ts
git commit -m "feat: entityRate monta rateTrace do jogador"
```

---

### Task A3: `buildCandidate` finaliza e anexa o `trace`

**Files:**
- Modify: `src/candidates/builder.ts` (todo o arquivo)
- Test: `src/candidates/builder.trace.test.ts`

- [ ] **Step 1: Write the failing test**

`src/candidates/builder.trace.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildCandidate } from "./builder.js";
import type { RateTrace } from "../model/trace.js";

const rateTrace: RateTrace = {
  statField: "shots_on_target",
  mu: 0.317,
  passos: [{ passo: "esperado_final", titulo: "x", formula: "y", entradas: {}, saida: 0.317, frase: "z" }],
};

describe("buildCandidate com trace", () => {
  it("finaliza o trace quando recebido", () => {
    const c = buildCandidate({
      jogador: "Mikel Oyarzabal", linha: 1.5, odd_over: 4, odd_under: 1.9,
      prob_modelo: 0.048, mu: 0.317, minutos_esperados: 63.2, xi_confirmado: true,
      amostra_jogos: 50, concedido_adversario: "3.3", incerteza: "baixa",
      market_type: "sot", trace: rateTrace,
    }) as any;
    expect(c.trace).toBeDefined();
    expect(c.trace.alvo).toBe("Mikel Oyarzabal");
    expect(c.trace.precisa).toBe("2 ou mais");
    expect(c.trace.passos.map((p: any) => p.passo)).toContain("comparacao");
  });

  it("não cria trace quando não recebido", () => {
    const c = buildCandidate({
      jogador: "X", linha: 1.5, odd_over: 4, odd_under: 1.9,
      prob_modelo: 0.048, mu: 0.317, minutos_esperados: 63.2, xi_confirmado: true,
      amostra_jogos: 50, concedido_adversario: "3.3", incerteza: "baixa", market_type: "sot",
    }) as any;
    expect(c.trace).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/candidates/builder.trace.test.ts`
Expected: FAIL — `trace` não existe em `BuildCandidateArgs` (erro de tipo) / `c.trace` undefined.

- [ ] **Step 3: Write minimal implementation**

Substitua `src/candidates/builder.ts` inteiro por:

```ts
import { fairProbOver } from "../value/devig.js";
import { edgeEv } from "../value/ev.js";
import { finalizeTrace, type RateTrace } from "../model/trace.js";

export interface BuildCandidateArgs {
  jogador: unknown;
  linha: number;
  odd_over: number;
  odd_under: number;
  prob_modelo: number;
  mu: number;
  minutos_esperados: number;
  xi_confirmado: boolean;
  amostra_jogos: number;
  concedido_adversario: unknown;
  incerteza: unknown;
  market_type: string;
  player_id?: unknown;
  trace?: RateTrace;
}

/** Monta o dossiê de UM candidato. Toda a matemática (de-vig, edge, EV) vem daqui
 * — a IA nunca calcula. Chaves em snake_case (fluem p/ API/DB/IA). */
export function buildCandidate(a: BuildCandidateArgs): Record<string, unknown> {
  const prob_devig = fairProbOver(a.odd_over, a.odd_under);
  const m = edgeEv(a.prob_modelo, prob_devig, a.odd_over);
  const out: Record<string, unknown> = {
    jogador: a.jogador,
    player_id: a.player_id ?? null,
    linha: a.linha,
    odd: a.odd_over,
    prob_modelo: a.prob_modelo,
    prob_devig,
    edge: m.edge,
    ev: m.ev,
    lambda: a.mu,
    minutos_esperados: a.minutos_esperados,
    xi_confirmado: a.xi_confirmado,
    amostra_jogos: a.amostra_jogos,
    concedido_adversario: a.concedido_adversario,
    incerteza: a.incerteza,
    market_type: a.market_type,
  };
  if (a.trace) {
    out.trace = finalizeTrace(a.trace, {
      alvo: String(a.jogador),
      linha: a.linha,
      probModelo: a.prob_modelo,
      probDevig: prob_devig,
      edge: m.edge,
      ev: m.ev,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/candidates/builder.trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/candidates/builder.ts src/candidates/builder.trace.test.ts
git commit -m "feat: buildCandidate finaliza e anexa o trace"
```

---

### Task A4: Encadear o trace no pipeline + esconder quando diagnóstico desligado

**Files:**
- Modify: `src/pipeline.ts:104-131` (`playerCount` passa `rate.trace`) e `:19-54` (`analyzeMatch` esconde trace dos aprovados quando `!diagnostics`)
- Test: `src/pipeline.trace.test.ts`

- [ ] **Step 1: Write the failing test**

`src/pipeline.trace.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { analyzeMatch } from "./pipeline.js";
import { MARKETS } from "./model/markets.js";

const event = { id: "e1", jogo: "Spain x Peru", home_team: { id: "H", name: "Spain" }, away_team: { id: "A", name: "Peru" } };

const statsProvider = {
  async squad() { return [{ id: "p1", name: "Mikel Oyarzabal", team_id: "H", posicao: "FW" }]; },
  async xiIds() { return new Set<string>(); },
  async entityRate() {
    return {
      mu: 0.317, minutos_esperados: 63.2, xi_confirmado: true, amostra_jogos: 50,
      concedido_adversario: "3.3", incerteza: "baixa",
      trace: { statField: "shots_on_target", mu: 0.317,
        passos: [{ passo: "taxa_base", titulo: "t", formula: "f", entradas: {}, saida: 0.45, frase: "fr" }] },
    };
  },
};
const oddsProvider = { lines() { return [{ entidade: "p", linha: 1.5, odd_over: 4, odd_under: 1.9, book: "manual" }]; } };
const repo = { async saveAnalysis() {}, async saveLedger() {} };
const analystFn = () => ({ melhor_aposta: null, outras: [], alertas: [] });

describe("analyzeMatch trace", () => {
  it("com diagnostics: reprovado carrega trace finalizado", async () => {
    const out = await analyzeMatch(event, MARKETS.sot!, statsProvider, oddsProvider, repo, { analystFn, diagnostics: true });
    const r = out.reprovados[0] as any;
    expect(r.trace).toBeDefined();
    expect(r.trace.passos.map((p: any) => p.passo)).toContain("comparacao");
  });

  it("sem diagnostics: aprovados não vazam trace", async () => {
    const out = await analyzeMatch(event, MARKETS.sot!, statsProvider, oddsProvider, repo, { analystFn, diagnostics: false });
    for (const c of out.candidatos as any[]) expect(c.trace).toBeUndefined();
    expect(out.reprovados).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pipeline.trace.test.ts`
Expected: FAIL — `playerCount` não repassa `rate.trace`, então `r.trace` é `undefined`.

- [ ] **Step 3: Write minimal implementation**

Em `src/pipeline.ts`, dentro de `playerCount`, no objeto passado a `buildCandidate` (linhas ~121-127), acrescente o campo `trace`:

```ts
      candidates.push(buildCandidate({
        jogador: entity.name, linha: li.linha, odd_over: li.odd_over, odd_under: li.odd_under,
        prob_modelo: probOverLine(rate.mu, li.linha, market.nb_dispersion), mu: rate.mu,
        minutos_esperados: rate.minutos_esperados, xi_confirmado: rate.xi_confirmado,
        amostra_jogos: rate.amostra_jogos, concedido_adversario: rate.concedido_adversario,
        incerteza: rate.incerteza, market_type: market.key, player_id: entity.id,
        trace: rate.trace,
      }));
```

Em `analyzeMatch`, troque o `return` final (linha ~53) por uma versão que remove `trace` dos aprovados quando o diagnóstico está desligado:

```ts
  const hideTrace = (c: any) => {
    if (opts.diagnostics || !c || c.trace === undefined) return c;
    const { trace, ...rest } = c;
    return rest;
  };
  return {
    candidatos: approved.map(hideTrace),
    reprovados: opts.diagnostics ? rejected : [],
    ia,
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pipeline.trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full backend suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (todos). Em especial, os testes existentes de `pipeline`/`builder` continuam verdes — o `mu`/`lambda` final não muda.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline.ts src/pipeline.trace.test.ts
git commit -m "feat: encadeia trace no pipeline e esconde sem diagnostico"
```

---

### Task A5: Trace mínimo pros mercados de partida (gols/escanteios)

> **Escopo:** mercados de partida estão "em validação" (o front sela). Damos um trace **mínimo** (só `esperado_final` → cadeia de valor) pra provar que a estrutura é agnóstica, sem evidência por-jogo.

**Files:**
- Modify: `src/pipeline.ts:63-78` (`matchCount`) e `:80-102` (`runMatch`)
- Test: adicionar caso em `src/pipeline.trace.test.ts`

- [ ] **Step 1: Write the failing test**

Acrescente um novo `describe` ao final de `src/pipeline.trace.test.ts` (mesmos imports já no topo do arquivo — `analyzeMatch` e `MARKETS`):

```ts
describe("match trace minimo", () => {
  it("escanteios: candidato traz trace com esperado_final e comparacao", async () => {
    const sp = {
      async teamRate() { return { mu: 5.2, minutos_esperados: 90, xi_confirmado: true, amostra_jogos: 10, concedido_adversario: "n/d", incerteza: "media" }; },
    };
    const op = { lines() { return [{ entidade: "partida", linha: 9.5, odd_over: 1.9, odd_under: 1.9, book: "manual" }]; } };
    const repo = { async saveAnalysis() {}, async saveLedger() {} };
    const ev = { id: "e2", jogo: "A x B", home_team: { id: "H", name: "A" }, away_team: { id: "A2", name: "B" } };
    const out = await analyzeMatch(ev, MARKETS.escanteios!, sp, op, repo, { analystFn: () => ({ melhor_aposta: null, outras: [], alertas: [] }), diagnostics: true });
    const all = [...out.candidatos, ...out.reprovados] as any[];
    expect(all.length).toBeGreaterThan(0);
    const withTrace = all.find((c) => c.trace);
    expect(withTrace).toBeDefined();
    expect(withTrace.trace.passos.map((p: any) => p.passo)).toEqual(
      expect.arrayContaining(["esperado_final", "comparacao"]),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pipeline.trace.test.ts`
Expected: FAIL — `matchCount` não anexa trace.

- [ ] **Step 3: Write minimal implementation**

No topo de `src/pipeline.ts`, importe o helper:

```ts
import { type RateTrace } from "./model/trace.js";
```

Adicione uma função auxiliar no arquivo (perto das outras `run*`):

```ts
/** Trace mínimo de partida: só o esperado final (sem evidência por-jogo). */
function matchRateTrace(statField: string, mu: number): RateTrace {
  return {
    statField, mu,
    passos: [{
      passo: "esperado_final",
      titulo: "Total esperado na partida",
      formula: "soma dos esperados dos dois times",
      entradas: { esperado: Math.round(mu * 100) / 100 },
      saida: Math.round(mu * 100) / 100,
      frase: `No total, esperamos ${Math.round(mu * 100) / 100} nesta partida.`,
    }],
  };
}
```

Em `matchCount`, no `buildCandidate` (linhas ~72-77), acrescente:

```ts
  return lines.map((li) => buildCandidate({
    jogador: label, linha: li.linha, odd_over: li.odd_over, odd_under: li.odd_under,
    prob_modelo: probOverLine(muTotal, li.linha, market.nb_dispersion), mu: muTotal, minutos_esperados: 90.0,
    xi_confirmado: true, amostra_jogos: sample, concedido_adversario: "n/d", incerteza: uncertainty ?? "media",
    market_type: market.key,
    trace: matchRateTrace(market.stat_field, muTotal),
  }));
```

Em `runMatch`, no `buildCandidate` (linhas ~96-100), acrescente:

```ts
    return buildCandidate({
      jogador, linha: li.linha, odd_over: li.odd_over, odd_under: li.odd_under,
      prob_modelo: prob, mu: lambdaHome + lambdaAway, minutos_esperados: 90.0,
      xi_confirmado: true, amostra_jogos: 10, concedido_adversario: "n/d", incerteza: "media", market_type: market.key,
      trace: matchRateTrace(market.stat_field, lambdaHome + lambdaAway),
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pipeline.trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full backend suite + typecheck**

Run: `npx vitest run` then `npm run typecheck`
Expected: ambos PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline.ts src/pipeline.trace.test.ts
git commit -m "feat: trace minimo para mercados de partida"
```

---

## PARTE B — Front (`odd-analyzer-frontend`)

### Task B1: Tipos do trace no front

**Files:**
- Modify: `lib/types.ts:19-43`

- [ ] **Step 1: Adicione os tipos e o campo opcional**

Em `lib/types.ts`, acima de `export interface Candidate`, adicione:

```ts
// Rastro investigativo (só vem sob diagnostico:true). snake_case PT espelhando o backend.
export interface TraceStep {
  passo: string;
  titulo: string;
  formula: string;
  entradas: Record<string, number | string>;
  saida: number;
  frase: string;
}
export interface Trace {
  alvo: string;
  linha: number;
  precisa: string;
  passos: TraceStep[];
  veredito_leigo: string;
}
```

E dentro de `interface Candidate`, acrescente o campo (no fim, após `market_type`):

```ts
  market_type: string;
  trace?: Trace;
```

(`RejectedCandidate extends Candidate` herda `trace` automaticamente.)

- [ ] **Step 2: Verifique a compilação dos tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: tipos Trace/TraceStep no front"
```

---

### Task B2: Componente `InvestigationTrace` + helper de cópia (testado)

> **Por que o teste é num helper puro:** o repo usa `vitest run` sem harness de DOM garantido. O contrato que importa pra IA auditora é o JSON copiado — testamos o helper `formatTraceForCopy`, que é puro. O componente é apresentacional simples.

**Files:**
- Create: `components/InvestigationTrace.tsx`
- Test: `components/investigationTrace.format.test.ts`

- [ ] **Step 1: Write the failing test**

`components/investigationTrace.format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatTraceForCopy } from "./InvestigationTrace";
import type { Trace } from "@/lib/types";

const trace: Trace = {
  alvo: "Mikel Oyarzabal", linha: 1.5, precisa: "2 ou mais",
  veredito_leigo: "Sem valor.",
  passos: [
    { passo: "taxa_base", titulo: "Ritmo", formula: "soma÷min×90", entradas: { stat_total: 3 }, saida: 0.45, frase: "fez 3" },
    { passo: "comparacao", titulo: "vs casa", formula: "edge", entradas: { edge: -0.32 }, saida: -0.32, frase: "sem vantagem" },
  ],
};

describe("formatTraceForCopy", () => {
  it("gera JSON válido com alvo e passos", () => {
    const s = formatTraceForCopy(trace);
    const parsed = JSON.parse(s);
    expect(parsed.alvo).toBe("Mikel Oyarzabal");
    expect(parsed.passos).toHaveLength(2);
    expect(parsed.passos[0].passo).toBe("taxa_base");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/investigationTrace.format.test.ts`
Expected: FAIL — módulo `./InvestigationTrace` não existe.

- [ ] **Step 3: Write minimal implementation**

`components/InvestigationTrace.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Trace } from "@/lib/types";

/** JSON do rastro pra colar numa IA auditora. Puro (testável sem DOM). */
export function formatTraceForCopy(trace: Trace): string {
  return JSON.stringify(trace, null, 2);
}

/* Rastro investigativo: a narrativa leiga no topo, os passos abaixo (cada um
   expande pra mostrar a conta crua), e um botão que copia o JSON técnico. */
export function InvestigationTrace({ trace }: { trace: Trace }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatTraceForCopy(trace));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line-soft bg-panel-2 px-3.5 py-3">
      <p className="text-[0.78rem] leading-relaxed text-fg">{trace.veredito_leigo}</p>

      <ol className="flex flex-col gap-1.5">
        {trace.passos.map((p, i) => (
          <li key={i}>
            <details className="group rounded-sm border border-line bg-panel">
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left marker:content-none">
                <span className="min-w-0">
                  <span className="display block truncate text-[0.78rem] font-semibold text-fg">{p.titulo}</span>
                  <span className="block text-[0.68rem] leading-relaxed text-faint">{p.frase}</span>
                </span>
                <span className="mono shrink-0 text-[0.72rem] tabular-nums text-muted">{p.saida}</span>
              </summary>
              <div className="mono flex flex-col gap-1 border-t border-line-soft px-3 py-2 text-[0.66rem] text-muted">
                <span className="text-faint">{p.formula}</span>
                {Object.entries(p.entradas).map(([k, v]) => (
                  <span key={k}>
                    {k}: <span className="text-fg">{String(v)}</span>
                  </span>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ol>

      <button
        onClick={copy}
        className="self-start rounded-sm border border-line px-3 py-1.5 text-[0.7rem] text-muted transition-colors hover:border-[#2c3744] hover:text-fg"
      >
        {copied ? "rastro copiado ✓" : "copiar rastro (pra IA)"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/investigationTrace.format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/InvestigationTrace.tsx components/investigationTrace.format.test.ts
git commit -m "feat: componente InvestigationTrace + helper de copia"
```

---

### Task B3: Integrar "Mostrar investigação" no diagnóstico e nos candidatos

**Files:**
- Modify: `components/DiagnosticsPanel.tsx` (import + bloco por candidato reprovado)
- Modify: `components/CandidatesTable.tsx` (import + bloco por candidato aprovado)

- [ ] **Step 1: Adicionar o toggle no `DiagnosticsPanel`**

Em `components/DiagnosticsPanel.tsx`, adicione o import no topo:

```ts
import { InvestigationTrace } from "@/components/InvestigationTrace";
```

Dentro do `.map`, logo após o `<div className="mono flex shrink-0 ...">...</div>` que fecha a linha de métricas (antes de fechar o `<div>` do card, linha ~83), adicione:

```tsx
            {c.trace && (
              <details className="group/inv sm:col-span-2">
                <summary className="display inline-flex cursor-pointer items-center gap-1 text-[0.68rem] font-semibold text-faint hover:text-fg">
                  <span className="transition-transform group-open/inv:rotate-90">▸</span>
                  mostrar investigação
                </summary>
                <div className="mt-2">
                  <InvestigationTrace trace={c.trace} />
                </div>
              </details>
            )}
```

- [ ] **Step 2: Adicionar o toggle no `CandidatesTable`**

Em `components/CandidatesTable.tsx`, adicione o import:

```ts
import { InvestigationTrace } from "@/components/InvestigationTrace";
```

Dentro do `.map`, logo após o bloco da coluna `ev` (o `<div>` que fecha em ~linha 122), antes de fechar o card `</div>`, adicione (ocupa a largura toda abaixo da grade):

```tsx
          {c.trace && (
            <details className="group/inv md:col-span-5">
              <summary className="display inline-flex cursor-pointer items-center gap-1 text-[0.68rem] font-semibold text-faint hover:text-fg">
                <span className="transition-transform group-open/inv:rotate-90">▸</span>
                mostrar investigação
              </summary>
              <div className="mt-2">
                <InvestigationTrace trace={c.trace} />
              </div>
            </details>
          )}
```

- [ ] **Step 3: Verificar build/tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Verificação visual manual**

1. Suba o backend (`npm run dev` no repo `odd-analyzer`, porta 3001) e o front (`npm run dev`, porta 3000).
2. No front, faça uma análise com diagnóstico ligado (o payload com `diagnostico:true`).
3. Confirme: no painel "diagnóstico", cada reprovado tem "mostrar investigação"; ao abrir, aparece a narrativa, os passos expansíveis e o botão "copiar rastro".
4. Clique "copiar rastro" e cole num editor — deve ser o JSON do `trace`.

- [ ] **Step 5: Commit**

```bash
git add components/DiagnosticsPanel.tsx components/CandidatesTable.tsx
git commit -m "feat: integra 'mostrar investigacao' no diagnostico e candidatos"
```

---

## Self-review (preenchido)

- **Cobertura do spec:** tipos do trace (A1/B1) ✓ · frases leigas no backend (A1) ✓ · rastro técnico p/ IA via "copiar rastro" (B2) ✓ · agnóstico por passos (A1/A5) ✓ · só sob diagnóstico (A4) ✓ · player evidence por-jogo (A2) ✓ · match mínimo (A5) ✓ · UX toggle (B3) ✓ · testes backend+front ✓ · ausência de trace não quebra (B2/B3 guard `c.trace &&`) ✓.
- **Sem placeholders:** todo step tem código real.
- **Consistência de tipos:** `RateTrace`/`Trace`/`TraceStep` idênticos em backend (`src/model/trace.ts`) e front (`lib/types.ts`); `buildRateTrace`→`finalizeTrace`→`trace` no candidato; `EntityRate.trace?: RateTrace`; `BuildCandidateArgs.trace?: RateTrace`. `formatTraceForCopy` usado no botão e no teste.

## Fora de escopo (YAGNI)
- Evidência por-jogo nos mercados de partida (sela; trace mínimo basta).
- Persistência/histórico de rastros.
- Disparo automático de IA — o dono copia e cola.
