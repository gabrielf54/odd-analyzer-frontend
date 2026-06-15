"use client";
import { useEffect, useState, useMemo } from "react";
import { getOdds, saveOdd, removeOdd } from "@/lib/api";
import { filterOdds, marketOptions, bookOptions } from "@/lib/oddsTable";
import type { OddsFilters } from "@/lib/oddsTable";
import type { OddsRow, ManualOddsLine } from "@/lib/types";
import { BookBadge } from "@/components/BookBadge";
import { ErrorBox } from "@/components/ui";
import { marketNoun } from "@/lib/detailText";

const blank = (): ManualOddsLine => ({ market_type: "", entidade: "", linha: 0.5, odd_over: 0, odd_under: null, book: "manual" });

export function OddsTable({ eventId, onChange, reloadSignal, onClearAll }: {
  eventId: string; onChange?: () => void; reloadSignal?: number; onClearAll?: () => void;
}) {
  const [rows, setRows] = useState<OddsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OddsFilters>({ markets: [], books: [], search: "" });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [adding, setAdding] = useState<ManualOddsLine | null>(null);

  const keyOf = (r: OddsRow) => `${r.entidade}|${r.market_type}|${r.linha}|${r.book}`;

  // Re-fetch usado pelos handlers (editar/add/remover). Mostra loading e fica
  // fora de efeito → não dispara a regra set-state-in-effect.
  async function load() {
    setLoading(true); setError("");
    try { setRows(await getOdds(eventId)); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao carregar odds"); }
    finally { setLoading(false); }
  }

  // Carga inicial + recargas externas: fetch direto no efeito; setState só no callback
  // assíncrono (não síncrono no corpo do efeito). loading começa true via useState.
  // `reloadSignal` muda quando o GameDetail mexe nas odds (coleta automática, limpar
  // tudo, adicionar manual) → a tabela refaz o fetch e troca as linhas em silêncio,
  // sem precisar de refresh na página.
  useEffect(() => {
    let alive = true;
    getOdds(eventId)
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "erro ao carregar odds"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [eventId, reloadSignal]);

  const markets = useMemo(() => marketOptions(rows), [rows]);
  const books = useMemo(() => bookOptions(rows), [rows]);
  const shown = useMemo(() => filterOdds(rows, filters), [rows, filters]);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  async function commitEdit(r: OddsRow, odd_over: number, odd_under: number | null) {
    setError("");
    if (!(odd_over > 1.01)) { setError("odd_over deve ser > 1.01"); return; }
    try {
      await saveOdd(eventId, { market_type: r.market_type, entidade: r.entidade, linha: r.linha, odd_over, odd_under, book: r.book });
      setEditKey(null); await load(); onChange?.();
    } catch (e) { setError(e instanceof Error ? e.message : "erro ao salvar"); }
  }
  async function commitAdd(l: ManualOddsLine) {
    setError("");
    if (!l.market_type || !l.entidade) { setError("preencha mercado e entidade"); return; }
    if (!(l.odd_over > 1.01)) { setError("odd_over deve ser > 1.01"); return; }
    try { await saveOdd(eventId, l); setAdding(null); await load(); onChange?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao adicionar"); }
  }
  async function remove(r: OddsRow) {
    setError("");
    try { await removeOdd(eventId, { entidade: r.entidade, market_type: r.market_type, linha: r.linha, book: r.book }); await load(); onChange?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "erro ao remover"); }
  }

  if (loading) return <p className="mono text-xs text-muted">carregando odds…</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {markets.map((m) => (
          <button key={m} onClick={() => setFilters((f) => ({ ...f, markets: toggle(f.markets, m) }))}
            className={`rounded-sm border px-2 py-0.5 text-[0.66rem] ${filters.markets.includes(m) ? "border-value/50 text-value" : "border-line text-faint"}`}>
            {marketNoun(m)}
          </button>
        ))}
        {books.length > 0 && <span className="mx-1 text-faint">·</span>}
        {books.map((b) => (
          <button key={b} onClick={() => setFilters((f) => ({ ...f, books: toggle(f.books, b) }))}
            className={`rounded-sm border px-1 py-0.5 ${filters.books.includes(b) ? "border-value/50" : "border-line opacity-60"}`}>
            <BookBadge book={b} />
          </button>
        ))}
      </div>
      <input className="input" placeholder="🔎 buscar jogador / partida"
        value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />

      {error && <ErrorBox msg={error} />}

      <div className="flex items-center justify-between text-[0.66rem] text-faint">
        <span>{shown.length} de {rows.length} odds</span>
        <span className="flex items-center gap-3">
          {onClearAll && rows.length > 0 && (
            <button className="transition-colors hover:text-bad" onClick={onClearAll}>🗑 limpar todas</button>
          )}
          <button className="text-value" onClick={() => setAdding(blank())}>＋ adicionar odd</button>
        </span>
      </div>

      {adding && (
        <AddRow line={adding} onCancel={() => setAdding(null)} onSave={commitAdd} markets={markets} />
      )}

      {rows.length === 0 ? (
        <p className="mono py-6 text-center text-[0.7rem] text-muted">nenhuma odd no banco — colete ou adicione acima.</p>
      ) : (
        <div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-sm border border-line">
          <table className="w-full border-collapse text-[0.7rem]">
            <thead className="sticky top-0 bg-panel-2 text-faint">
              <tr>
                <th className="px-2 py-1 text-left">entidade</th>
                <th className="px-1 py-1 text-left">mercado</th>
                <th className="px-1 py-1 text-right">linha</th>
                <th className="px-1 py-1 text-right">over</th>
                <th className="px-1 py-1 text-right">under</th>
                <th className="px-1 py-1 text-left">casa</th>
                <th className="px-1 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <Row key={keyOf(r)} r={r} editing={editKey === keyOf(r)}
                  onEdit={() => setEditKey(keyOf(r))} onCancel={() => setEditKey(null)}
                  onSave={(ov, un) => commitEdit(r, ov, un)} onRemove={() => remove(r)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ r, editing, onEdit, onCancel, onSave, onRemove }: {
  r: OddsRow; editing: boolean; onEdit: () => void; onCancel: () => void;
  onSave: (over: number, under: number | null) => void; onRemove: () => void;
}) {
  const [over, setOver] = useState(String(r.odd_over));
  const [under, setUnder] = useState(r.odd_under == null ? "" : String(r.odd_under));
  return (
    <tr className="border-t border-line-soft">
      <td className="px-2 py-1">{r.entidade}</td>
      <td className="px-1 py-1 text-muted">{r.market_type}</td>
      <td className="px-1 py-1 text-right">{r.linha}</td>
      <td className="px-1 py-1 text-right">
        {editing ? <input className="input w-14 px-1 py-0 text-right" value={over} onChange={(e) => setOver(e.target.value)} /> : r.odd_over}
      </td>
      <td className="px-1 py-1 text-right">
        {editing ? <input className="input w-14 px-1 py-0 text-right" value={under} onChange={(e) => setUnder(e.target.value)} /> : (r.odd_under ?? "—")}
      </td>
      <td className="px-1 py-1"><BookBadge book={r.book} /></td>
      <td className="px-1 py-1 text-right whitespace-nowrap">
        {editing ? (
          <>
            <button className="text-value" onClick={() => onSave(Number(over), under === "" ? null : Number(under))}>✓</button>
            <button className="ml-2 text-faint" onClick={onCancel}>✕</button>
          </>
        ) : (
          <>
            <button className="text-faint hover:text-fg" title="editar" onClick={onEdit}>✎</button>
            <button className="ml-2 text-faint hover:text-bad" title="remover" onClick={onRemove}>🗑</button>
          </>
        )}
      </td>
    </tr>
  );
}

function AddRow({ line, markets, onCancel, onSave }: {
  line: ManualOddsLine; markets: string[]; onCancel: () => void; onSave: (l: ManualOddsLine) => void;
}) {
  const [l, setL] = useState<ManualOddsLine>(line);
  const set = (patch: Partial<ManualOddsLine>) => setL((x) => ({ ...x, ...patch }));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-sm border border-value/40 bg-panel-2 p-2 text-[0.7rem] sm:grid-cols-4">
      <input className="input" placeholder="entidade" value={l.entidade} onChange={(e) => set({ entidade: e.target.value })} />
      <input className="input" placeholder="mercado" list="mkts" value={l.market_type} onChange={(e) => set({ market_type: e.target.value })} />
      <datalist id="mkts">{markets.map((m) => <option key={m} value={m} />)}</datalist>
      <input className="input" placeholder="linha" value={String(l.linha ?? "")} onChange={(e) => set({ linha: Number(e.target.value) })} />
      <input className="input" placeholder="casa" value={l.book} onChange={(e) => set({ book: e.target.value })} />
      <input className="input" placeholder="odd over" value={l.odd_over ? String(l.odd_over) : ""} onChange={(e) => set({ odd_over: Number(e.target.value) })} />
      <input className="input" placeholder="odd under" value={l.odd_under == null ? "" : String(l.odd_under)} onChange={(e) => set({ odd_under: e.target.value === "" ? null : Number(e.target.value) })} />
      <button className="btn" onClick={() => onSave(l)}>salvar</button>
      <button className="text-faint" onClick={onCancel}>cancelar</button>
    </div>
  );
}
