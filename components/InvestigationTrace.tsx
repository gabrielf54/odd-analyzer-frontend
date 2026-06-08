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
