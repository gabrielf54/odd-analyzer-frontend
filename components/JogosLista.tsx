import type { Jogo } from "@/lib/types";
import { agruparPorData } from "@/lib/date";
import { JogoCard } from "@/components/JogoCard";

export function JogosLista({
  jogos,
  onSelect,
  variante,
}: {
  jogos: Jogo[];
  onSelect: (j: Jogo) => void;
  variante: "pre" | "pos";
}) {
  if (!jogos.length) {
    return (
      <div className="rounded-sm border border-dashed border-line px-4 py-10 text-center">
        <p className="text-[0.78rem] text-muted">
          {variante === "pos"
            ? "sem jogos finalizados nessa liga."
            : "sem jogos não iniciados nessa liga."}
        </p>
      </div>
    );
  }

  const grupos = agruparPorData(jogos);

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => (
        <div key={g.chave} className="flex flex-col gap-1.5">
          <span className="overline">▸ {g.label}</span>
          {g.jogos.map((j) => (
            <JogoCard key={j.id} jogo={j} variante={variante} onClick={() => onSelect(j)} />
          ))}
        </div>
      ))}
    </div>
  );
}
