"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, ChevronRight, Dumbbell, Minus, Plus, Target } from "lucide-react";
import TrainingToggle from "@/components/TrainingToggle";
import { useH2O } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Toast from "@/components/Toast";
import { useHydration } from "@/lib/useHydration";
import { ml, liters } from "@/lib/format";

const STEP = 250;
const PRESETS = [1500, 2000, 2500, 3000];

export default function Metas() {
  const h = useHydration();
  const s = useH2O();
  // Aquí se edita la meta BASE (la de todos los días); la de hoy puede sumar el entrenamiento
  const [goal, setGoal] = useState(h.baseGoal);
  const [extra, setExtra] = useState(h.trainingExtra);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  // Al cargar, partir desde la meta guardada
  useEffect(() => setGoal(h.baseGoal), [h.baseGoal]);
  useEffect(() => setExtra(h.trainingExtra), [h.trainingExtra]);
  const dirty = goal !== h.baseGoal;
  const extraDirty = extra !== h.trainingExtra;
  const calc = s.data?.hydration;
  const change = (d: number) => setGoal((g) => Math.min(6000, Math.max(1000, g + d)));

  return (
    <>
      <PageHeader title="Metas" subtitle="Define cuánta agua quieres registrar al día" />

      <section className="mb-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100" data-testid="today-goal-card">
        <p className="text-sm font-semibold text-muted">Meta de hoy</p>
        <p className="text-3xl font-extrabold tracking-tight" data-testid="today-goal">{ml(h.goal)}</p>
        <div className="mt-3"><TrainingToggle /></div>
        <p className="mt-2 text-xs text-muted">Los cambios valen desde hoy: los días anteriores conservan la meta que tenían.</p>
      </section>

      <Link href="/hidratacion" className="mb-4 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-h2o-500 to-h2o-700 p-5 text-white shadow-sm" data-testid="link-calcular">
        <span className="rounded-2xl bg-white/15 p-2.5"><Calculator size={22} /></span>
        <span className="flex-1">
          <span className="block font-bold">{calc ? "Volver a calcular mi meta" : "Calcular mi meta personalizada"}</span>
          <span className="block text-sm text-h2o-100">{calc ? `Sugerencia actual: ${ml(calc.recommendedBaseMl)}` : "5 preguntas · menos de un minuto"}</span>
        </span>
        <ChevronRight size={20} />
      </Link>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-h2o-600">
          <Target size={18} /> Meta base (todos los días)
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
          max={6000}
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
            s.updateProfile({ goalMl: goal, goalSource: "manual" })
              .then(() => setToast(`Meta guardada: ${ml(goal)}`))
              .catch((e) => setToast(e instanceof Error ? e.message : "No se pudo guardar la meta"));
          }}
          className="mt-6 w-full rounded-2xl bg-navy py-4 font-bold text-white transition hover:bg-navy-hover disabled:cursor-not-allowed disabled:bg-navy/40"
        >
          {dirty ? "Guardar meta" : "Meta guardada"}
        </button>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100" data-testid="extra-card">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-h2o-600">
          <Dumbbell size={18} /> Ajuste para días de entrenamiento
        </div>
        <p className="text-xs text-muted">Se suma solo los días que marques «Hoy entreno». Pon 0 si no lo necesitas.</p>
        <div className="my-4 flex items-center justify-between gap-4">
          <button onClick={() => setExtra((x) => Math.max(0, x - 50))} className="rounded-2xl bg-h2o-50 p-3.5 text-h2o-700" aria-label="Bajar ajuste"><Minus size={20} /></button>
          <p className="text-3xl font-extrabold" data-testid="extra-value">+{ml(extra)}</p>
          <button onClick={() => setExtra((x) => Math.min(1500, x + 50))} className="rounded-2xl bg-h2o-50 p-3.5 text-h2o-700" aria-label="Subir ajuste"><Plus size={20} /></button>
        </div>
        <button
          disabled={!extraDirty}
          onClick={() =>
            s.updateProfile({ trainingExtraMl: extra })
              .then(() => setToast(extra ? `Días de entrenamiento: +${ml(extra)}` : "Sin ajuste de entrenamiento"))
              .catch((e) => setToast(e instanceof Error ? e.message : "No se pudo guardar"))
          }
          className="w-full rounded-2xl bg-navy py-3.5 font-bold text-white disabled:bg-navy/40"
          data-testid="save-extra"
        >
          {extraDirty ? "Guardar ajuste" : "Ajuste guardado"}
        </button>
      </section>

      <p className="mt-5 rounded-2xl bg-h2o-50 p-4 text-xs leading-relaxed text-h2o-800">
        La meta es personal y la eliges tú. El cálculo de Hidra es una guía orientativa y no reemplaza
        recomendaciones médicas. Cambiar tu meta no afecta tu racha, tus Gotitas ni tus logros.
      </p>
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
