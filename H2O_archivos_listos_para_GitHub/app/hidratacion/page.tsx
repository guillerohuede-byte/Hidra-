"use client";

// Perfil → Hidratación: respuestas del cálculo, volver a calcular o borrarlas.
import { useCallback, useState } from "react";
import Link from "next/link";
import { Calculator, Trash2, ChevronLeft, BookOpen } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HydrationWizard, { type WizardResult } from "@/components/HydrationWizard";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import { AGE_LABELS, EXERCISE_LABELS, HEAT_LABELS, INTENSITY_LABELS } from "@/lib/hydration/calc";
import { ml } from "@/lib/format";

export default function Hidratacion() {
  const s = useH2O();
  const g = useGame();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const d = s.data;
  if (!d) return null;
  const hp = d.hydration;

  const save = async (r: WizardResult) => {
    // Solo cambia la meta desde hoy: racha, Gotitas, compras y logros se conservan
    if (r.hydration) await s.saveHydration(r.hydration);
    await s.updateProfile({ goalMl: r.goalMl, trainingExtraMl: r.trainingExtraMl, goalSource: r.goalSource });
    setEditing(false);
    setToast(`Nueva meta: ${ml(r.goalMl)} desde hoy`);
  };

  if (editing)
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
        <button onClick={() => setEditing(false)} className="mb-4 flex w-fit items-center gap-1 py-2 text-sm font-semibold text-h2o-700"><ChevronLeft size={16} /> Volver</button>
        <HydrationWizard
          pet={d.pet ? { species: d.pet.species, color: d.pet.color, equipment: g.equipment, level: g.level } : null}
          initial={hp}
          currentGoalMl={d.profile.goalMl}
          onCancel={() => setEditing(false)}
          onFinish={save}
        />
      </div>
    );

  return (
    <>
      <PageHeader title="Hidratación" subtitle="Tu meta personal y cómo se calculó" />

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-h2o-50 p-3">
            <p className="text-xs font-semibold text-muted">Meta base</p>
            <p className="text-xl font-extrabold" data-testid="hp-base">{ml(d.profile.goalMl)}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3">
            <p className="text-xs font-semibold text-muted">Días de entrenamiento</p>
            <p className="text-xl font-extrabold">+{ml(d.profile.trainingExtraMl)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {d.profile.goalSource === "calculada" ? "Usas la meta sugerida por el cálculo." : "Usas una meta elegida por ti."}{" "}
          <Link href="/metas" className="inline-block py-2 font-semibold text-h2o-700">Ajustar en Metas</Link>
        </p>
      </section>

      {hp ? (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100" data-testid="hp-answers">
          <h2 className="font-bold">Tus respuestas</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Edad</dt><dd className="font-semibold">{AGE_LABELS[hp.ageRange]}</dd>
            <dt className="text-muted">Peso</dt><dd className="font-semibold">{String(hp.weightKg).replace(".", ",")} kg</dd>
            <dt className="text-muted">Entrenamiento</dt><dd className="font-semibold">{EXERCISE_LABELS[hp.exerciseMinutes]}{hp.intensity ? ` · ${INTENSITY_LABELS[hp.intensity].toLowerCase()}` : ""}</dd>
            <dt className="text-muted">Calor</dt><dd className="font-semibold">{HEAT_LABELS[hp.heat]}</dd>
            <dt className="text-muted">Sugerencia</dt><dd className="font-semibold">{ml(hp.recommendedBaseMl)}{hp.recommendedExtraMl ? ` (+${ml(hp.recommendedExtraMl)})` : ""}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">Actualizado el {new Date(hp.updatedAt).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}. No guardamos información médica.</p>
        </section>
      ) : (
        <section className="mt-4 rounded-3xl bg-h2o-50 p-5 text-sm text-h2o-900">
          Aún no calculas una meta personalizada. Tu meta actual se mantiene hasta que confirmes una nueva.
        </section>
      )}

      <button onClick={() => setEditing(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 font-bold text-white" data-testid="hp-calcular">
        <Calculator size={18} /> {hp ? "Volver a calcular" : "Calcular mi meta"}
      </button>
      {hp && (
        <button onClick={() => setConfirmDelete(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-red-600 ring-1 ring-red-100" data-testid="hp-borrar">
          <Trash2 size={16} /> Borrar mis respuestas
        </button>
      )}

      <section className="mt-4 rounded-3xl bg-white p-5 text-xs leading-relaxed text-muted shadow-sm ring-1 ring-h2o-100">
        <p className="flex items-center gap-1.5 font-semibold text-ink"><BookOpen size={15} className="text-h2o-600" /> Cómo calcula Hidra</p>
        Partimos de los líquidos de bebidas que las National Academies consideran adecuados para adultos (alrededor de 2,2 a 3,0 L), usando tu peso como guía (30 ml por kg, entre 1,6 y 3,0 L). Sumamos un poco si pasas calor a diario y, solo los días que entrenas, una parte del sudor según duración e intensidad. Es una estimación orientativa: la sed sigue siendo una buena guía y no hace falta tomar de más.
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Borrar tus respuestas?"
        text="Se borran edad, peso, ejercicio y calor. Tu meta actual, tu historial, tu racha y tus Gotitas no cambian."
        confirmLabel="Borrar"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          s.saveHydration(null).then(() => setToast("Respuestas borradas")).catch((e) => setToast(e instanceof Error ? e.message : "No se pudo borrar"));
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
