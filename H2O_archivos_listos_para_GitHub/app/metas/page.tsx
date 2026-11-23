"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, Target } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Toast from "@/components/Toast";
import { useHydration } from "@/lib/useHydration";
import { ml, liters } from "@/lib/format";

const STEP = 250;
const PRESETS = [1500, 2000, 2500, 3000];

export default function Metas() {
  const h = useHydration();
  const [goal, setGoal] = useState(h.goal);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  // Al cargar, partir desde la meta guardada
  useEffect(() => setGoal(h.goal), [h.goal]);
  const dirty = goal !== h.goal;
  const change = (d: number) => setGoal((g) => Math.min(4000, Math.max(1000, g + d)));

  return (
    <>
      <PageHeader title="Metas" subtitle="Define cuánta agua quieres registrar al día" />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-h2o-600">
          <Target size={18} /> Meta diaria
        </div>

        <div className="my-5 flex items-center justify-between gap-4">
          <button
            onClick={() => change(-STEP)}
            className="rounded-2xl bg-h2o-50 p-4 text-h2o-700 transition active:scale-95"
            aria-label="Bajar meta"
          >
            <Minus size={22} />
          </button>
          <div className="text-center">
            <p className="text-5xl font-extrabold tracking-tight">{liters(goal)}</p>
            <p className="text-sm text-muted">{ml(goal)}</p>
          </div>
          <button
            onClick={() => change(STEP)}
            className="rounded-2xl bg-h2o-50 p-4 text-h2o-700 transition active:scale-95"
            aria-label="Subir meta"
          >
            <Plus size={22} />
          </button>
        </div>

        <input
          type="range"
          min={1000}
          max={4000}
          step={STEP}
          value={goal}
          onChange={(e) => setGoal(Number(e.target.value))}
          className="mb-5 w-full accent-h2o-500"
          aria-label="Meta diaria"
        />

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setGoal(p)}
              className={`rounded-xl border py-2 text-sm font-semibold transition ${
                goal === p ? "border-h2o-500 bg-h2o-50 text-h2o-700" : "border-slate-200 text-muted"
              }`}
            >
              {liters(p)}
            </button>
          ))}
        </div>

        <button
          disabled={!dirty}
          onClick={() => {
            h.setGoal(goal);
            setToast(`Meta guardada: ${ml(goal)}`);
          }}
          className="mt-6 w-full rounded-2xl bg-navy py-4 font-bold text-white transition hover:bg-navy-hover disabled:cursor-not-allowed disabled:bg-navy/40"
        >
          {dirty ? "Guardar meta" : "Meta guardada"}
        </button>
      </section>

      <p className="mt-5 rounded-2xl bg-h2o-50 p-4 text-xs leading-relaxed text-h2o-800">
        La meta es personal y la eliges tú. H2O no calcula requerimientos de hidratación ni reemplaza
        recomendaciones médicas.
      </p>
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
