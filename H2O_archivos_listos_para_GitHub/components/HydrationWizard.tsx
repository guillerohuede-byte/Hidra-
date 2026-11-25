"use client";

// Cuestionario corto (5 preguntas) para estimar la meta de hidratación.
// Botones grandes, se puede volver atrás, y termina en "Tu meta de hidratación".
// El cálculo está en lib/hydration/calc.ts (fuentes en docs/meta-de-hidratacion.md).
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Dumbbell, Info, Minus, Plus, SlidersHorizontal, TriangleAlert } from "lucide-react";
import PetAvatar from "./pet/PetAvatar";
import {
  AGE_LABELS, EXERCISE_LABELS, HEAT_LABELS, INTENSITY_LABELS, METHOD_VERSION, estimate,
  type AgeRange, type ExerciseMinutes, type Heat, type HydrationAnswers, type Intensity,
} from "@/lib/hydration/calc";
import type { HydrationProfile } from "@/lib/backend/types";
import { ml, liters } from "@/lib/format";

export type WizardResult = {
  goalMl: number;
  trainingExtraMl: number;
  goalSource: "manual" | "calculada";
  hydration: Omit<HydrationProfile, "updatedAt"> | null; // null: no se guardan respuestas (menores, indicación médica)
};

type Props = {
  pet?: { species: string; color: string; equipment?: Record<string, string>; level?: number } | null;
  initial?: HydrationProfile | null;
  currentGoalMl?: number;
  onFinish: (r: WizardResult) => Promise<void> | void;
  onCancel?: () => void;
  saveLabel?: string;
};

const STEPS = ["edad", "indicacion", "peso", "ejercicio", "calor"] as const;
type Step = (typeof STEPS)[number] | "resultado";

const Choice = ({ selected, onClick, children, testId }: { selected: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    data-testid={testId}
    className={`w-full rounded-2xl border-2 px-4 py-4 text-left text-base font-bold transition active:scale-[0.99] ${
      selected ? "border-h2o-500 bg-white text-h2o-800 shadow-sm" : "border-transparent bg-white/80 text-navy ring-1 ring-h2o-100"
    }`}
  >
    {children}
  </button>
);

export default function HydrationWizard({ pet, initial, currentGoalMl, onFinish, onCancel, saveLabel = "Usar esta meta" }: Props) {
  const [a, setA] = useState<HydrationAnswers>({
    ageRange: initial?.ageRange ?? null,
    weightKg: initial?.weightKg ?? null,
    exerciseMinutes: initial?.exerciseMinutes ?? null,
    intensity: initial?.intensity ?? null,
    heat: initial?.heat ?? null,
    medicalAdvice: initial ? false : null,
  });
  const [step, setStep] = useState<Step>("edad");
  const [weightText, setWeightText] = useState(initial?.weightKg ? String(initial.weightKg).replace(".", ",") : "");
  const [manual, setManual] = useState(false);
  const [manualGoal, setManualGoal] = useState(currentGoalMl ?? 2000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<HydrationAnswers>) => setA((x) => ({ ...x, ...p }));

  const result = useMemo(() => estimate(a), [a]);
  const idx = step === "resultado" ? STEPS.length : STEPS.indexOf(step);

  // Menores e indicación médica saltan directo al resultado (meta manual)
  const next = () => {
    if (step === "edad") return setStep(a.ageRange === "menor" ? "resultado" : "indicacion");
    if (step === "indicacion") return setStep(a.medicalAdvice ? "resultado" : "peso");
    if (step === "peso") return setStep("ejercicio");
    if (step === "ejercicio") return setStep("calor");
    if (step === "calor") {
      if (result.kind === "ok") setManualGoal(result.baseMl);
      return setStep("resultado");
    }
  };
  const back = () => {
    if (step === "resultado") {
      setManual(false);
      return setStep(a.ageRange === "menor" ? "edad" : a.medicalAdvice ? "indicacion" : "calor");
    }
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
    else onCancel?.();
  };

  const weightValid = a.weightKg !== null && a.weightKg >= 30 && a.weightKg <= 250;
  const canNext =
    (step === "edad" && !!a.ageRange) ||
    (step === "indicacion" && a.medicalAdvice !== null) ||
    (step === "peso" && weightValid) ||
    (step === "ejercicio" && a.exerciseMinutes !== null && (a.exerciseMinutes === 0 || !!a.intensity)) ||
    (step === "calor" && !!a.heat);

  const finish = async (useRecommended: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (result.kind === "ok") {
        const goalMl = useRecommended ? result.baseMl : manualGoal;
        await onFinish({
          goalMl,
          trainingExtraMl: result.trainingExtraMl,
          goalSource: useRecommended ? "calculada" : "manual",
          hydration: {
            ageRange: a.ageRange as HydrationProfile["ageRange"],
            weightKg: Math.round(a.weightKg! * 10) / 10,
            exerciseMinutes: a.exerciseMinutes as HydrationProfile["exerciseMinutes"],
            intensity: a.exerciseMinutes ? a.intensity : null,
            heat: a.heat!,
            methodVersion: METHOD_VERSION,
            recommendedBaseMl: result.baseMl,
            recommendedExtraMl: result.trainingExtraMl,
          },
        });
      } else {
        await onFinish({ goalMl: manualGoal, trainingExtraMl: 0, goalSource: "manual", hydration: null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  };

  const ManualPicker = (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-h2o-100" data-testid="manual-picker">
      <p className="text-sm font-semibold">Tu meta diaria</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setManualGoal((g) => Math.max(1000, g - 100))} className="rounded-2xl bg-h2o-50 p-3.5 text-h2o-700" aria-label="Bajar 100 ml"><Minus size={20} /></button>
        <p className="text-center"><span className="block text-3xl font-extrabold" data-testid="manual-goal">{liters(manualGoal)}</span><span className="text-xs text-muted">{ml(manualGoal)}</span></p>
        <button type="button" onClick={() => setManualGoal((g) => Math.min(6000, g + 100))} className="rounded-2xl bg-h2o-50 p-3.5 text-h2o-700" aria-label="Subir 100 ml"><Plus size={20} /></button>
      </div>
      <input type="range" min={1000} max={6000} step={100} value={manualGoal} onChange={(e) => setManualGoal(Number(e.target.value))} className="mt-3 w-full accent-h2o-600" aria-label="Meta diaria" />
    </div>
  );

  return (
    <div className="flex flex-1 flex-col" data-testid="hydration-wizard">
      {step !== "resultado" && (
        <div className="mb-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-h2o-100" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={5} aria-label={`Pregunta ${idx + 1} de 5`}>
            <div className="h-full rounded-full bg-h2o-500 transition-all" style={{ width: `${((idx + 1) / 5) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-muted">{idx + 1}/5</span>
        </div>
      )}

      {step === "edad" && (
        <section className="pop-in" role="radiogroup" aria-labelledby="q-edad">
          <h2 id="q-edad" className="text-2xl font-extrabold tracking-tight">¿Cuántos años tienes?</h2>
          <p className="mt-1 text-sm text-muted">Un rango basta.</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {(Object.keys(AGE_LABELS) as AgeRange[]).map((k) => (
              <Choice key={k} selected={a.ageRange === k} onClick={() => set({ ageRange: k })} testId={`edad-${k}`}>{AGE_LABELS[k]}</Choice>
            ))}
          </div>
        </section>
      )}

      {step === "indicacion" && (
        <section className="pop-in" role="radiogroup" aria-labelledby="q-ind">
          <h2 id="q-ind" className="text-2xl font-extrabold tracking-tight">¿Un profesional de salud te indicó cuánto líquido tomar?</h2>
          <p className="mt-1 text-sm text-muted">Por ejemplo, limitarlo o aumentarlo. No necesitamos saber por qué, y no guardamos esta respuesta.</p>
          <div className="mt-5 space-y-2.5">
            <Choice selected={a.medicalAdvice === false} onClick={() => set({ medicalAdvice: false })} testId="indicacion-no">No</Choice>
            <Choice selected={a.medicalAdvice === true} onClick={() => set({ medicalAdvice: true })} testId="indicacion-si">Sí, tengo una indicación</Choice>
          </div>
        </section>
      )}

      {step === "peso" && (
        <section className="pop-in">
          <h2 className="text-2xl font-extrabold tracking-tight">¿Cuánto pesas?</h2>
          <p className="mt-1 text-sm text-muted">Lo usamos solo como guía general; un aproximado sirve.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button type="button" onClick={() => { const v = Math.max(30, Math.round((a.weightKg ?? 70) - 1)); set({ weightKg: v }); setWeightText(String(v)); }} className="rounded-2xl bg-white p-4 text-h2o-700 ring-1 ring-h2o-100" aria-label="Restar 1 kg"><Minus size={22} /></button>
            <label className="flex items-baseline gap-1 rounded-2xl bg-white px-4 py-2 ring-2 ring-h2o-200 focus-within:ring-h2o-500">
              <input
                id="peso"
                inputMode="decimal"
                autoComplete="off"
                value={weightText}
                placeholder="70"
                onChange={(e) => {
                  const t = e.target.value.replace(/[^\d,.]/g, "").slice(0, 5);
                  setWeightText(t);
                  const v = parseFloat(t.replace(",", "."));
                  set({ weightKg: Number.isFinite(v) ? v : null });
                }}
                className="w-24 bg-transparent text-center text-4xl font-extrabold outline-none"
                aria-label="Peso en kilogramos"
              />
              <span className="text-lg font-bold text-muted">kg</span>
            </label>
            <button type="button" onClick={() => { const v = Math.min(250, Math.round((a.weightKg ?? 70) + 1)); set({ weightKg: v }); setWeightText(String(v)); }} className="rounded-2xl bg-white p-4 text-h2o-700 ring-1 ring-h2o-100" aria-label="Sumar 1 kg"><Plus size={22} /></button>
          </div>
          {weightText && !weightValid && <p role="alert" className="mt-3 text-center text-sm font-medium text-red-700">Ingresa un peso entre 30 y 250 kg.</p>}
        </section>
      )}

      {step === "ejercicio" && (
        <section className="pop-in">
          <h2 className="text-2xl font-extrabold tracking-tight">Un día que entrenas, ¿cuánto dura?</h2>
          <p className="mt-1 text-sm text-muted">Se suma solo los días que marques como entrenamiento.</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Duración">
            {([0, 20, 45, 75, 105] as ExerciseMinutes[]).map((m) => (
              <Choice key={m} selected={a.exerciseMinutes === m} onClick={() => set({ exerciseMinutes: m, intensity: m ? a.intensity : null })} testId={`ejercicio-${m}`}>{EXERCISE_LABELS[m]}</Choice>
            ))}
          </div>
          {!!a.exerciseMinutes && (
            <div className="pop-in mt-5">
              <p className="text-sm font-semibold">¿Qué tan intenso?</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Intensidad">
                {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
                  <Choice key={k} selected={a.intensity === k} onClick={() => set({ intensity: k })} testId={`intensidad-${k}`}>
                    <span className="block text-center">{INTENSITY_LABELS[k]}</span>
                  </Choice>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Suave: caminar. Moderada: trotar, bicicleta. Intensa: correr rápido, partido, crossfit.</p>
            </div>
          )}
        </section>
      )}

      {step === "calor" && (
        <section className="pop-in" role="radiogroup" aria-labelledby="q-calor">
          <h2 id="q-calor" className="text-2xl font-extrabold tracking-tight">Fuera del entrenamiento, ¿pasas calor o sudas mucho?</h2>
          <p className="mt-1 text-sm text-muted">Por el clima, tu trabajo o tus traslados.</p>
          <div className="mt-5 space-y-2.5">
            {(Object.keys(HEAT_LABELS) as Heat[]).map((k) => (
              <Choice key={k} selected={a.heat === k} onClick={() => set({ heat: k })} testId={`calor-${k}`}>{HEAT_LABELS[k]}</Choice>
            ))}
          </div>
        </section>
      )}

      {step === "resultado" && (
        <section className="pop-in" data-testid="hydration-result">
          <div className="flex flex-col items-center text-center">
            {pet && <PetAvatar species={pet.species} color={pet.color} equipment={pet.equipment} level={pet.level} size={130} anim="celebrate" mood="feliz" />}
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Tu meta de hidratación</h2>
          </div>

          {result.kind === "ok" ? (
            <>
              <div className="mt-4 rounded-3xl bg-gradient-to-br from-h2o-500 to-h2o-700 p-5 text-center text-white shadow-sm">
                <p className="text-sm font-semibold text-h2o-100">Punto de partida sugerido</p>
                <p className="text-5xl font-extrabold tracking-tight" data-testid="result-liters">{liters(result.baseMl)}</p>
                <p className="text-sm text-h2o-100">{ml(result.baseMl)} al día</p>
                {result.trainingExtraMl > 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold" data-testid="result-training">
                    <Dumbbell size={15} className="shrink-0" /> Días de entrenamiento: {liters(result.trainingDayMl)} <span className="whitespace-nowrap">(+{ml(result.trainingExtraMl)})</span>
                  </p>
                )}
              </div>
              <p className="mt-3 text-center text-sm text-muted">Es una guía para empezar el hábito, no una obligación: escucha tu sed y ajústala cuando quieras.</p>

              <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-h2o-100">
                <p className="text-sm font-bold">Cómo la estimamos</p>
                <ul className="mt-2 space-y-1.5 text-sm" data-testid="result-factors">
                  {result.factors.map((f) => (
                    <li key={f.label} className="flex justify-between gap-3">
                      <span>{f.label}{f.note && <span className="block text-xs text-muted">{f.note}</span>}</span>
                      <span className="shrink-0 font-semibold">{f === result.factors[0] ? ml(f.ml) : `+${ml(f.ml)}`}</span>
                    </li>
                  ))}
                  {result.trainingExtraMl > 0 && (
                    <li className="flex justify-between gap-3 text-h2o-700">
                      <span>Entrenamiento ({EXERCISE_LABELS[a.exerciseMinutes!].toLowerCase()}, {INTENSITY_LABELS[a.intensity!].toLowerCase()}) — solo esos días</span>
                      <span className="shrink-0 font-semibold">+{ml(result.trainingExtraMl)}</span>
                    </li>
                  )}
                </ul>
                <details className="mt-3 text-xs text-muted">
                  <summary className="flex cursor-pointer items-center gap-1 font-semibold text-h2o-700"><Info size={13} /> Supuestos y límites <ChevronDown size={13} /></summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {result.assumptions.map((s) => <li key={s}>{s}</li>)}
                    <li>Basado en las ingestas adecuadas de las National Academies y EFSA, y en guías de hidratación deportiva (ACSM). No es una recomendación médica.</li>
                  </ul>
                </details>
              </div>

              {result.warnings.length > 0 && (
                <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900" role="note" data-testid="result-warning">
                  <p className="flex items-center gap-1.5 font-bold"><TriangleAlert size={16} /> Conviene revisarla de forma individual</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
              )}

              {manual && <div className="mt-4">{ManualPicker}</div>}
            </>
          ) : result.kind === "manual" ? (
            <>
              <p className="mt-4 rounded-2xl bg-h2o-50 p-4 text-sm text-h2o-900" data-testid="result-manual">{result.message}</p>
              <div className="mt-4">{ManualPicker}</div>
            </>
          ) : (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{result.errors.join(" ")}</p>
          )}

          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        {(step !== "edad" || onCancel) && (
          <button type="button" onClick={back} className="rounded-2xl bg-white px-5 py-4 font-semibold text-muted ring-1 ring-slate-200" aria-label="Atrás">
            <ArrowLeft size={20} />
          </button>
        )}
        {step !== "resultado" ? (
          <button type="button" onClick={next} disabled={!canNext} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg shadow-navy/20 transition active:scale-[0.98] disabled:opacity-40" data-testid="wiz-next">
            {step === "calor" ? "Ver mi meta" : "Continuar"} <ArrowRight size={20} />
          </button>
        ) : result.kind === "ok" && !manual ? (
          <div className="flex flex-1 flex-col gap-2">
            <button type="button" onClick={() => finish(true)} disabled={busy} className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg shadow-navy/20 disabled:opacity-60" data-testid="use-goal">
              <Check size={20} /> {busy ? "Guardando…" : saveLabel}
            </button>
            <button type="button" onClick={() => setManual(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-h2o-700 ring-1 ring-h2o-200" data-testid="adjust-goal">
              <SlidersHorizontal size={18} /> Ajustar manualmente
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => finish(false)} disabled={busy || result.kind === "invalid"} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg shadow-navy/20 disabled:opacity-60" data-testid="save-manual">
            <Check size={20} /> {busy ? "Guardando…" : "Guardar esta meta"}
          </button>
        )}
      </div>
    </div>
  );
}
