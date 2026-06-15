"use client";

/* Toast compartilhado do repo — padrão único de notificação transitória.
   Uso: monte <ToastProvider> uma vez (app/layout.tsx) e, em qualquer client
   component, `const toast = useToast()` → toast.success/error/warn/info(msg).
   Visual casado com o tema "quant terminal": painel grafite, barra de acento
   na cor do tom, fonte mono, animação `reveal`. */

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from "react";

export type ToastTone = "value" | "bad" | "warn" | "cyan";

interface ToastItem { id: number; message: string; tone: ToastTone }
interface ToastOptions { tone?: ToastTone; duration?: number }

interface ToastApi {
  show: (message: string, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  warn: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Acesso ao toast. Lança se usado fora do provider (erro de montagem claro). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() precisa de <ToastProvider> (montado no app/layout.tsx)");
  return ctx;
}

const DEFAULT_DURATION = 3800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, opts?: ToastOptions) => {
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, message, tone: opts?.tone ?? "value" }]);
    const ms = opts?.duration ?? DEFAULT_DURATION;
    if (ms > 0) setTimeout(() => remove(id), ms);
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m, o) => show(m, { ...o, tone: "value" }),
    error: (m, o) => show(m, { ...o, tone: "bad" }),
    warn: (m, o) => show(m, { ...o, tone: "warn" }),
    info: (m, o) => show(m, { ...o, tone: "cyan" }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

/* Pilha fixa no canto inferior-direito. O container não captura clique
   (pointer-events-none) → só os cards são clicáveis, o resto da tela passa. */
function ToastViewport({ items, onDismiss }: {
  items: ToastItem[]; onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-[360px] flex-col gap-2">
      {items.map((t) => <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />)}
    </div>
  );
}

const TONE: Record<ToastTone, { bar: string; text: string; icon: string }> = {
  value: { bar: "bg-value", text: "text-value", icon: "✓" },
  bad:   { bar: "bg-bad",   text: "text-bad",   icon: "✕" },
  warn:  { bar: "bg-warn",  text: "text-warn",  icon: "⚠" },
  cyan:  { bar: "bg-cyan",  text: "text-cyan",  icon: "›" },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const t = TONE[item.tone];
  return (
    <div
      role="status"
      className="reveal pointer-events-auto flex items-stretch overflow-hidden rounded-sm border border-line bg-panel shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)]"
    >
      <span className={`w-1 shrink-0 ${t.bar}`} />
      <div className="flex flex-1 items-start gap-2.5 px-3 py-2.5">
        <span className={`text-sm leading-none ${t.text}`}>{t.icon}</span>
        <span className="flex-1 text-[0.74rem] leading-snug text-fg">{item.message}</span>
        <button onClick={onDismiss} className="-mr-0.5 text-faint transition-colors hover:text-fg" aria-label="fechar">✕</button>
      </div>
    </div>
  );
}
