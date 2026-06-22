import type { ReactNode } from "react";

/* Painel-base com "chrome" de janela de terminal. */
export function Panel({
  title,
  badge,
  children,
  className = "",
  glow = false,
  collapsible = false,
  defaultOpen = false,
}: {
  title?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  /* nasce fechado; clica no cabeçalho pra abrir (native <details>, sem JS). */
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (collapsible && title) {
    return (
      <details
        className={`panel relative overflow-hidden ${glow ? "scan" : ""} ${className}`}
        open={defaultOpen}
      >
        <summary className="flex select-none items-center justify-between border-b border-line-soft px-4 py-2.5 transition-colors hover:bg-panel-2">
          <span className="overline flex items-center gap-2">
            <span className="caret text-faint">▸</span>
            {title}
          </span>
          {badge}
        </summary>
        <div className="p-4">{children}</div>
      </details>
    );
  }
  return (
    <section
      className={`panel relative overflow-hidden ${glow ? "scan" : ""} ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <span className="overline flex items-center gap-2">
            <span className="text-faint">▸</span>
            {title}
          </span>
          {badge}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/* Rótulo + campo de formulário. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="overline mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.66rem] text-faint">{hint}</span>}
    </label>
  );
}

/* Número grande com rótulo — leitura de "mostrador". */
export function Readout({
  label,
  value,
  tone = "fg",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "fg" | "value" | "warn" | "bad" | "muted";
  sub?: ReactNode;
}) {
  const color =
    tone === "value" ? "text-value"
    : tone === "warn" ? "text-warn"
    : tone === "bad" ? "text-bad"
    : tone === "muted" ? "text-muted"
    : "text-fg";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="overline">{label}</span>
      <span className={`mono text-2xl font-semibold tabular-nums leading-none ${color}`}>
        {value}
      </span>
      {sub && <span className="text-[0.66rem] text-faint">{sub}</span>}
    </div>
  );
}

/* Caixa de erro padrão. */
export function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="rounded-sm border border-bad/40 bg-[rgba(255,93,99,0.08)] px-3 py-2 text-[0.72rem] text-bad">
      erro: {msg}
    </p>
  );
}

/* Selo de status (em validação, confiança, etc). */
export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "value" | "warn" | "bad" | "muted" | "cyan";
}) {
  const map: Record<string, string> = {
    value: "border-value/40 text-value bg-[rgba(37,224,138,0.07)]",
    warn: "border-warn/40 text-warn bg-[rgba(255,177,61,0.08)]",
    bad: "border-bad/40 text-bad bg-[rgba(255,93,99,0.08)]",
    cyan: "border-cyan/40 text-cyan bg-[rgba(79,214,255,0.07)]",
    muted: "border-line text-muted bg-panel-2",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.16em] ${map[tone]}`}
    >
      {children}
    </span>
  );
}
