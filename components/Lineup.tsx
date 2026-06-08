import type { Lineup as LineupData, LineupSide, Player } from "@/lib/types";
import { Panel, Tag } from "@/components/ui";

/* ── origem → como a mesa interpreta a confiança da escalação ──────────
   confirmada = 11 oficiais · provavel = provável (pode mudar) ·
   ultimos3   = estimado pelos últimos jogos → pode ter reserva/banco. */
type OriginMeta = {
  tone: "value" | "cyan" | "warn" | "muted";
  seal: string;
  note: string | null;
  alert: boolean;
};

function originMeta(origem: string): OriginMeta {
  switch (origem) {
    case "confirmada":
      return { tone: "value", seal: "confirmada", note: "11 titulares oficiais.", alert: false };
    case "provavel":
      return { tone: "cyan", seal: "provável", note: "escalação provável — pode mudar até ~1h antes do jogo.", alert: false };
    case "ultimos3":
      return {
        tone: "warn",
        seal: "estimado",
        note: "montado pelos últimos jogos — pode conter reservas ou quem fica no banco. confira antes de apostar.",
        alert: true,
      };
    default:
      return { tone: "muted", seal: origem || "—", note: null, alert: false };
  }
}

/* ── setores: posições do provider (G/D/M/F) → leitura humana ───────── */
const SECTORS: { code: string; label: string; chip: string }[] = [
  { code: "G", label: "goleiro", chip: "border-warn/45 text-warn" },
  { code: "D", label: "defesa", chip: "border-line text-muted" },
  { code: "M", label: "meio", chip: "border-cyan/45 text-cyan" },
  { code: "F", label: "ataque", chip: "border-value/50 text-value" },
];

function sectorOf(posicao: string): string {
  const c = (posicao || "").trim().charAt(0).toUpperCase();
  return SECTORS.some((s) => s.code === c) ? c : "?";
}

export function Lineup({
  lineup,
  loading,
  error,
  onPickPlayer,
}: {
  lineup: LineupData | null;
  loading: boolean;
  error: string;
  onPickPlayer: (name: string) => void;
}) {
  const meta = lineup ? originMeta(lineup.origem) : null;
  const empty =
    !!lineup && lineup.home.jogadores.length === 0 && lineup.away.jogadores.length === 0;

  return (
    <Panel
      title="escalação"
      badge={meta && <Tag tone={meta.tone}>{meta.seal}</Tag>}
    >
      {loading ? (
        <p className="mono py-6 text-center text-sm text-value">
          lendo escalação<span className="blink">_</span>
        </p>
      ) : error ? (
        <p className="py-6 text-center text-[0.74rem] text-faint">
          escalação indisponível — {error}
        </p>
      ) : empty ? (
        <div className="py-7 text-center">
          <div className="display text-3xl font-extrabold text-line">⌀</div>
          <p className="mt-2 text-[0.78rem] text-muted">elenco ainda não disponível</p>
          <p className="mx-auto mt-1 max-w-xs text-[0.66rem] leading-relaxed text-faint">
            o provedor não publicou jogadores para este jogo. tente mais perto do horário.
          </p>
        </div>
      ) : lineup && meta ? (
        <div className="flex flex-col gap-3.5">
          {meta.note && (
            <div
              className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-[0.7rem] leading-relaxed ${
                meta.alert
                  ? "border-warn/40 bg-[rgba(255,177,61,0.07)] text-warn"
                  : "border-line-soft bg-panel-2 text-muted"
              }`}
            >
              <span className={meta.alert ? "text-warn" : "text-faint"}>
                {meta.alert ? "⚠" : "ⓘ"}
              </span>
              <span>{meta.note}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 sm:divide-x sm:divide-line-soft">
            <TeamSide side={lineup.home} homeAway="mandante" onPickPlayer={onPickPlayer} />
            <div className="sm:pl-5">
              <TeamSide side={lineup.away} homeAway="visitante" onPickPlayer={onPickPlayer} />
            </div>
          </div>

          <p className="overline text-[0.58rem] text-faint">
            ▸ clique num nome para analisar só ele
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function TeamSide({
  side,
  homeAway,
  onPickPlayer,
}: {
  side: LineupSide;
  homeAway: string;
  onPickPlayer: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-1.5">
        <span className="display truncate text-[0.92rem] font-bold text-fg">
          {side.team_name}
        </span>
        <span className="overline shrink-0">
          {homeAway} · {side.jogadores.length}
        </span>
      </div>

      {side.jogadores.length === 0 ? (
        <p className="py-2 text-[0.7rem] text-faint">— sem jogadores —</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {SECTORS.map((s) => {
            const inSector = side.jogadores.filter((j) => sectorOf(j.posicao) === s.code);
            if (inSector.length === 0) return null;
            return (
              <div key={s.code} className="flex flex-col gap-1">
                <span className="overline text-[0.56rem]">
                  {s.label} · {inSector.length}
                </span>
                {inSector.map((j, i) => (
                  <PlayerRow key={j.id} player={j} chip={s.chip} idx={i} onPick={onPickPlayer} />
                ))}
              </div>
            );
          })}
          {/* posições fora de G/D/M/F (provider sem dado) */}
          {(() => {
            const others = side.jogadores.filter((j) => sectorOf(j.posicao) === "?");
            if (others.length === 0) return null;
            return (
              <div className="flex flex-col gap-1">
                <span className="overline text-[0.56rem]">outros · {others.length}</span>
                {others.map((j, i) => (
                  <PlayerRow key={j.id} player={j} chip="border-line text-faint" idx={i} onPick={onPickPlayer} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  chip,
  idx,
  onPick,
}: {
  player: Player;
  chip: string;
  idx: number;
  onPick: (name: string) => void;
}) {
  const code = (player.posicao || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <button
      onClick={() => onPick(player.name)}
      title={`analisar ${player.name}`}
      style={{ animationDelay: `${idx * 22}ms` }}
      className="reveal group flex w-full items-center gap-2 rounded-sm border border-transparent px-1.5 py-1 text-left transition-colors hover:border-line hover:bg-panel-2"
    >
      <span
        className={`mono grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[0.6rem] font-semibold ${chip}`}
      >
        {code}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.8rem] text-fg group-hover:text-value">
        {player.name}
      </span>
      <span className="text-[0.7rem] text-faint opacity-0 transition-opacity group-hover:opacity-100">
        ▸
      </span>
    </button>
  );
}
