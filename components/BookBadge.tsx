import { bookMeta } from "@/lib/bookMeta";

/** Pílula da casa de aposta. Usa o mapa central bookMeta. */
export function BookBadge({ book, size = "sm" }: { book?: string | null; size?: "sm" | "md" }) {
  const m = bookMeta(book);
  const pad = size === "md" ? "px-2 py-0.5 text-[0.7rem]" : "px-1.5 py-px text-[0.6rem]";
  return (
    <span
      title={m.label}
      className={`inline-flex items-center gap-1 rounded-sm border border-line ${pad} ${m.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dotClass}`} />
      {m.sigla}
    </span>
  );
}
