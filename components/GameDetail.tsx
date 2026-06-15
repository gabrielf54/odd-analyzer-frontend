"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getOddsPrompt, postAnalyzeManual, postCrosswalk,
  getOdds, getAnalysis, saveOdds, deleteOdds, coletarOdds, type CollectResult,
} from "@/lib/api";
import { oddsRowsToBatch } from "@/lib/oddsRows";
import type { Match, ManualOddsLine, Candidate } from "@/lib/types";
import { localTime } from "@/lib/date";
import { parsePastedOdds, countByMarket, aliasDiffs } from "@/lib/manualOdds";
import { copyText } from "@/lib/clipboard";
import {
  loadBatch, saveBatch, loadResult, saveResult, clearStored, type StoredResult,
} from "@/lib/coletarStorage";
import { friendlyRejection } from "@/lib/format";
import { CandidatesByPlayer } from "@/components/CandidatesByPlayer";
import { RecommendationCard } from "@/components/RecommendationCard";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { SemMatchPanel } from "@/components/SemMatchPanel";
import { PlayerDetailDrawer } from "@/components/PlayerDetailDrawer";
import { DivergenceModal } from "@/components/DivergenceModal";
import { OddsTable } from "@/components/OddsTable";
import { UnifiedOddsTable } from "@/components/UnifiedOddsTable";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Panel, Field, Tag, ErrorBox } from "@/components/ui";

type Aba = "coletar" | "unificar" | "analise";

export function GameDetail({ match, onBack }: { match: Match; onBack: () => void }) {
  const time = localTime(match.data);
  const eventId = String(match.id);
  const toast = useToast();
  const confirm = useConfirm();

  // Abre na aba "análise" se já existe resultado em cache (reabrir jogo analisado);
  // senão começa na Etapa 1 (odds). loadResult é síncrono (localStorage).
  const [aba, setAba] = useState<Aba>(() => (loadResult(eventId)?.result ? "analise" : "coletar"));
  // Entrada manual (colar / prompt) é legado raro → escondida por padrão.
  const [showManual, setShowManual] = useState(false);

  const [paste, setPaste] = useState("");
  const [batch, setBatch] = useState<ManualOddsLine[]>([]);
  const [pasteError, setPasteError] = useState("");
  const [aliasNote, setAliasNote] = useState<{ entidade: string; casa: string }[]>([]);
  // Inicializa do cache local (síncrono) → o efeito só faz a busca assíncrona no banco.
  const [stored, setStored] = useState<StoredResult | null>(() => loadResult(eventId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [collectInfo, setCollectInfo] = useState<CollectResult | null>(null);
  // Sobe a cada mutação de odds feita FORA da OddsTable (coletar/limpar/adicionar) →
  // a OddsTable usa como sinal pra refazer o fetch e atualizar a lista na hora, sem
  // o usuário precisar dar refresh na página.
  const [oddsVersion, setOddsVersion] = useState(0);

  // Guarda contra setState depois de desmontar: ao trocar de aba (jogo) no meio de um
  // request assíncrono, os handlers não tocam mais o estado da instância morta. A
  // persistência roda antes do guard, então o dado nunca se perde.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Abrir o jogo carrega odds E resultado do BANCO (fonte de verdade); localStorage
  // é só cache/fallback offline.
  useEffect(() => {
    let vivo = true;
    getAnalysis(eventId)
      .then((a) => { if (vivo && a) { setStored(a); saveResult(eventId, a); } })
      .catch(() => { /* sem banco: mantém o cache local já setado */ });
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

  // Persiste o lote a cada mudança (depois da hidratação, pra não sobrescrever).
  useEffect(() => {
    if (hydrated) saveBatch(eventId, batch);
  }, [eventId, batch, hydrated]);

  const counts = useMemo(() => countByMarket(batch), [batch]);
  const result = stored?.result ?? null;

  // Recarrega o lote do banco (verdade já deduplicada). Usado após edição manual
  // na OddsTable, pra "analisar tudo" usar as odds editadas.
  async function reloadBatch() {
    try {
      const rows = await getOdds(eventId);
      if (mountedRef.current) setBatch(oddsRowsToBatch(rows));
    } catch { /* ignora: a tela já mostra o erro da própria mutação */ }
  }

  async function addBatch() {
    setPasteError("");
    const { lines, error: err } = parsePastedOdds(paste);
    if (err) { setPasteError(err); return; }
    try {
      await saveOdds({ event_id: eventId, coletado_em: new Date().toISOString(), odds: lines });
      const rows = await getOdds(eventId);
      if (!mountedRef.current) return;
      setBatch(oddsRowsToBatch(rows));
      setOddsVersion((v) => v + 1);
      setAliasNote(aliasDiffs(lines));
      setPaste("");
    } catch (e) {
      if (mountedRef.current) setPasteError(e instanceof Error ? e.message : "erro ao salvar odds");
    }
  }

  function clearBatch() {
    setBatch([]); setStored(null); setError(""); setAliasNote([]);
    setCollectInfo(null); setCollectError("");
    clearStored(eventId);
    setOddsVersion((v) => v + 1);
    deleteOdds(eventId).catch(() => { /* limpeza local já feita; ignora falha de rede */ });
  }

  // Botão "limpar todas" da OddsTable: apaga TODAS as odds do jogo no banco. Abre o
  // modal de confirmação universal (destrutivo → tom "bad"); só apaga se confirmar.
  // Espera a remoção e só então zera a tela (evita o "fantasma" de odd que já sumiu
  // do banco mas ficou no cache local). Resultado vai pro toast.
  async function clearAllOdds() {
    const ok = await confirm({
      title: "Apagar todas as odds?",
      message: "Isso remove TODAS as odds deste jogo do banco — e a ANÁLISE salva junto (ela depende dessas odds). Não dá pra desfazer.",
      confirmLabel: "Apagar tudo",
      tone: "bad",
    });
    if (!ok) return;
    setError(""); setCollectError("");
    try {
      await deleteOdds(eventId); // backend: clear total também apaga a análise órfã
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "erro ao apagar odds");
      return;
    }
    if (!mountedRef.current) return;
    setBatch([]); setStored(null); setAliasNote([]); setCollectInfo(null);
    clearStored(eventId);
    setOddsVersion((v) => v + 1);
    setAba("coletar"); // a análise sumiu → volta pro começo do fluxo
    toast.success("Odds e análise deste jogo foram apagadas.");
  }

  async function autoCollect() {
    setCollectError(""); setCollecting(true);
    try {
      const r = await coletarOdds(eventId);
      const rows = await getOdds(eventId);
      if (!mountedRef.current) return;
      setBatch(oddsRowsToBatch(rows));
      setOddsVersion((v) => v + 1);
      setCollectInfo(r);
    } catch (e) {
      if (mountedRef.current) setCollectError(e instanceof Error ? e.message : "erro ao coletar odds");
    } finally {
      if (mountedRef.current) setCollecting(false);
    }
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
      saveResult(eventId, s); // persiste ANTES do guard → sobrevive à troca de aba
      if (!mountedRef.current) return;
      setStored(s);
      setAba("analise"); // leva o usuário direto pro resultado
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : "erro inesperado");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function linkPlayer(nomeCasa: string, playerId: string) {
    try {
      await postCrosswalk(nomeCasa, playerId);
      if (!mountedRef.current) return;
      await analyze();
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : "erro ao vincular jogador");
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

      {/* Abas: Etapa 1 (coletar) / Etapa 2 (unificar) / Etapa 3 (análise) — troca livre. */}
      <div className="flex items-stretch border-b border-line">
        {(["coletar", "unificar", "analise"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`relative px-4 py-2 text-[0.72rem] transition-colors ${aba === t ? "text-value" : "text-faint hover:text-muted"}`}
          >
            {aba === t && <span className="absolute inset-x-0 top-0 h-[2px] bg-value shadow-[0_0_10px_rgba(37,224,138,0.6)]" />}
            {t === "coletar" ? "Etapa 1 · Coletar" : t === "unificar" ? "Etapa 2 · Unificar" : "Etapa 3 · Análise"}
            {t === "analise" && result && <span className="ml-1.5 text-value">●</span>}
          </button>
        ))}
      </div>

      {aba === "coletar" && (
        <div className="flex flex-col gap-4">
          <AutoCollect collecting={collecting} error={collectError} info={collectInfo} onCollect={autoCollect} />

          {/* Log cru: todas as casas/grafias no banco, com filtro e edição manual. */}
          <Panel title="odds cruas (log · todas as casas)" badge={<Tag tone="muted">log</Tag>}>
            <OddsTable eventId={eventId} onChange={reloadBatch} reloadSignal={oddsVersion} onClearAll={clearAllOdds} />
          </Panel>

          {batch.length > 0 && (
            <button
              onClick={() => setAba("unificar")}
              className="btn w-full justify-center"
            >
              {batch.length} odds no lote · conferir odds unificadas ›
            </button>
          )}

          {/* Entrada manual (colar odds · copiar prompt): legado, raramente usado.
              Recolhida por padrão — a coleta automática é o caminho. Não ocupa a tela. */}
          <div className="rounded-sm border border-line-soft">
            <button
              onClick={() => setShowManual((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.72rem] text-muted transition-colors hover:text-fg"
              aria-expanded={showManual}
            >
              <span className={`text-faint transition-transform ${showManual ? "rotate-90" : ""}`}>▸</span>
              entrada manual <span className="text-faint">(colar odds · copiar prompt)</span>
              <span className="ml-auto text-[0.62rem] uppercase tracking-[0.16em] text-faint">raramente usado</span>
            </button>

            {showManual && (
              <div className="flex flex-col gap-4 border-t border-line-soft p-3">
                <Panel title="colar odds da IA" badge={<Tag tone="cyan">manual</Tag>}>
                  <div className="flex flex-col gap-3">
                    <Field
                      label="cole aqui o que a IA devolveu"
                      hint="formato compacto (book no topo, campos por |) ou JSON — pode colar um mercado por vez, vão se somando ao lote."
                    >
                      <textarea
                        className="input min-h-[120px] font-mono text-[0.72rem]"
                        value={paste}
                        onChange={(e) => setPaste(e.target.value)}
                        placeholder={"book=bet365\nsot|K. Havertz|0.5|2.1\ndesarmes|J. Kimmich|1.5|1.9"}
                      />
                    </Field>
                    {pasteError && <ErrorBox msg={pasteError} />}
                    {aliasNote.length > 0 && (
                      <div className="rounded-sm border border-warn/40 bg-[rgba(255,177,61,0.08)] px-3 py-2 text-[0.72rem] text-warn">
                        {aliasNote.length} nome(s) a casa exibe diferente — confira o match:
                        <ul className="mt-1 list-disc pl-4">
                          {aliasNote.map((a) => (
                            <li key={a.entidade + a.casa}><span className="font-mono">{a.casa}</span> → {a.entidade}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                  </div>
                </Panel>

                <PromptCopier eventId={eventId} />
              </div>
            )}
          </div>
        </div>
      )}

      {aba === "unificar" && (
        <div className="flex flex-col gap-4">
          {/* Espelho canônico: 1 aposta por linha, melhor preço — o que a ANÁLISE considera.
              Confira aqui o que o line shopping decidiu antes de analisar. */}
          <Panel title="odds unificadas (o que a análise considera)" badge={<Tag tone="value">decisão</Tag>}>
            <UnifiedOddsTable eventId={eventId} reloadSignal={oddsVersion} />
          </Panel>

          <button
            onClick={() => setAba(batch.length > 0 ? "analise" : "coletar")}
            className="btn w-full justify-center"
          >
            {batch.length > 0 ? "ir pra análise ›" : "‹ voltar pra coletar"}
          </button>
        </div>
      )}

      {aba === "analise" && (
        <div className="flex flex-col gap-4">
          {result ? (
            <BatchSummaryBar
              count={batch.length}
              analisadoEm={stored?.analisado_em ?? null}
              loading={loading}
              onEdit={() => setAba("coletar")}
              onReanalyze={analyze}
            />
          ) : (
            <Panel title="rodar análise" badge={<Tag tone="value">Etapa 3</Tag>}>
              <div className="flex flex-col gap-3">
                <p className="text-[0.74rem] leading-relaxed text-muted">
                  {batch.length > 0 ? (
                    <><strong className="text-fg">{batch.length}</strong> odds no lote, prontas. clique pra cruzar com o modelo e ver as apostas de valor.</>
                  ) : (
                    <>nenhuma odd no lote — colete primeiro na <button onClick={() => setAba("coletar")} className="text-value underline">Etapa 1 · Coletar</button>.</>
                  )}
                </p>
                <button onClick={analyze} disabled={loading || batch.length === 0} className="btn w-full justify-center">
                  {loading ? "analisando…" : "▸ analisar tudo"}
                </button>
              </div>
            </Panel>
          )}

          {error && <ErrorBox msg={error} />}

          {loading && (
            <Panel className="grid min-h-[200px] place-items-center">
              <p className="mono text-sm text-value">cruzando estatísticas<span className="blink">_</span></p>
            </Panel>
          )}

          {result && (
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
        </div>
      )}

      <PlayerDetailDrawer candidate={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/* Barra compacta da Etapa 3: o lote vira uma linha; editar volta pra Etapa 1 (Coletar). */
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
          ‹ editar odds
        </button>
        <button onClick={onReanalyze} disabled={loading}
          className="rounded-sm border border-value/40 px-2.5 py-1 text-[0.72rem] text-value transition-colors hover:bg-[rgba(37,224,138,0.08)] disabled:opacity-50">
          {loading ? "analisando…" : "▸ re-analisar"}
        </button>
      </span>
    </div>
  );
}

// Um prompt só: coleta o JOGO INTEIRO (partida + jogador) numa passada.
const PROMPT_GROUPS = [
  {
    key: "tudo",
    label: "jogo inteiro",
    hint: "partida (gols · 1X2 · escanteios) + jogador (chutes · finalizações · desarmes · faltas · passes)",
  },
];

/* PASSO 1 automático: chama POST /jogos/:id/coletar-odds e mostra o resumo. */
function AutoCollect({
  collecting, error, info, onCollect,
}: {
  collecting: boolean; error: string; info: CollectResult | null; onCollect: () => void;
}) {
  const [showDiverg, setShowDiverg] = useState(false);
  return (
    <Panel title="obter odds (automático)" badge={<Tag tone="value">recomendado</Tag>}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        o sistema acha o jogo nas casas (<span className="text-value">KTO</span> +{" "}
        <span className="text-value">Betnacional</span> +{" "}
        <span className="text-value">Superbet</span>), coleta, escolhe o melhor preço e grava — sem
        copiar prompt. depois é só <span className="text-value">analisar tudo</span>.
      </p>
      <button onClick={onCollect} disabled={collecting} className="btn w-full justify-center">
        {collecting ? "coletando nas casas… (pode levar alguns segundos)" : "⟳ obter odds automático"}
      </button>
      {error && <div className="mt-2"><ErrorBox msg={error} /></div>}
      {info && !collecting && (
        <div className="mt-3 rounded-sm border border-line bg-panel-2 px-3 py-2.5 text-[0.72rem]">
          <div className="flex flex-wrap items-center gap-1.5">
            {info.casas.length === 0
              ? <Tag tone="bad">nenhuma casa achou o jogo</Tag>
              : info.casas.map((c) => (
                  <Tag key={c.book} tone={c.ok ? "value" : "bad"}>
                    {c.book} {c.ok ? `✓ ${c.n}` : `✗ ${c.erro ?? "falhou"}`}
                  </Tag>
                ))}
          </div>
          <p className="mt-2 text-muted">
            {info.n_line_shop} linhas após melhor-preço ·{" "}
            <span className="text-value">{info.gravadas} gravadas no lote</span>
            {info.linhas_rejeitadas ? ` · ${info.linhas_rejeitadas} recusadas` : ""}
          </p>
          {info.divergencias.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDiverg(true)}
              className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-warn/40 px-2 py-0.5 text-[0.66rem] text-warn transition-colors hover:bg-warn/10"
            >
              ⚠ {info.divergencias.length} divergência(s) — investigar
            </button>
          )}
        </div>
      )}
      {showDiverg && info && (
        <DivergenceModal divergencias={info.divergencias} onClose={() => setShowDiverg(false)} />
      )}
    </Panel>
  );
}

function PromptCopier({ eventId }: { eventId: string }) {
  const [active, setActive] = useState<{ market: string; label: string; prompt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

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

  async function copyAgain() {
    if (!active) return;
    setCopied(await copyText(active.prompt));
  }

  return (
    <Panel title="copiar prompt (manual — outras casas)" badge={<Tag tone="muted">alternativa</Tag>}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        opcional, p/ casas que a coleta automática não cobre (ex.: Betano, bet365): copie, cole na IA do
        navegador (ela lê o site da casa), e volte pra colar o resultado abaixo.
      </p>
      <div className="grid gap-2">
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
