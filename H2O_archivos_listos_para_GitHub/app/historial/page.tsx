"use client";

import { useCallback, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EntryList from "@/components/EntryList";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import type { IntakeEntry } from "@/lib/types";
import { ml, liters } from "@/lib/format";
import { shortWeekday } from "@/lib/useNow";
import { useHydration } from "@/lib/useHydration";
import { entriesForDate, localDateKey, totalMl } from "@/lib/storage";

const VIEWS = [
  { id: "dia", label: "Diario" },
  { id: "semana", label: "Semanal" },
  { id: "mes", label: "Mensual" },
] as const;

export default function Historial() {
  const h = useHydration();
  const [view, setView] = useState<"dia" | "semana" | "mes">("dia");
  const [toDelete, setToDelete] = useState<IntakeEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Últimos 7 días (terminando hoy) calculados desde los registros reales
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const total = totalMl(entriesForDate(h.entries, localDateKey(d)));
    return { label: i === 6 ? "Hoy" : shortWeekday(d), total };
  });
  const max = Math.max(...week.map((w) => w.total), h.goal) * 1.1;
  const weekTotal = week.reduce((a, w) => a + w.total, 0);
  const daysWithData = week.filter((w) => w.total > 0).length;
  const avg = daysWithData ? Math.round(weekTotal / daysWithData) : 0;
  const best = Math.max(...week.map((w) => w.total));

  const confirmDelete = () => {
    if (!toDelete) return;
    h.deleteEntry(toDelete.id);
    setToast(`Registro de ${ml(toDelete.amountMl)} eliminado`);
    setToDelete(null);
  };

  return (
    <>
      <PageHeader title="Historial" subtitle="Tu consumo registrado" />

      <div className="mb-5 inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-h2o-100">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              view === v.id ? "bg-h2o-100 text-h2o-700" : "text-muted"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "dia" && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-bold">Hoy</h2>
            <span className="text-sm font-semibold text-h2o-600" data-testid="hist-total">
              {ml(h.total)}
            </span>
          </div>
          {h.ready && h.today.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aún no hay registros hoy.</p>
          ) : (
            <EntryList entries={h.today} onDelete={setToDelete} />
          )}
        </section>
      )}

      {view === "semana" && (
        <>
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
            <h2 className="mb-4 font-bold">Últimos 7 días</h2>
            <div className="relative flex h-48 items-end gap-2.5">
              <div
                className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-h2o-300"
                style={{ bottom: `${(h.goal / max) * 100}%` }}
              >
                <span className="absolute -top-5 right-0 text-[10px] font-semibold text-h2o-500">Meta</span>
              </div>
              {week.map((w, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className={`w-full max-w-10 rounded-t-xl ${w.total >= h.goal ? "bg-h2o-500" : "bg-h2o-200"}`}
                    style={{ height: `${(w.total / max) * 100}%`, minHeight: w.total ? 4 : 0 }}
                    title={ml(w.total)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2.5">
              {week.map((w, i) => (
                <span key={i} className="flex-1 text-center text-[11px] font-medium capitalize text-muted">
                  {h.ready ? w.label : ""}
                </span>
              ))}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Promedio diario", value: ml(avg) },
              { label: "Mejor día", value: ml(best) },
              { label: "Total semanal", value: liters(weekTotal) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-h2o-100">
                <p className="text-[11px] font-semibold text-muted">{s.label}</p>
                <p className="mt-1 text-base font-bold text-navy">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">El promedio considera solo los días con registros.</p>
        </>
      )}

      {view === "mes" && (
        <section className="rounded-3xl border-2 border-dashed border-h2o-200 p-8 text-center text-sm text-muted">
          La vista mensual se construye en el módulo de historial y gráficos.
        </section>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar registro?"
        text={toDelete ? `Se eliminará el registro de ${ml(toDelete.amountMl)} de las ${toDelete.time}. No se puede deshacer.` : ""}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
