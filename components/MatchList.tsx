import type { Match } from "@/lib/types";
import { groupByDay } from "@/lib/date";
import { MatchCard } from "@/components/MatchCard";

export function MatchList({
  matches,
  onSelect,
  variant,
}: {
  matches: Match[];
  onSelect: (j: Match) => void;
  variant: "pre" | "pos";
}) {
  if (!matches.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
        <p className="text-[0.78rem] text-muted">
          {variant === "pos"
            ? "sem jogos finalizados nessa liga."
            : "sem jogos não iniciados nessa liga."}
        </p>
      </div>
    );
  }

  const groups = groupByDay(matches);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-1.5">
          <span className="overline">▸ {g.label}</span>
          {g.matches.map((j) => (
            <MatchCard key={j.id} match={j} variant={variant} onClick={() => onSelect(j)} />
          ))}
        </div>
      ))}
    </div>
  );
}
