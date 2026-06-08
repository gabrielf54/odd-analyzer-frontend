import type { Mercado } from "@/lib/types";

export function MercadoChips({
  mercados,
  ativo,
  onSelect,
}: {
  mercados: Mercado[];
  ativo: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {mercados.map((m) => {
        const on = m.key === ativo;
        const validacao = m.nivel === "partida";
        return (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
              on
                ? validacao
                  ? "border-warn text-warn bg-[rgba(255,177,61,0.08)]"
                  : "border-value text-value bg-[rgba(37,224,138,0.07)]"
                : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
            }`}
          >
            {m.label}
            {validacao ? " ⚠" : ""}
          </button>
        );
      })}
    </div>
  );
}
