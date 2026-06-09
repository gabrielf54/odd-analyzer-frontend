"use client";

import { useState } from "react";
import type { SemMatch } from "@/lib/types";
import { Panel, Tag } from "@/components/ui";

/* Jogadores que a casa escreveu de um jeito que não casou na hora com a base.
   Fail-closed: o sistema não chuta — mostra os parecidos e o operador liga com
   1 clique. Ligado → some da lista; re-roda a análise pra ele aparecer. */
export function SemMatchPanel({
  semMatch,
  onLink,
}: {
  semMatch: SemMatch[];
  onLink: (nomeCasa: string, playerId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!semMatch.length) return null;

  async function link(nomeCasa: string, playerId: string) {
    setBusy(nomeCasa);
    try { await onLink(nomeCasa, playerId); }
    finally { setBusy(null); }
  }

  return (
    <Panel title={`jogadores sem correspondência · ${semMatch.length}`} badge={<Tag tone="warn">ligar à mão</Tag>}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        a casa escreveu esses nomes de um jeito que não bateu com a base — o sistema{" "}
        <strong>não chuta</strong>. confirme o jogador certo (fica salvo pras próximas).
      </p>
      <div className="flex flex-col gap-2.5">
        {semMatch.map((sm) => (
          <div key={`${sm.market_type}:${sm.nome_casa}`} className="rounded-sm border border-line bg-panel px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="display text-[0.9rem] font-bold text-fg">{sm.nome_casa}</span>
              <span className="mono text-xs text-faint">{sm.market_type}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sm.candidatos.length === 0 && (
                <span className="text-[0.7rem] text-faint">nenhum parecido na escalação</span>
              )}
              {sm.candidatos.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy === sm.nome_casa}
                  onClick={() => link(sm.nome_casa, c.id)}
                  className="rounded-sm border border-line px-2.5 py-1 text-[0.72rem] text-muted transition-colors hover:border-value hover:text-value disabled:opacity-50"
                  title={`ligar "${sm.nome_casa}" a ${c.name}`}
                >
                  {c.name} <span className="text-faint">· {(c.confianca * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
