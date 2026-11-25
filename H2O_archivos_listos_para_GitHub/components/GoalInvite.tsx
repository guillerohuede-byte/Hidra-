"use client";

// Invitación opcional para quienes ya tenían una meta: no la cambia hasta que confirmen una nueva.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, X } from "lucide-react";
import { useH2O } from "@/lib/store";

const KEY = "hidra:invitacion-meta:cerrada";

export default function GoalInvite() {
  const s = useH2O();
  const [closed, setClosed] = useState(true);
  const uid = s.data?.profile.id;
  useEffect(() => {
    try {
      setClosed(localStorage.getItem(KEY) === uid);
    } catch {
      setClosed(false);
    }
  }, [uid]);
  const d = s.data;
  if (!d || closed || d.hydration || d.profile.goalSource === "calculada" || !d.profile.onboarded) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, d.profile.id);
    } catch {}
    setClosed(true);
  };
  return (
    <section className="pop-in mb-4 flex items-start gap-3 rounded-3xl bg-white p-4 shadow-sm ring-2 ring-h2o-200" data-testid="goal-invite">
      <span className="rounded-2xl bg-h2o-50 p-2.5 text-h2o-600"><Calculator size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">¿Calculamos tu meta personal?</p>
        <p className="text-sm text-muted">5 preguntas rápidas. Tu meta actual se mantiene hasta que confirmes una nueva.</p>
        <Link href="/hidratacion" className="mt-2 inline-block rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">Calcular</Link>
      </div>
      <button onClick={close} className="rounded-full p-1.5 text-muted hover:bg-slate-100" aria-label="Ahora no"><X size={16} /></button>
    </section>
  );
}
