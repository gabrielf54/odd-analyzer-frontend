"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  getLeagues, getMatches, getOddsPrompt, postAnalyzeManual, postCrosswalk,
} from "@/lib/api";
import {
  type League, type Match, type ManualOddsLine, type ManualAnalysisResult, type Candidate,
} from "@/lib/types";
import { localTime } from "@/lib/date";
import { parsePastedOdds, countByMarket } from "@/lib/manualOdds";
import { copyText } from "@/lib/clipboard";
import { useUrlState } from "@/lib/urlState";
import {
  loadBatch, saveBatch, loadResult, saveResult, clearStored, type StoredResult,
} from "@/lib/coletarStorage";
import { friendlyRejection } from "@/lib/format";
import { LeagueRail } from "@/components/LeagueRail";
import { MatchList } from "@/components/MatchList";
import { CandidatesByPlayer } from "@/components/CandidatesByPlayer";
import { RecommendationCard } from "@/components/RecommendationCard";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { SemMatchPanel } from "@/components/SemMatchPanel";
import { PlayerDetailDrawer } from "@/components/PlayerDetailDrawer";
import { Panel, Field, Tag, ErrorBox } from "@/components/ui";

function Collect() {
  const { leagueId, matchId, setLeague, setMatch, clearMatch } = useUrlState();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState("");

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

  const selectedMatch = useMemo(
    () => matches.find((m) => String(m.id) === matchId) ?? null,
    [matches, matchId],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LeagueRail leagues={leagues} active={leagueId} onSelect={setLeague} loading={loadingLeagues} />
      </aside>

      <div className="min-w-0">
        {!selectedMatch ? (
          <Browse leagueId={leagueId} matches={matches} loading={loadingMatches} error={error}
            onSelect={(m) => setMatch(String(m.id))} />
        ) : (
          <Detail key={String(selectedMatch.id)} match={selectedMatch} onBack={clearMatch} />
        )}
      </div>
    </div>
  );
}

export default function CollectPage() {
  return (
    <Suspense fallback={<p className="mono text-sm text-value">carregando<span className="blink">_</span></p>}>
      <Collect />
    </Suspense>
  );
}

function Browse({
  leagueId, matches, loading, error, onSelect,
}: {
  leagueId: string; matches: Match[]; loading: boolean; error: string; onSelect: (j: Match) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="display text-2xl font-extrabold leading-none text-fg">coletar odds</h1>
        <p className="mt-2 max-w-xl text-[0.74rem] leading-relaxed text-muted">
          sem API de odds barata: você copia o <span className="text-value">prompt</span>, a IA do
          navegador lê o site da casa e devolve um JSON, você cola aqui e o sistema analisa{" "}
          <span className="text-value">todos os mercados</span> de uma vez. escolha a liga e o jogo.
        </p>
      </div>

      {error && <ErrorBox msg={error} />}

      {!leagueId ? (
        <Panel className="grid min-h-[360px] place-items-center">
          <div className="text-center">
            <div className="display text-5xl font-extrabold text-line">⌖</div>
            <p className="display mt-3 text-lg font-bold text-muted">escolha uma liga</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[0.72rem] leading-relaxed text-faint">
              selecione uma liga à esquerda para ver os jogos não iniciados.
            </p>
          </div>
        </Panel>
      ) : loading ? (
        <p className="mono text-sm text-value">carregando jogos<span className="blink">_</span></p>
      ) : (
        <MatchList matches={matches} onSelect={onSelect} />
      )}
    </div>
  );
}

function Detail({ match, onBack }: { match: Match; onBack: () => void }) {
  const time = localTime(match.data);
  const eventId = String(match.id);

  const [paste, setPaste] = useState("");
  const [batch, setBatch] = useState<ManualOddsLine[]>([]);
  const [pasteError, setPasteError] = useState("");
  const [stored, setStored] = useState<StoredResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // F5-proof: hidrata lote + resultado do localStorage (SSR-safe: só no mount).
  useEffect(() => {
    setBatch(loadBatch(eventId));
    setStored(loadResult(eventId));
    setHydrated(true);
  }, [eventId]);

  // Persiste o lote a cada mudança (depois da hidratação, pra não sobrescrever).
  useEffect(() => {
    if (hydrated) saveBatch(eventId, batch);
  }, [eventId, batch, hydrated]);

  const counts = useMemo(() => countByMarket(batch), [batch]);
  const result = stored?.result ?? null;
  const fase: "coleta" | "resultado" = result && !editing ? "resultado" : "coleta";

  function addBatch() {
    setPasteError("");
    const { lines, error: err } = parsePastedOdds(paste);
    if (err) { setPasteError(err); return; }
    setBatch((b) => [...b, ...lines]);
    setPaste("");
  }

  function clearBatch() {
    setBatch([]); setStored(null); setError(""); setEditing(false);
    clearStored(eventId);
  }

  async function analyze() {
    if (batch.length === 0) return;
    setError(""); setLoading(true);
    try {
      const r = await postAnalyzeManual({
        event_id: eventId,
        coletado_em: new Date().toISOString(),
        odds: batch,
      });
      const s = { result: r, analisado_em: new Date().toISOString() };
      setStored(s);
      saveResult(eventId, s);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function linkPlayer(nomeCasa: string, playerId: string) {
    try {
      await postCrosswalk(nomeCasa, playerId);
      await analyze(); // re-roda: agora ele casa
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro ao vincular jogador");
    }
  }

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

      {fase === "resultado" && result ? (
        <BatchSummaryBar
          count={batch.length}
          analisadoEm={stored?.analisado_em ?? null}
          loading={loading}
          onEdit={() => setEditing(true)}
          onReanalyze={analyze}
        />
      ) : (
        <>
          <PromptCopier eventId={eventId} />

          <Panel title="colar odds (JSON da IA)" badge={<Tag tone="cyan">passo 2</Tag>}>
            <div className="flex flex-col gap-3">
              <Field
                label="cole aqui o que a IA devolveu"
                hint="pode colar um mercado por vez — vão se somando ao lote abaixo."
              >
                <textarea
                  className="input min-h-[120px] font-mono text-[0.72rem]"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder='[ { "market_type": "sot", "entidade": "K. Havertz", "linha": 0.5, "odd_over": 2.1, "book": "bet365" } ]'
                />
              </Field>
              {pasteError && <ErrorBox msg={pasteError} />}
              <button
                onClick={addBatch}
                className="flex w-full items-center justify-center rounded-sm border border-line py-2 text-[0.78rem] text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                ＋ adicionar ao lote
              </button>

              {batch.length > 0 && (
                <div className="rounded-sm border border-line bg-panel-2 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="overline">lote · {batch.length} linhas</span>
                    <button onClick={clearBatch} className="text-[0.7rem] text-faint transition-colors hover:text-bad">
                      limpar lote
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(counts).map(([m, n]) => (
                      <Tag key={m} tone="muted">{m} · {n}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={analyze} disabled={loading || batch.length === 0} className="btn w-full justify-center">
                {loading ? "analisando…" : "▸ analisar tudo"}
              </button>
              {result && (
                <button onClick={() => setEditing(false)} className="text-[0.72rem] text-faint transition-colors hover:text-fg">
                  ‹ voltar ao resultado (sem re-analisar)
                </button>
              )}
              {error && <ErrorBox msg={error} />}
            </div>
          </Panel>
        </>
      )}

      {loading && (
        <Panel className="grid min-h-[200px] place-items-center">
          <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
        </Panel>
      )}

      {fase === "resultado" && result && (
        <div className="flex flex-col gap-4">
          <SemMatchPanel semMatch={result.jogadores_sem_match ?? []} onLink={linkPlayer} />

          <div className="reveal">
            <Panel title="aposta recomendada" glow badge={<Tag tone="muted">código decide · IA revisa</Tag>}>
              <RecommendationCard candidates={result.candidatos} ia={result.ia} />
            </Panel>
          </div>

          <div className="reveal" style={{ animationDelay: "60ms" }}>
            <Panel title={`candidatos · ${result.candidatos.length}`} badge={<Tag tone="value">vantagem a favor</Tag>}>
              <CandidatesByPlayer candidates={result.candidatos} onDetail={setDetail} />
            </Panel>
          </div>

          <RejectedLines linhas={result.linhas_rejeitadas ?? []} />

          <DiagnosticsPanel
            rejected={result.reprovados ?? []}
            open={result.candidatos.length === 0}
          />
        </div>
      )}

      <PlayerDetailDrawer candidate={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/* Barra compacta da fase resultado: o lote vira uma linha; o formulário não
   ocupa mais o topo depois de analisado. */
function BatchSummaryBar({
  count, analisadoEm, loading, onEdit, onReanalyze,
}: {
  count: number; analisadoEm: string | null; loading: boolean;
  onEdit: () => void; onReanalyze: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-panel-2 px-3 py-2.5">
      <span className="overline">
        lote · {count} linhas{analisadoEm ? ` · analisado ${localTime(analisadoEm) ?? ""}` : ""}
      </span>
      <span className="flex items-center gap-2">
        <button onClick={onEdit}
          className="rounded-sm border border-line px-2.5 py-1 text-[0.72rem] text-muted transition-colors hover:border-cyan hover:text-cyan">
          editar lote
        </button>
        <button onClick={onReanalyze} disabled={loading}
          className="rounded-sm border border-value/40 px-2.5 py-1 text-[0.72rem] text-value transition-colors hover:bg-[rgba(37,224,138,0.08)] disabled:opacity-50">
          {loading ? "analisando…" : "▸ re-analisar"}
        </button>
      </span>
    </div>
  );
}

// Dois prompts, não seis: um pra todas as estatísticas de jogador, outro pra
// todas as de partida. Mais intuitivo pro operador pesquisar na casa.
const PROMPT_GROUPS = [
  { key: "jogador", label: "estatísticas de jogador", hint: "chutes a gol · finalizações · desarmes" },
  { key: "partida", label: "estatísticas dos jogos", hint: "gols · resultado (1X2) · escanteios" },
];

function PromptCopier({ eventId }: { eventId: string }) {
  const [active, setActive] = useState<{ market: string; label: string; prompt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Busca o prompt e já tenta copiar. Se a cópia automática falhar (foco/permissão),
  // o textarea abaixo fica visível pra cópia manual — o prompt nunca se perde.
  async function load(market: string, label: string) {
    setErr(""); setBusy(market); setCopied(false);
    try {
      const { prompt } = await getOddsPrompt(eventId, market);
      setActive({ market, label, prompt });
      const ok = await copyText(prompt);
      setCopied(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro ao gerar prompt");
    } finally {
      setBusy("");
    }
  }

  // Botão de cópia manual: roda dentro do clique, com o texto já em memória
  // (sem gap de fetch) → confiável mesmo quando a cópia automática falha.
  async function copyAgain() {
    if (!active) return;
    setCopied(await copyText(active.prompt));
  }

  return (
    <Panel title="copiar prompt (por mercado)" badge={<Tag tone="cyan">passo 1</Tag>}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        são só dois: um pras estatísticas de jogador, outro pras do jogo. copie um, cole na IA do
        navegador (ela lê o site da casa), e volte pra colar o JSON no passo 2.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROMPT_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            disabled={busy === g.key}
            onClick={() => load(g.key, g.label)}
            className={`flex flex-col items-start gap-0.5 rounded-sm border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
              active?.market === g.key
                ? "border-cyan text-cyan bg-[rgba(79,214,255,0.07)]"
                : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
            }`}
          >
            <span className="display text-[0.85rem] font-bold">
              {busy === g.key ? "gerando…" : `⧉ ${g.label}`}
            </span>
            <span className="text-[0.66rem] text-faint">{g.hint}</span>
          </button>
        ))}
      </div>

      {err && <div className="mt-2"><ErrorBox msg={err} /></div>}

      {active && (
        <div className="mt-3 rounded-sm border border-line bg-panel-2 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="overline">prompt · {active.label}</span>
            <button
              type="button"
              onClick={copyAgain}
              className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
                copied
                  ? "border-value text-value bg-[rgba(37,224,138,0.07)]"
                  : "border-line text-muted hover:border-cyan hover:text-cyan"
              }`}
            >
              {copied ? "copiado ✓" : "⧉ copiar"}
            </button>
          </div>
          <textarea
            readOnly
            value={active.prompt}
            onFocus={(e) => e.currentTarget.select()}
            className="input min-h-[120px] w-full font-mono text-[0.7rem]"
          />
          {!copied && (
            <p className="mt-1.5 text-[0.66rem] text-faint">
              se o botão não copiar, clique no texto (ele seleciona tudo) e use Ctrl+C.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function RejectedLines({ linhas }: { linhas: { linha_crua: unknown; motivo: string }[] }) {
  if (!linhas.length) return null;
  return (
    <Panel title={`linhas recusadas · ${linhas.length}`} badge={<Tag tone="bad">fora da análise</Tag>}>
      <p className="mb-2.5 text-[0.72rem] leading-relaxed text-muted">
        o sistema recusou estas linhas — elas não entram na análise. confira o que a IA copiou do site.
      </p>
      <div className="flex flex-col gap-1.5">
        {linhas.map((l, i) => (
          <div key={i} className="rounded-sm border border-line bg-panel px-3 py-2 text-[0.7rem]">
            <span className="text-bad">{friendlyRejection(l.motivo)}</span>
            <details className="mt-1">
              <summary className="cursor-pointer text-[0.64rem] text-faint hover:text-muted">ver dado bruto</summary>
              <pre className="mono mt-1 overflow-x-auto text-[0.66rem] text-faint">{JSON.stringify(l.linha_crua)}</pre>
            </details>
          </div>
        ))}
      </div>
    </Panel>
  );
}
