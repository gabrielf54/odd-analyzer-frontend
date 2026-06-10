import type { Match } from "@/lib/types";
import { localTime } from "@/lib/date";

export function MatchCard({
  match,
  onClick,
}: {
  match: Match;
  onClick: () => void;
}) {
  const time = localTime(match.data);
  return (
    <button
      onClick={onClick}
      className="reveal group flex w-full items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-value/55 hover:bg-[rgba(37,224,138,0.055)]"
    >
      <span className="mono w-12 shrink-0 border-r border-line pr-3 text-center text-[0.72rem] text-muted transition-colors group-hover:border-value/30 group-hover:text-value/80">
        {time || "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[0.9rem] font-bold text-fg transition-colors group-hover:text-value">
          {match.mandante}{" "}
          <span className="text-faint group-hover:text-value/70">×</span>{" "}
          {match.visitante}
        </span>
        <span className="overline mt-0.5 block transition-colors group-hover:text-value/70">não iniciado</span>
      </span>
      <span className="text-faint transition-colors group-hover:text-value">▸</span>
    </button>
  );
}
