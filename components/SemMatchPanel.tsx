"use client";

import { useState } from "react";
import type { SemMatch } from "@/lib/types";
import { Panel, Tag } from "@/components/ui";

/* Jogadores que a casa escreveu de um jeito que não casou na hora com a base.
   Fail-closed: o sistema não chuta — mostra os parecidos e o operador escolhe.
   Antes era 1 clique = 1 vínculo = 1 re-análise (N jogadores → N requests caras).
   Agora: MARCA o certo em cada um e reanalisa TODOS de uma vez (1 só re-análise). */
export function SemMatchPanel({
  semMatch,
  onLinkMany,
}: {
  semMatch: SemMatch[];
  onLinkMany: (pares: { nomeCasa: string; playerId: string }[]) => Promise<void>;
}) {
  // rowKey (`market_type:nome_casa`) → playerId marcado pro operador.
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!semMatch.length) return null;

  const keyOf = (sm: SemMatch) => `${sm.market_type}:${sm.nome_casa}`;
  const selecionaveis = semMatch.filter((sm) => sm.candidatos.length > 0);
  const marcados = Object.keys(picks).length;

  function toggle(rowKey: string, id: string) {
    setPicks((p) => {
      const next = { ...p };
      if (next[rowKey] === id) delete next[rowKey]; // re-clicar no mesmo = desmarca
      else next[rowKey] = id;
      return next;
    });
  }

  function marcarMelhorDeCada() {
    const next: Record<string, string> = {};
    for (const sm of selecionaveis) next[keyOf(sm)] = sm.candidatos[0].id; // candidatos vêm ordenados por confiança
    setPicks(next);
  }

  async function submit() {
    const porKey = new Map(semMatch.map((sm) => [keyOf(sm), sm]));
    const vistos = new Set<string>();
    const pares: { nomeCasa: string; playerId: string }[] = [];
    for (const [rowKey, playerId] of Object.entries(picks)) {
      const sm = porKey.get(rowKey);
      if (!sm) continue;
      const dedup = `${sm.nome_casa}:${playerId}`; // mesmo nome em 2 mercados = 1 vínculo só
      if (vistos.has(dedup)) continue;
      vistos.add(dedup);
      pares.push({ nomeCasa: sm.nome_casa, playerId });
    }
    if (!pares.length) return;
    setBusy(true);
    try {
      await onLinkMany(pares);
      setPicks({});
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={`jogadores sem correspondência · ${semMatch.length}`}
      badge={<Tag tone="warn">ligar à mão</Tag>}
      collapsible
      defaultOpen={false}
    >
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        a casa escreveu esses nomes de um jeito que não bateu com a base — o sistema{" "}
        <strong>não chuta</strong>. marque o jogador certo em cada um e{" "}
        <strong>reanalise todos de uma vez</strong> (fica salvo pras próximas).
      </p>

      <div className="flex flex-col gap-2.5">
        {semMatch.map((sm) => {
          const rowKey = keyOf(sm);
          const marcado = picks[rowKey];
          const armado = Boolean(marcado);
          return (
            <div
              key={rowKey}
              className={`rounded-sm border px-3 py-2.5 transition-colors ${
                armado ? "border-value/50 bg-[rgba(37,224,138,0.05)]" : "border-line bg-panel"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`grid h-3.5 w-3.5 flex-none place-items-center rounded-[3px] border text-[0.6rem] leading-none ${
                    armado ? "border-value bg-value text-[#04130b]" : "border-line text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="display text-[0.9rem] font-bold text-fg">{sm.nome_casa}</span>
                <span className="mono text-xs text-faint">{sm.market_type}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sm.candidatos.length === 0 && (
                  <span className="text-[0.7rem] text-faint">nenhum parecido na escalação</span>
                )}
                {sm.candidatos.map((c) => {
                  const sel = marcado === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      aria-pressed={sel}
                      onClick={() => toggle(rowKey, c.id)}
                      className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors disabled:opacity-50 ${
                        sel
                          ? "border-value bg-[rgba(37,224,138,0.1)] text-value"
                          : "border-line text-muted hover:border-value/60 hover:text-value"
                      }`}
                      title={`marcar "${sm.nome_casa}" como ${c.name}`}
                    >
                      {c.name}{" "}
                      <span className={sel ? "text-value/70" : "text-faint"}>
                        · {(c.confianca * 100).toFixed(0)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
        <div className="flex items-center gap-3">
          <span className="text-[0.7rem] text-muted">
            <strong className="text-fg">{marcados}</strong> de {selecionaveis.length} marcado(s)
          </span>
          {marcados > 0 ? (
            <button
              type="button"
              onClick={() => setPicks({})}
              disabled={busy}
              className="text-[0.68rem] text-faint underline-offset-2 hover:text-muted hover:underline disabled:opacity-50"
            >
              limpar
            </button>
          ) : selecionaveis.length > 0 ? (
            <button
              type="button"
              onClick={marcarMelhorDeCada}
              disabled={busy}
              className="text-[0.68rem] text-faint underline-offset-2 hover:text-muted hover:underline disabled:opacity-50"
            >
              marcar melhor de cada
            </button>
          ) : null}
        </div>
        <button type="button" onClick={submit} disabled={busy || marcados === 0} className="btn">
          {busy ? "reanalisando…" : `▸ vincular e reanalisar${marcados ? ` · ${marcados}` : ""}`}
        </button>
      </div>
    </Panel>
  );
}
