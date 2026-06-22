"use client";

import { useState } from "react";
import type { AutoLigado } from "@/lib/types";
import { correctionOptions } from "@/lib/autoLink";
import { Panel, Tag } from "@/components/ui";

/* Jogadores que o sistema ligou SOZINHO com confiança intermediária [0.75,0.85):
   o nome bateu o bastante pra atribuir direto (já entra na análise). O painel é só
   transparência — mostra o que liguei e deixa CORRIGIR se errei (onLink → POST
   /crosswalk + re-análise). Sem botão de confirmar: a atribuição já aconteceu. */
export function AutoLinkedPanel({
  autoLigados,
  onLink,
}: {
  autoLigados: AutoLigado[];
  onLink: (nomeCasa: string, playerId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (!autoLigados.length) return null;

  async function link(nomeCasa: string, playerId: string) {
    setBusy(nomeCasa);
    try { await onLink(nomeCasa, playerId); }
    finally { setBusy(null); }
  }

  return (
    <Panel title={`liguei sozinho · ${autoLigados.length}`} badge={<Tag tone="cyan">confira</Tag>} collapsible defaultOpen={false}>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted">
        o nome bateu o suficiente pra eu atribuir direto — já entrou na análise. é só pra você
        conferir; se errei, escolha o certo em <strong>na verdade é</strong>.
      </p>
      <div className="flex flex-col gap-2.5">
        {autoLigados.map((al) => {
          const outros = correctionOptions(al);
          const disabled = busy === al.nome_casa;
          return (
            <div key={`${al.market_type}:${al.nome_casa}`} className="rounded-sm border border-cyan/30 bg-[rgba(79,214,255,0.04)] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="display text-[0.9rem] font-bold text-fg">{al.nome_casa}</span>
                <span className="text-faint">→</span>
                <span className="display text-[0.9rem] font-semibold text-cyan">{al.player_name}</span>
                <span className="text-[0.7rem] text-faint">· {(al.confianca * 100).toFixed(0)}%</span>
                <span className="mono text-xs text-faint">{al.market_type}</span>
              </div>
              {outros.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.66rem] text-faint">na verdade é:</span>
                  {outros.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => link(al.nome_casa, c.id)}
                      className="rounded-sm border border-line px-2.5 py-1 text-[0.72rem] text-muted transition-colors hover:border-warn hover:text-warn disabled:opacity-50"
                      title={`corrigir "${al.nome_casa}" para ${c.name}`}
                    >
                      {c.name} <span className="text-faint">· {(c.confianca * 100).toFixed(0)}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
