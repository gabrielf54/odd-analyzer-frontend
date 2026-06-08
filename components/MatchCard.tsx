import type { Match } from "@/lib/types";
import { localTime } from "@/lib/date";

export function MatchCard({
  match,
  variant,
  onClick,
}: {
  match: Match;
  variant: "pre" | "pos";
  onClick: () => void;
}) {
  const time = localTime(match.data);
  const score = variant === "pos" && match.placar ? match.placar : null;
  return (
    <button
      onClick={onClick}
      className="reveal group flex w-full items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-[#2c3744]"
    >
      <span className="mono w-12 shrink-0 border-r border-line pr-3 text-center text-[0.72rem] text-muted">
        {variant === "pos" ? "fim" : time || "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[0.9rem] font-bold text-fg">
          {match.mandante}{" "}
          {score ? (
            <span className="text-value">{score}</span>
          ) : (
            <span className="text-faint">×</span>
          )}{" "}
          {match.visitante}
        </span>
        {variant === "pre" && <span className="overline mt-0.5 block">não iniciado</span>}
      </span>
      <span className="text-faint transition-colors group-hover:text-value">▸</span>
    </button>
  );
}
