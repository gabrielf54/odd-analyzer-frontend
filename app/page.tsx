"use client";

import { useEffect, useMemo, useState } from "react";
import { getLeagues, getMatches, getLineup, postAnalyze } from "@/lib/api";
import { MARKETS, type League, type Match, type Lineup as LineupData, type AnalysisResult, type Market } from "@/lib/types";
import { localTime } from "@/lib/date";
import { LeagueRail } from "@/components/LeagueRail";
import { MatchList } from "@/components/MatchList";
import { MatchFilter } from "@/components/MatchFilter";
import { filterMatches, type Period } from "@/lib/matchFilter";
import { Lineup } from "@/components/Lineup";
import { MarketChips } from "@/components/MarketChips";
import { CandidatesTable } from "@/components/CandidatesTable";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { AiVerdict } from "@/components/AiVerdict";
import { Panel, Field, Tag, ErrorBox } from "@/components/ui";

export default function PreGame() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [leagueId, setLeagueId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [line, setLine] = useState("1.5");
  const [oddOver, setOddOver] = useState("1.90");
  const [oddUnder, setOddUnder] = useState("1.90");
  const [playerRef, setPlayerRef] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingLeagues(false));
  }, []);

  useEffect(() => {
    if (!leagueId) return;
    setMatches([]); setSelectedMatch(null); setResult(null); setError(""); setLoadingMatches(true);
    getMatches(leagueId, "notstarted")
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingMatches(false));
  }, [leagueId]);

  const market = MARKETS.find((m) => m.key === marketKey)!;

  function goBack() {
    setSelectedMatch(null); setResult(null); setError("");
  }

  async function analyze() {
    if (!selectedMatch) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const r = await postAnalyze({
        event_id: String(selectedMatch.id), market_key: marketKey,
        linha: Number(line), odd_over: Number(oddOver), odd_under: Number(oddUnder),
        player_ref: market.level === "player" && playerRef ? playerRef : null,
        league_id: leagueId,
        diagnostico: true,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LeagueRail leagues={leagues} active={leagueId} onSelect={setLeagueId} loading={loadingLeagues} />
      </aside>

      <div className="min-w-0">
        {!selectedMatch ? (
          <Browse leagueId={leagueId} matches={matches} loading={loadingMatches} error={error} onSelect={setSelectedMatch} />
        ) : (
          <Detail
            match={selectedMatch}
            marketKey={marketKey} setMarketKey={setMarketKey} market={market}
            line={line} setLine={setLine}
            oddOver={oddOver} setOddOver={setOddOver}
            oddUnder={oddUnder} setOddUnder={setOddUnder}
            playerRef={playerRef} setPlayerRef={setPlayerRef}
            result={result} loading={loading} error={error}
            onAnalyze={analyze} onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}

function Browse({
  leagueId, matches, loading, error, onSelect,
}: {
  leagueId: string; matches: Match[]; loading: boolean; error: string; onSelect: (j: Match) => void;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");

  const filtered = useMemo(
    () => filterMatches(matches, { search, period }),
    [matches, search, period],
  );

  const filterActive = search.trim() !== "" || period !== "all";
  const showBar = !!leagueId && !loading && matches.length > 0;

  function clear() {
    setSearch("");
    setPeriod("all");
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

      {error && <ErrorBox msg={error} />}

      {!leagueId ? (
        <Empty title="escolha uma liga" text="selecione uma liga à esquerda para ver os jogos não iniciados." />
      ) : loading ? (
        <p className="mono text-sm text-value">carregando jogos<span className="blink">_</span></p>
      ) : (
        <>
          {showBar && (
            <MatchFilter
              search={search} setSearch={setSearch}
              period={period} setPeriod={setPeriod}
            />
          )}

          {filterActive && matches.length > 0 && (
            <div className="flex items-center justify-between text-[0.72rem] text-faint">
              <span>{filtered.length} de {matches.length} jogos</span>
              <button onClick={clear} className="transition-colors hover:text-fg">limpar</button>
            </div>
          )}

          {matches.length > 0 && filtered.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
              <p className="text-[0.78rem] text-muted">nenhum jogo bate o filtro — ajuste a busca ou o período.</p>
            </div>
          ) : (
            <MatchList matches={filtered} variant="pre" onSelect={onSelect} />
          )}
        </>
      )}
    </div>
  );
}

function Detail({
  match, marketKey, setMarketKey, market, line, setLine, oddOver, setOddOver,
  oddUnder, setOddUnder, playerRef, setPlayerRef, result, loading, error, onAnalyze, onBack,
}: {
  match: Match;
  marketKey: string; setMarketKey: (k: string) => void; market: Market;
  line: string; setLine: (v: string) => void;
  oddOver: string; setOddOver: (v: string) => void;
  oddUnder: string; setOddUnder: (v: string) => void;
  playerRef: string; setPlayerRef: (v: string) => void;
  result: AnalysisResult | null; loading: boolean; error: string;
  onAnalyze: () => void; onBack: () => void;
}) {
  const time = localTime(match.data);

  const [lineup, setLineup] = useState<LineupData | null>(null);
  const hasPlayers =
    !!lineup && lineup.home.jogadores.length + lineup.away.jogadores.length > 0;
  const [loadingLineup, setLoadingLineup] = useState(true);
  const [lineupError, setLineupError] = useState("");

  useEffect(() => {
    let alive = true;
    setLineup(null); setLineupError(""); setLoadingLineup(true);
    getLineup(match.id)
      .then((e) => { if (alive) setLineup(e); })
      .catch((e) => { if (alive) setLineupError(e instanceof Error ? e.message : "erro inesperado"); })
      .finally(() => { if (alive) setLoadingLineup(false); });
    return () => { alive = false; };
  }, [match.id]);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="overline self-start transition-colors hover:text-fg">
        ‹ voltar aos jogos
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <h1 className="display text-2xl font-extrabold leading-none text-fg">
          {match.mandante} <span className="text-faint">×</span> {match.visitante}
        </h1>
        {time && <span className="overline">{time}</span>}
      </div>

      <Lineup lineup={lineup} loading={loadingLineup} error={lineupError} onPickPlayer={setPlayerRef} />

      <Panel title="mercado">
        <div className="flex flex-col gap-3.5">
          <MarketChips markets={MARKETS} active={marketKey} onSelect={setMarketKey} />

          {market.level === "player" && (
            <Field
              label="jogador"
              hint={
                playerRef
                  ? "clique no × para varrer o elenco inteiro"
                  : hasPlayers
                  ? "clique num nome na escalação acima"
                  : "vazio = varre o elenco inteiro"
              }
            >
              {playerRef ? (
                <button
                  type="button"
                  onClick={() => setPlayerRef("")}
                  title="limpar — varrer o elenco inteiro"
                  className="input flex w-full items-center justify-between text-left transition-colors hover:border-line"
                >
                  <span className="truncate text-fg">{playerRef}</span>
                  <span className="ml-2 shrink-0 text-faint">×</span>
                </button>
              ) : (
                <div className="input flex items-center text-faint">
                  {hasPlayers ? "selecione na escalação ↑" : "elenco inteiro"}
                </div>
              )}
            </Field>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <Field label="linha"><input className="input" value={line} onChange={(e) => setLine(e.target.value)} /></Field>
            <Field label="odd over"><input className="input" value={oddOver} onChange={(e) => setOddOver(e.target.value)} /></Field>
            <Field label="odd under"><input className="input" value={oddUnder} onChange={(e) => setOddUnder(e.target.value)} /></Field>
          </div>

          <button onClick={onAnalyze} disabled={loading} className="btn w-full justify-center">
            {loading ? "analisando…" : "▸ analisar"}
          </button>

          {error && <ErrorBox msg={error} />}
        </div>
      </Panel>

      {loading && <Loading />}

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
              <AiVerdict ia={result.ia} />
            </Panel>
          </div>

          <div className="reveal" style={{ animationDelay: "60ms" }}>
            <Panel title={`candidatos · ${result.candidatos.length}`} badge={<Tag tone="value">edge &gt; 0</Tag>}>
              <CandidatesTable candidates={result.candidatos} />
            </Panel>
          </div>

          <DiagnosticsPanel
            rejected={result.reprovados ?? []}
            open={result.candidatos.length === 0}
          />
        </div>
      )}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">⌖</div>
        <p className="display mt-3 text-lg font-bold text-muted">{title}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{text}</p>
      </div>
    </Panel>
  );
}

function Loading() {
  return (
    <Panel className="grid min-h-[260px] place-items-center">
      <div className="text-center">
        <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
        <p className="mt-2 text-[0.68rem] text-faint">produção de um lado × vulnerabilidade do outro</p>
      </div>
    </Panel>
  );
}
