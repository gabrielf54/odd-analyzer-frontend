"use client";

import { useEffect, useState } from "react";
import { getLeagues, getMatches, getResult } from "@/lib/api";
import { MARKETS, type League, type Match, type RealResult } from "@/lib/types";
import { LeagueRail } from "@/components/LeagueRail";
import { MatchList } from "@/components/MatchList";
import { MarketChips } from "@/components/MarketChips";
import { Panel, Field, Tag, ErrorBox } from "@/components/ui";

const PLAYER_MARKETS = MARKETS.filter((m) => m.level === "player");

export default function PostGame() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [leagueId, setLeagueId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [marketKey, setMarketKey] = useState("sot");
  const [line, setLine] = useState("1.5");
  const [result, setResult] = useState<RealResult | null>(null);
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
    getMatches(leagueId, "finished")
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingMatches(false));
  }, [leagueId]);

  function goBack() {
    setSelectedMatch(null); setResult(null); setError("");
  }

  async function check() {
    if (!selectedMatch) return;
    setError(""); setResult(null); setLoading(true);
    try {
      setResult(await getResult(String(selectedMatch.id), marketKey, Number(line)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const rows = result ? Object.entries(result) : [];
  const hits = rows.filter(([, r]) => r.bateu).length;
  const market = MARKETS.find((m) => m.key === marketKey)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LeagueRail leagues={leagues} active={leagueId} onSelect={setLeagueId} loading={loadingLeagues} />
      </aside>

      <div className="min-w-0">
        {!selectedMatch ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="display text-2xl font-extrabold leading-none text-fg">conferir resultado</h1>
              <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
                o jogo acabou — veja por jogador o <span className="text-cyan">valor real</span> do stat e se
                bateu a linha. escolha a liga, depois o jogo finalizado.
              </p>
            </div>
            {error && <ErrorBox msg={error} />}
            {!leagueId ? (
              <Empty title="escolha uma liga" text="selecione uma liga à esquerda para ver os jogos finalizados." />
            ) : loadingMatches ? (
              <p className="mono text-sm text-cyan">carregando jogos<span className="blink">_</span></p>
            ) : (
              <MatchList matches={matches} variant="pos" onSelect={setSelectedMatch} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button onClick={goBack} className="overline self-start transition-colors hover:text-fg">
              ‹ voltar aos jogos
            </button>

            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <h1 className="display text-2xl font-extrabold leading-none text-fg">
                {selectedMatch.mandante}{" "}
                {selectedMatch.placar ? <span className="text-value">{selectedMatch.placar}</span> : <span className="text-faint">×</span>}{" "}
                {selectedMatch.visitante}
              </h1>
              <span className="overline">finalizado</span>
            </div>

            <Panel title="mercado">
              <div className="flex flex-col gap-3.5">
                <MarketChips markets={PLAYER_MARKETS} active={marketKey} onSelect={setMarketKey} />
                <Field label="linha">
                  <input className="input" value={line} onChange={(e) => setLine(e.target.value)} />
                </Field>
                <button onClick={check} disabled={loading} className="btn w-full justify-center">
                  {loading ? "conferindo…" : "▸ conferir"}
                </button>
                {error && <ErrorBox msg={error} />}
              </div>
            </Panel>

            {loading && (
              <Panel className="grid min-h-[200px] place-items-center">
                <p className="mono text-sm text-cyan">buscando resultado real<span className="blink">_</span></p>
              </Panel>
            )}

            {result && (
              <Panel
                title={`${market.label} · linha ${line}`}
                glow
                badge={<Tag tone={hits ? "value" : "muted"}>{hits}/{rows.length} bateram</Tag>}
              >
                {rows.length === 0 ? (
                  <p className="px-1 py-3 text-[0.74rem] text-muted">sem dados de jogadores para esse mercado/linha.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-[1fr_5rem_6rem] gap-3 px-3">
                      <span className="overline">jogador</span>
                      <span className="overline text-right">valor real</span>
                      <span className="overline text-right">linha {line}</span>
                    </div>
                    {rows.map(([pid, r]) => (
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

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Panel className="grid min-h-[360px] place-items-center">
      <div className="text-center">
        <div className="display text-5xl font-extrabold text-line">✓</div>
        <p className="display mt-3 text-lg font-bold text-muted">{title}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">{text}</p>
      </div>
    </Panel>
  );
}
