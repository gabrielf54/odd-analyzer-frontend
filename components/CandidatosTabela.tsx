import type { Candidato } from "@/lib/types";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const sig = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(3)}`;

export function CandidatosTabela({ candidatos }: { candidatos: Candidato[] }) {
  if (!candidatos.length) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Nenhum candidato passou nos cortes (edge ≥ 0.04, EV ≥ 0.05, titular confirmado, amostra ≥ 10).
        Lista vazia é um resultado válido — “nenhuma oportunidade clara”.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500">
          <tr>
            <th className="px-3 py-2">Jogador</th>
            <th className="px-3 py-2">Linha</th>
            <th className="px-3 py-2">P. modelo</th>
            <th className="px-3 py-2">P. de-vig</th>
            <th className="px-3 py-2">Edge</th>
            <th className="px-3 py-2">EV</th>
            <th className="px-3 py-2">n</th>
            <th className="px-3 py-2">Adv. concede</th>
          </tr>
        </thead>
        <tbody>
          {candidatos.map((c, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="px-3 py-2 font-medium">{c.jogador}</td>
              <td className="px-3 py-2">{c.linha}</td>
              <td className="px-3 py-2">{pct(c.prob_modelo)}</td>
              <td className="px-3 py-2">{pct(c.prob_devig)}</td>
              <td className={`px-3 py-2 ${c.edge >= 0 ? "text-green-700" : "text-red-700"}`}>{sig(c.edge)}</td>
              <td className={`px-3 py-2 ${c.ev >= 0 ? "text-green-700" : "text-red-700"}`}>{sig(c.ev)}</td>
              <td className="px-3 py-2">{c.amostra_jogos}</td>
              <td className="px-3 py-2 text-neutral-500">{c.concedido_adversario}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
