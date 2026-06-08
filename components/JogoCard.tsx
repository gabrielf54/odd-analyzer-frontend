import type { Jogo } from "@/lib/types";
import { horaLocal } from "@/lib/date";

export function JogoCard({
  jogo,
  variante,
  onClick,
}: {
  jogo: Jogo;
  variante: "pre" | "pos";
  onClick: () => void;
}) {
  const hora = horaLocal(jogo.data);
  const placar = variante === "pos" && jogo.placar ? jogo.placar : null;
  return (
    <button
      onClick={onClick}
      className="reveal group flex w-full items-center gap-3 rounded-sm border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-[#2c3744]"
    >
      <span className="mono w-12 shrink-0 border-r border-line pr-3 text-center text-[0.72rem] text-muted">
        {variante === "pos" ? "fim" : hora || "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[0.9rem] font-bold text-fg">
          {jogo.mandante}{" "}
          {placar ? (
            <span className="text-value">{placar}</span>
          ) : (
            <span className="text-faint">×</span>
          )}{" "}
          {jogo.visitante}
        </span>
        {variante === "pre" && <span className="overline mt-0.5 block">não iniciado</span>}
      </span>
      <span className="text-faint transition-colors group-hover:text-value">▸</span>
    </button>
  );
}
