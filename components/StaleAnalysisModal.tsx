"use client";

/* Aviso BLOQUEANTE de análise desatualizada: o usuário mexeu numa odd de um jogo que já
   tem análise salva. NÃO dá pra sair sem escolher — re-analisar (recalcula) OU excluir a
   análise (assume que ficou velha). Sem Esc, sem clicar no fundo: é decisão obrigatória. */
export function StaleAnalysisModal({
  busy, onReanalyze, onDelete,
}: { busy: boolean; onReanalyze: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* fundo SEM onClick: não fecha clicando fora (escolha obrigatória) */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" aria-hidden />
      <div
        role="alertdialog" aria-modal="true" aria-labelledby="stale-title"
        className="relative flex w-full max-w-md flex-col gap-3 rounded-md border border-warn/50 bg-panel p-5 shadow-xl"
      >
        <h2 id="stale-title" className="display text-lg font-extrabold text-warn">⚠ análise desatualizada</h2>
        <p className="text-[0.78rem] leading-relaxed text-muted">
          Você mexeu nas odds deste jogo, mas existe uma <span className="text-fg">análise salva</span> que
          foi calculada com as odds antigas. Ela ficou <span className="text-warn">desatualizada</span>.
          Escolha o que fazer pra seguir:
        </p>
        <div className="mt-1 flex flex-col gap-2">
          <button
            onClick={onReanalyze} disabled={busy}
            className="btn w-full justify-center"
          >
            {busy ? "processando…" : "▸ Re-analisar agora (recalcular com as odds atuais)"}
          </button>
          <button
            onClick={onDelete} disabled={busy}
            className="w-full rounded-sm border border-bad/50 px-3 py-2 text-[0.78rem] text-bad transition-colors hover:bg-bad/10 disabled:opacity-50"
          >
            🗑 Excluir análise (assumir que ficou velha)
          </button>
        </div>
      </div>
    </div>
  );
}
