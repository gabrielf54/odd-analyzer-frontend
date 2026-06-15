"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getLeagues, getMatches } from "@/lib/api";
import { type League, type Match } from "@/lib/types";
import { useUrlState } from "@/lib/urlState";
import { addTab, removeTab, nextActiveId } from "@/lib/tabs";
import { loadTabs, saveTabs } from "@/lib/tabsStorage";
import { GameTabs } from "@/components/GameTabs";
import { LeagueRail } from "@/components/LeagueRail";
import { MatchRail } from "@/components/MatchRail";
import { GameDetail } from "@/components/GameDetail";
import { Panel, ErrorBox } from "@/components/ui";

function Collect() {
  const { leagueId, matchId, setLeague, setLeagueMatch, clearMatch } = useUrlState();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState("");
  // Collapse independente de cada coluna (botão no título de cada lista).
  const [leaguesCollapsed, setLeaguesCollapsed] = useState(false);
  const [matchesCollapsed, setMatchesCollapsed] = useState(false);

  // Abas abertas (estilo VSCode): lista de jogos persistida; a aba ativa é a URL.
  const [tabs, setTabs] = useState<Match[]>([]);
  const [tabsHydrated, setTabsHydrated] = useState(false);
  useEffect(() => { setTabs(loadTabs()); setTabsHydrated(true); }, []);
  useEffect(() => { if (tabsHydrated) saveTabs(tabs); }, [tabs, tabsHydrated]);

  // Trava o auto-add de ressuscitar a aba ativa fechada durante o render onde a URL
  // ainda aponta pro jogo fechado (o router só atualiza a URL no tick seguinte).
  const closedRef = useRef<Set<string>>(new Set());
  useEffect(() => { closedRef.current.clear(); }, [matchId]);

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingLeagues(false));
  }, []);

  useEffect(() => {
    if (!leagueId) { setMatches([]); return; }
    setError(""); setLoadingMatches(true);
    getMatches(leagueId, "notstarted")
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingMatches(false));
  }, [leagueId]);

  // Jogo ativo: procura primeiro nas abas (cross-liga), depois cai pro jogo da liga atual.
  const activeMatch = useMemo(
    () => tabs.find((t) => String(t.id) === matchId)
       ?? matches.find((m) => String(m.id) === matchId)
       ?? null,
    [tabs, matches, matchId],
  );

  // Deep-link/clique: garante que o jogo ativo vire uma aba.
  useEffect(() => {
    if (!tabsHydrated || !activeMatch) return;
    if (closedRef.current.has(String(activeMatch.id))) return;
    setTabs((cur) => addTab(cur, activeMatch));
  }, [tabsHydrated, activeMatch]);

  function openMatch(m: Match) {
    setTabs((cur) => addTab(cur, m));
    setLeagueMatch(String(m.league_id), String(m.id));
  }

  function closeTab(id: string) {
    const wasActive = String(id) === matchId;
    const nextId = nextActiveId(tabs, id, matchId);
    closedRef.current.add(String(id));
    setTabs((cur) => removeTab(cur, id));
    if (!wasActive) return;
    const nx = tabs.find((t) => String(t.id) === nextId);
    if (nx) setLeagueMatch(String(nx.league_id), String(nx.id));
    else clearMatch();
  }

  return (
    <div className="flex gap-3">
      {/* coluna 1 — ligas */}
      {leaguesCollapsed ? (
        <CollapsedStrip label="ligas" onExpand={() => setLeaguesCollapsed(false)} />
      ) : (
        <aside className="w-[150px] shrink-0 lg:sticky lg:top-24 lg:self-start">
          <RailHeader title="ligas" onCollapse={() => setLeaguesCollapsed(true)} />
          <LeagueRail leagues={leagues} active={leagueId} onSelect={setLeague} loading={loadingLeagues} />
        </aside>
      )}

      {/* coluna 2 — jogos da liga selecionada */}
      {matchesCollapsed ? (
        <CollapsedStrip label="jogos" onExpand={() => setMatchesCollapsed(false)} />
      ) : (
        <aside className="w-[180px] shrink-0 lg:sticky lg:top-24 lg:self-start">
          <RailHeader title="jogos" onCollapse={() => setMatchesCollapsed(true)} />
          <MatchRail
            matches={matches}
            activeId={matchId}
            onSelect={openMatch}
            loading={loadingMatches}
            empty={leagueId ? "sem jogos não iniciados" : "escolha uma liga"}
          />
        </aside>
      )}

      {/* coluna 3 — conteúdo (abas + jogo aberto) */}
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <GameTabs
          tabs={tabs}
          activeId={matchId}
          onSelect={(m) => setLeagueMatch(String(m.league_id), String(m.id))}
          onClose={closeTab}
        />

        {error && <ErrorBox msg={error} />}

        {activeMatch ? (
          <GameDetail key={String(activeMatch.id)} match={activeMatch} onBack={clearMatch} />
        ) : (
          <Panel className="grid min-h-[360px] place-items-center">
            <div className="text-center">
              <div className="display text-5xl font-extrabold text-line">⌖</div>
              <p className="display mt-3 text-lg font-bold text-muted">
                {leagueId ? "escolha um jogo" : "escolha uma liga e um jogo"}
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">
                selecione nas colunas à esquerda. dentro do jogo: <span className="text-value">Etapa 1</span> coleta as
                odds, <span className="text-value">Etapa 2</span> mostra a análise.
              </p>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}

/* Cabeçalho de uma coluna-lista: título + botão de recolher. */
function RailHeader({ title, onCollapse }: { title: string; onCollapse: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="overline">{title}</span>
      <button
        onClick={onCollapse}
        title={`ocultar ${title}`}
        aria-label={`ocultar ${title}`}
        className="px-1 text-faint transition-colors hover:text-fg"
      >
        ⟨
      </button>
    </div>
  );
}

/* Coluna recolhida: faixa fina vertical com o nome + botão de expandir. */
function CollapsedStrip({ label, onExpand }: { label: string; onExpand: () => void }) {
  return (
    <aside className="shrink-0 lg:sticky lg:top-24 lg:self-start">
      <button
        onClick={onExpand}
        title={`mostrar ${label}`}
        aria-label={`mostrar ${label}`}
        className="flex flex-col items-center gap-2 rounded-sm border border-line-soft px-1.5 py-2 text-faint transition-colors hover:border-line hover:text-fg"
      >
        <span>⟩</span>
        <span className="overline" style={{ writingMode: "vertical-rl" }}>{label}</span>
      </button>
    </aside>
  );
}

export default function CollectPage() {
  return (
    <Suspense fallback={<p className="mono text-sm text-value">carregando<span className="blink">_</span></p>}>
      <Collect />
    </Suspense>
  );
}
