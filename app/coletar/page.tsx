"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLeagues, getMatches, getOddsPrompt, postAnalyzeManual, postCrosswalk,
} from "@/lib/api";
import {
  MARKETS, type League, type Match, type ManualOddsLine, type ManualAnalysisResult,
} from "@/lib/types";
import { localTime } from "@/lib/date";
import { parsePastedOdds, countByMarket } from "@/lib/manualOdds";
import { LeagueRail } from "@/components/LeagueRail";
import { MatchList } from "@/components/MatchList";
import { CandidatesTable } from "@/components/CandidatesTable";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { AiVerdict } from "@/components/AiVerdict";
import { SemMatchPanel } from "@/components/SemMatchPanel";
import { Panel, Field, Tag, ErrorBox } from "@/components/ui";

export default function Collect() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [leagueId, setLeagueId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getLeagues()
      .then(setLeagues)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingLeagues(false));
  }, []);

  useEffect(() => {
    if (!leagueId) return;
    setMatches([]); setSelectedMatch(null); setError(""); setLoadingMatches(true);
    getMatches(leagueId, "notstarted")
      .then(setMatches)
      .catch((e) => setError(e instanceof Error ? e.message : "erro inesperado"))
      .finally(() => setLoadingMatches(false));
  }, [leagueId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[170px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <LeagueRail leagues={leagues} active={leagueId} onSelect={setLeagueId} loading={loadingLeagues} />
      </aside>

      <div className="min-w-0">
        {!selectedMatch ? (
          <Browse leagueId={leagueId} matches={matches} loading={loadingMatches} error={error} onSelect={setSelectedMatch} />
        ) : (
          <Detail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
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
        <MatchList matches={matches} variant="pre" onSelect={onSelect} />
      )}
    </div>
  );
}

function Detail({ match, onBack }: { match: Match; onBack: () => void }) {
  const time = localTime(match.data);

  const [paste, setPaste] = useState("");
  const [batch, setBatch] = useState<ManualOddsLine[]>([]);
  const [pasteError, setPasteError] = useState("");
  const [result, setResult] = useState<ManualAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => countByMarket(batch), [batch]);

  function addBatch() {
    setPasteError("");
    const { lines, error: err } = parsePastedOdds(paste);
    if (err) { setPasteError(err); return; }
    setBatch((b) => [...b, ...lines]);
    setPaste("");
  }

  function clearBatch() {
    setBatch([]); setResult(null); setError("");
  }

  async function analyze() {
    if (batch.length === 0) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const r = await postAnalyzeManual({
        event_id: String(match.id),
        coletado_em: new Date().toISOString(),
        odds: batch,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function linkPlayer(nomeCasa: string, playerId: string) {
    await postCrosswalk(nomeCasa, playerId);
    await analyze(); // re-roda: agora ele casa
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

      <PromptCopier eventId={String(match.id)} />

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
          {error && <ErrorBox msg={error} />}
        </div>
      </Panel>

      {loading && (
        <Panel className="grid min-h-[200px] place-items-center">
          <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
        </Panel>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <SemMatchPanel semMatch={result.jogadores_sem_match ?? []} onLink={linkPlayer} />

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

          <RejectedLines linhas={result.linhas_rejeitadas ?? []} />

          <DiagnosticsPanel
            rejected={result.reprovados ?? []}
            open={result.candidatos.length === 0}
          />
        </div>
      )}
    </div>
  );
}

function PromptCopier({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function copy(market: string) {
    setErr(""); setBusy(market);
    try {
      const { prompt } = await getOddsPrompt(eventId, market);
      await navigator.clipboard.writeText(prompt);
      setCopied(market);
      setTimeout(() => setCopied(""), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro ao gerar prompt");
    } finally {
      setBusy("");
    }
  }

  return (
    <Panel title="copiar prompt (por mercado)" badge={<Tag tone="cyan">passo 1</Tag>}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        copie um mercado por vez e cole na IA do navegador (ela lê o site da casa). volte aqui e
        cole o JSON no passo 2.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {MARKETS.map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={busy === m.key}
            onClick={() => copy(m.key)}
            className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors disabled:opacity-50 ${
              copied === m.key
                ? "border-value text-value bg-[rgba(37,224,138,0.07)]"
                : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
            }`}
          >
            {copied === m.key ? "copiado ✓" : `⧉ ${m.label}`}
          </button>
        ))}
      </div>
      {err && <div className="mt-2"><ErrorBox msg={err} /></div>}
    </Panel>
  );
}

function RejectedLines({ linhas }: { linhas: { linha_crua: unknown; motivo: string }[] }) {
  if (!linhas.length) return null;
  return (
    <Panel title={`linhas recusadas · ${linhas.length}`} badge={<Tag tone="bad">fora do money-path</Tag>}>
      <p className="mb-2.5 text-[0.72rem] leading-relaxed text-muted">
        o sistema recusou estas linhas (odd inválida, mercado desconhecido, ou partida sem os dois
        lados). não entram na análise — confira o que a IA mandou torto.
      </p>
      <div className="flex flex-col gap-1.5">
        {linhas.map((l, i) => (
          <div key={i} className="rounded-sm border border-line bg-panel px-3 py-2 text-[0.7rem]">
            <span className="text-bad">{l.motivo}</span>
            <pre className="mono mt-1 overflow-x-auto text-[0.66rem] text-faint">{JSON.stringify(l.linha_crua)}</pre>
          </div>
        ))}
      </div>
    </Panel>
  );
}
