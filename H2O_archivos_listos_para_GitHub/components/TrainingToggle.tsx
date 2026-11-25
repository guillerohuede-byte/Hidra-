"use client";

// "Hoy entreno": suma el ajuste de entrenamiento SOLO a la meta de hoy.
// Los días anteriores conservan la meta que tenían.
import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Sofa } from "lucide-react";
import { useHydration } from "@/lib/useHydration";
import { ml } from "@/lib/format";

export default function TrainingToggle({ compact = false }: { compact?: boolean }) {
  const h = useHydration();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!h.ready) return null;

  if (h.trainingExtra <= 0)
    return compact ? null : (
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted">
        Aún no tienes un ajuste para días de entrenamiento.{" "}
        <Link href="/hidratacion" className="inline-block py-2 font-semibold text-h2o-700">Calcúlalo</Link> o defínelo abajo.
      </p>
    );

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await h.setTrainingToday(!h.trainingToday);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="training-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={h.trainingToday}
        onClick={toggle}
        disabled={busy}
        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.99] ${
          h.trainingToday ? "bg-orange-50 ring-2 ring-orange-300" : "bg-h2o-50 ring-1 ring-h2o-100"
        }`}
      >
        <span className={`rounded-xl p-2 ${h.trainingToday ? "bg-orange-400 text-white" : "bg-white text-h2o-600"}`}>
          {h.trainingToday ? <Dumbbell size={20} /> : <Sofa size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{h.trainingToday ? "Hoy entreno" : "Hoy descanso"}</span>
          <span className="block text-xs text-muted" data-testid="goal-why">
            {h.trainingToday
              ? `Meta de hoy: base ${ml(h.baseGoal)} + entrenamiento ${ml(h.trainingExtra)}`
              : `Toca si hoy entrenas: suma ${ml(h.trainingExtra)} solo a hoy`}
          </span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${h.trainingToday ? "bg-orange-400" : "bg-slate-300"}`} aria-hidden>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${h.trainingToday ? "left-6" : "left-1"}`} />
        </span>
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
