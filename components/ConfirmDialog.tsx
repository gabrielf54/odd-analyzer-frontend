"use client";

/* Modal de confirmação compartilhado do repo — padrão único p/ ações destrutivas
   ou irreversíveis. Substitui o window.confirm() nativo.
   Uso: monte <ConfirmProvider> uma vez (app/layout.tsx) e, em qualquer client
   component:

     const confirm = useConfirm();
     if (await confirm({ title: "Apagar?", tone: "bad" })) { ... }

   Aparece centrado, em foco, com overlay; ESC/click-fora = cancela, Enter = confirma.
   Visual casado com o tema "quant terminal" (.panel grafite, .reveal, fonte mono). */

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";

type ConfirmTone = "bad" | "value";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Acesso ao modal de confirmação. Lança se usado fora do provider. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm() precisa de <ConfirmProvider> (montado no app/layout.tsx)");
  return ctx;
}

interface Pending { opts: ConfirmOptions; resolve: (v: boolean) => void }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Se já havia um aberto, resolve o antigo como cancelado (evita promessa pendurada).
    return new Promise<boolean>((resolve) => {
      setPending((prev) => { prev?.resolve(false); return { opts, resolve }; });
    });
  }, []);

  const settle = useCallback((v: boolean) => {
    setPending((prev) => { prev?.resolve(v); return null; });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmModal opts={pending.opts} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

const TONE: Record<ConfirmTone, { icon: string; iconText: string; confirmBtn: string }> = {
  bad: {
    icon: "⚠", iconText: "text-bad",
    confirmBtn: "border-bad/60 bg-[rgba(255,93,99,0.1)] text-bad hover:bg-[rgba(255,93,99,0.2)]",
  },
  value: {
    icon: "?", iconText: "text-value",
    confirmBtn: "border-value/60 bg-[rgba(37,224,138,0.1)] text-value hover:bg-[rgba(37,224,138,0.2)]",
  },
};

function ConfirmModal({ opts, onSettle }: { opts: ConfirmOptions; onSettle: (v: boolean) => void }) {
  const t = TONE[opts.tone ?? "value"];
  const okRef = useRef<HTMLButtonElement>(null);

  // Foco no botão de confirmar ao abrir; teclado (ESC = cancela, Enter = confirma);
  // trava o scroll do fundo enquanto aberto.
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onSettle(false); }
      else if (e.key === "Enter") { e.preventDefault(); onSettle(true); }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onSettle]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* overlay: clicar fora cancela */}
      <button
        aria-hidden tabIndex={-1} onClick={() => onSettle(false)}
        className="absolute inset-0 cursor-default bg-bg/75 backdrop-blur-sm"
      />
      <div
        role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="reveal panel scan relative z-10 w-full max-w-sm p-5 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.95)]"
      >
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 text-lg leading-none ${t.iconText}`}>{t.icon}</span>
          <div className="flex-1">
            <h2 id="confirm-title" className="display text-base font-bold leading-snug text-fg">{opts.title}</h2>
            {opts.message && (
              <div className="mt-1.5 text-[0.78rem] leading-relaxed text-muted">{opts.message}</div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onSettle(false)}
            className="rounded-sm border border-line px-3 py-1.5 text-[0.74rem] text-muted transition-colors hover:border-[#2c3744] hover:text-fg"
          >
            {opts.cancelLabel ?? "Cancelar"}
          </button>
          <button
            ref={okRef}
            onClick={() => onSettle(true)}
            className={`rounded-sm border px-3 py-1.5 text-[0.74rem] font-semibold transition-colors ${t.confirmBtn}`}
          >
            {opts.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
