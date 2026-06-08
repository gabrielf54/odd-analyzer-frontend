import type { Liga } from "@/lib/types";

export function LigaRail({
  ligas,
  ativa,
  onSelect,
}: {
  ligas: Liga[];
  ativa: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      <span className="overline mb-2 block">ligas</span>
      {ligas.length === 0 && (
        <span className="text-[0.72rem] text-faint">carregando…</span>
      )}
      {ligas.map((l) => {
        const on = String(l.id) === ativa;
        return (
          <button
            key={l.id}
            onClick={() => onSelect(String(l.id))}
            className={`truncate rounded-sm border-l-2 px-2.5 py-1.5 text-left text-[0.78rem] transition-colors ${
              on
                ? "border-value bg-panel-2 text-fg"
                : "border-transparent text-muted hover:bg-panel hover:text-fg"
            }`}
          >
            {l.nome}
          </button>
        );
      })}
    </nav>
  );
}
