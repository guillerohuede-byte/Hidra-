"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Calculator, Check, Hand } from "lucide-react";
import HydrationWizard, { type WizardResult } from "@/components/HydrationWizard";
import Logo from "@/components/Logo";
import PetAvatar from "@/components/pet/PetAvatar";
import { useH2O } from "@/lib/store";
import { SPECIES, SPECIES_BY_ID } from "@/lib/pets/species";
import { MIN_GOAL_ML, MAX_GOAL_ML } from "@/lib/storage";
import { ml } from "@/lib/format";
import { safeNext } from "@/lib/safeNext";

const GOALS = [1500, 2000, 2500, 3000];
const STEPS = ["Tú", "Compañero", "Nombre", "Meta"];

function Onboarding() {
  const s = useH2O();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s.data?.profile.displayName ?? "");
  const [goal, setGoal] = useState(s.data?.profile.goalMl ?? 2000);
  const [species, setSpecies] = useState(s.data?.pet?.species ?? "capibara");
  const [color, setColor] = useState(s.data?.pet?.color ?? "base");
  const [petName, setPetName] = useState(s.data?.pet?.name ?? "");
  const [goalMode, setGoalMode] = useState<"elegir" | "calcular" | "manual">("elegir");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sp = SPECIES_BY_ID[species];

  const canNext =
    (step === 0 && name.trim().length > 0 && name.trim().length <= 40) ||
    step === 1 ||
    (step === 2 && petName.trim().length > 0 && petName.trim().length <= 20) ||
    (step === 3 && goalMode === "manual" && goal >= MIN_GOAL_ML && goal <= MAX_GOAL_ML);

  const finish = async (r?: WizardResult) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await s.savePet({ species, color, name: petName.trim() });
      if (r?.hydration) await s.saveHydration(r.hydration);
      let tz = "America/Santiago";
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
      } catch {}
      await s.updateProfile({
        displayName: name.trim(),
        goalMl: r ? r.goalMl : goal,
        trainingExtraMl: r ? r.trainingExtraMl : 0,
        goalSource: r ? r.goalSource : "manual",
        timezone: tz,
        onboarded: true,
      });
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setBusy(false);
      throw e;
    }
  };

  const go = () => (step < 3 ? setStep(step + 1) : void finish().catch(() => {}));

  return (
    <div
      className="flex min-h-dvh flex-col bg-gradient-to-b from-h2o-100 via-h2o-50 to-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-6">
        <div className="flex items-center justify-between">
          <Logo compact />
          <ol className="flex gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
            {STEPS.map((l, i) => (
              <li key={l} className={`h-2 rounded-full transition-all ${i <= step ? "w-6 bg-h2o-500" : "w-2 bg-h2o-200"}`} aria-hidden />
            ))}
          </ol>
        </div>

        <form
          className="mt-6 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (canNext) go();
          }}
        >
          {step === 0 && (
            <section className="pop-in">
              <h1 className="text-3xl font-extrabold tracking-tight">¡Bienvenido a Hidra! 💧</h1>
              <p className="mt-2 text-muted">Te vamos a acompañar a crear el hábito de tomar agua, con un compañero que celebra contigo.</p>
              <label htmlFor="ob-name" className="mt-8 block text-sm font-semibold">¿Cómo te llamamos?</label>
              <input id="ob-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-lg outline-none focus:border-h2o-500 focus:ring-4 focus:ring-h2o-100" />
            </section>
          )}

          {step === 1 && (
            <section className="pop-in">
              <h1 className="text-3xl font-extrabold tracking-tight">Elige tu compañero</h1>
              <p className="mt-2 text-muted">Celebrará tus logros y podrás vestirlo con lo que ganes.</p>
              <div className="mt-4 flex flex-col items-center">
                <PetAvatar species={species} color={color} size={150} mood="feliz" anim="pet" animKey={species.length + species.charCodeAt(0)} />
                <p className="mt-1 text-lg font-bold">{sp.name}</p>
                <p className="text-sm text-muted">{sp.personality}</p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Especie">
                {SPECIES.map((x) => (
                  <button type="button" role="radio" aria-checked={species === x.id} key={x.id} onClick={() => { setSpecies(x.id); setColor("base"); }}
                    className={`flex flex-col items-center rounded-2xl p-1.5 transition ${species === x.id ? "bg-white shadow ring-2 ring-h2o-500" : "bg-white/60"}`}
                    data-testid={`species-${x.id}`}>
                    <PetAvatar species={x.id} color="base" size={56} />
                    <span className="text-[11px] font-semibold">{x.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="pop-in">
              <h1 className="text-3xl font-extrabold tracking-tight">¿Cómo se llama?</h1>
              <div className="mt-4 flex justify-center">
                <PetAvatar species={species} color={color} size={160} mood="emocionado" />
              </div>
              <input autoFocus value={petName} onChange={(e) => setPetName(e.target.value)} maxLength={20} placeholder={`Ej: ${species === "capibara" ? "Capi" : "Gotita"}`} aria-label="Nombre de tu compañero"
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center text-xl font-bold outline-none focus:border-h2o-500 focus:ring-4 focus:ring-h2o-100" />
              <p className="mt-5 text-sm font-semibold">Color</p>
              <div className="mt-2 flex gap-3" role="radiogroup" aria-label="Color">
                {sp.palettes.map((p) => (
                  <button type="button" key={p.id} role="radio" aria-checked={color === p.id} onClick={() => setColor(p.id)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-2xl bg-white py-2 text-xs font-semibold ${color === p.id ? "ring-2 ring-h2o-500" : "ring-1 ring-slate-200"}`}>
                    <span className="h-7 w-7 rounded-full ring-2 ring-white" style={{ background: `linear-gradient(135deg, ${p.body} 60%, ${p.belly} 60%)` }} />
                    {p.label}
                  </button>
                ))}
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            </section>
          )}

          {step === 3 && goalMode === "elegir" && (
            <section className="pop-in">
              <h1 className="text-3xl font-extrabold tracking-tight">Tu meta diaria</h1>
              <p className="mt-2 text-muted">Puedes calcular un punto de partida con 5 preguntas rápidas, o elegirla tú. Siempre la puedes cambiar.</p>
              <div className="mt-6 space-y-3">
                <button type="button" onClick={() => setGoalMode("calcular")} className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm ring-2 ring-h2o-200 transition active:scale-[0.99]" data-testid="ob-calcular">
                  <span className="rounded-2xl bg-h2o-50 p-3 text-h2o-600"><Calculator size={26} /></span>
                  <span><span className="block text-lg font-extrabold">Calcular mi meta</span><span className="block text-sm text-muted">Edad, peso, ejercicio y calor. Menos de un minuto.</span></span>
                </button>
                <button type="button" onClick={() => setGoalMode("manual")} className="flex w-full items-center gap-4 rounded-3xl bg-white/80 p-5 text-left ring-1 ring-h2o-100 transition active:scale-[0.99]" data-testid="ob-manual">
                  <span className="rounded-2xl bg-slate-50 p-3 text-slate-500"><Hand size={26} /></span>
                  <span><span className="block text-lg font-extrabold">Elegirla yo</span><span className="block text-sm text-muted">Tengo una meta en mente.</span></span>
                </button>
              </div>
            </section>
          )}

          {step === 3 && goalMode === "calcular" && (
            <HydrationWizard
              pet={{ species, color }}
              currentGoalMl={goal}
              onCancel={() => setGoalMode("elegir")}
              onFinish={(r) => finish(r)}
              saveLabel="Usar esta meta y empezar"
            />
          )}

          {step === 3 && goalMode === "manual" && (
            <section className="pop-in">
              <h1 className="text-3xl font-extrabold tracking-tight">Tu meta diaria</h1>
              <p className="mt-2 text-muted">La eliges tú y la puedes cambiar cuando quieras.</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <button type="button" key={g} onClick={() => setGoal(g)} aria-pressed={goal === g}
                    className={`rounded-2xl border-2 py-5 text-xl font-extrabold transition ${goal === g ? "border-h2o-500 bg-white text-h2o-700 shadow-sm" : "border-transparent bg-white/70 text-navy"}`}>
                    {ml(g)}
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-semibold" htmlFor="ob-goal">Otra cantidad: {ml(goal)}</label>
              <input id="ob-goal" type="range" min={MIN_GOAL_ML} max={MAX_GOAL_ML} step={100} value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="mt-2 w-full accent-h2o-600" />
              {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            </section>
          )}

          {!(step === 3 && goalMode === "calcular") && (
            <div className="mt-auto flex gap-3 pt-8">
              {step > 0 && (
                <button type="button" onClick={() => (step === 3 && goalMode !== "elegir" ? setGoalMode("elegir") : setStep(step - 1))} className="rounded-2xl bg-white px-5 py-4 font-semibold text-muted ring-1 ring-slate-200" aria-label="Atrás">
                  <ArrowLeft size={20} />
                </button>
              )}
              {!(step === 3 && goalMode === "elegir") && (
                <button type="submit" disabled={!canNext || busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg shadow-navy/20 transition active:scale-[0.98] disabled:opacity-40"
                  data-testid="ob-next">
                  {step < 3 ? <>Continuar <ArrowRight size={20} /></> : busy ? "Guardando…" : <>¡Empezar! <Check size={20} /></>}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Bienvenida() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}
