"use client";

import type { Periodo } from "@/lib/jogosFiltro";

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Próximos 7 dias" },
];

export function JogosFiltro({
  busca,
  setBusca,
  periodo,
  setPeriodo,
}: {
  busca: string;
  setBusca: (v: string) => void;
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <input
        className="input sm:max-w-[16rem]"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="buscar time…"
        aria-label="buscar time"
      />
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => {
          const on = p.key === periodo;
          return (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`rounded-sm border px-2.5 py-1 text-[0.72rem] transition-colors ${
                on
                  ? "border-value text-value bg-[rgba(37,224,138,0.07)]"
                  : "border-line text-muted hover:border-[#2c3744] hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
