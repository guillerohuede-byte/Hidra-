"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, Flame, Shield, Trophy, Lock, Medal } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { GotaIcon } from "@/components/GameChips";
import { useGame, type MissionView } from "@/lib/useGame";
import { STREAK_MILESTONES, addDays, weekStart } from "@/lib/game/rules";
import { ITEMS_BY_ID, MAX_SHIELDS } from "@/lib/game/catalog";

type Tab = "misiones" | "racha" | "logros";

export default function Misiones() {
  const g = useGame();
  const [tab, setTab] = useState<Tab>("misiones");
  return (
    <>
      <PageHeader title="Misiones y rachas" subtitle="Premios por constancia, no por tomar de más." />
      <div className="mb-4 grid grid-cols-3 rounded-2xl bg-white p-1 ring-1 ring-h2o-100" role="tablist">
        {(["misiones", "racha", "logros"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-sm font-bold capitalize transition ${tab === t ? "bg-navy text-white" : "text-muted"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "misiones" && (
        <div className="space-y-4">
          <MissionGroup title="Hoy" note="Se renuevan a medianoche (tu zona horaria)." items={g.daily} />
          <MissionGroup title="Esta semana" note={`Semana del ${fmt(weekStart(g.today))} al ${fmt(addDays(weekStart(g.today), 6))}.`} items={g.weekly} />
          <p className="rounded-2xl bg-h2o-50 p-4 text-xs leading-relaxed text-h2o-800">
            Los registros dan Gotitas hasta 6 veces al día y la meta se premia una vez por día: tomar de más no da más premios.
            Borrar y volver a registrar tampoco suma de nuevo.
          </p>
        </div>
      )}

      {tab === "racha" && <StreakTab />}

      {tab === "logros" && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
          <ul className="divide-y divide-slate-100">
            {g.achievements.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3" data-testid={`logro-${a.id}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${a.done ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                  {a.done ? <Trophy size={22} /> : <Lock size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{a.title}</span>
                  <Bar value={a.progress} max={a.target} done={a.done} />
                </span>
                <span className="text-xs font-bold text-muted">+{a.gotitas}</span>
              </li>
            ))}
            {STREAK_MILESTONES.filter((m) => m.item).map((m) => {
              const done = g.milestonesDone.includes(m.days);
              return (
                <li key={m.days} className="flex items-center gap-3 py-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${done ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
                    <Medal size={22} />
                  </span>
                  <span className="flex-1 text-sm">
                    <b>{ITEMS_BY_ID[m.item!].name}</b>
                    <span className="block text-xs text-muted">Racha de {m.days} días</span>
                  </span>
                  {done && <CircleCheck size={20} className="text-emerald-500" />}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

const fmt = (d: string) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "");

function Bar({ value, max, done }: { value: number; max: number; done: boolean }) {
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${done ? "bg-emerald-500" : "bg-h2o-500"}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </span>
      <span className="w-10 text-right text-[11px] font-semibold text-muted">{value}/{max}</span>
    </span>
  );
}

function MissionGroup({ title, note, items }: { title: string; note: string; items: MissionView[] }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
      <h2 className="font-bold">{title}</h2>
      <p className="text-xs text-muted">{note}</p>
      <ul className="mt-3 space-y-3">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-3" data-testid={`mision-${m.id}`}>
            {m.done ? <CircleCheck size={24} className="shrink-0 text-emerald-500" /> : <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-200" />}
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${m.done ? "text-muted" : ""}`}>{m.title}</span>
              <Bar value={m.progress} max={m.target} done={m.done} />
            </span>
            <span className="flex items-center gap-0.5 text-xs font-bold text-h2o-800"><GotaIcon size={13} />{m.gotitas}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StreakTab() {
  const g = useGame();
  const [offset, setOffset] = useState(0); // meses hacia atrás
  const base = g.today ? new Date(`${g.today}T12:00:00`) : new Date();
  const month = new Date(base.getFullYear(), base.getMonth() - offset, 1, 12);
  const first = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
  const lead = (month.getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 p-4 text-white shadow-sm" data-testid="streak-current">
          <Flame size={26} fill="currentColor" />
          <p className="mt-1 text-4xl font-extrabold">{g.streak}</p>
          <p className="text-sm font-semibold text-orange-50">{g.streak === 1 ? "día seguido" : "días seguidos"}</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-h2o-100">
          <Trophy size={24} className="text-amber-500" />
          <p className="mt-1 text-4xl font-extrabold text-navy">{g.bestStreak}</p>
          <p className="text-sm font-semibold text-muted">mejor racha</p>
        </div>
      </section>

      <p className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-h2o-100">
        {g.activeToday
          ? "✅ Hoy ya registraste: tu racha está a salvo."
          : g.streak > 0
            ? "Un registro hoy mantiene tu racha. ¡Sin presión, cuando puedas!"
            : "Registra agua hoy para empezar una racha nueva."}
        <span className="mt-1 block text-xs text-muted">La racha cuenta días con al menos un registro; cumplir la meta es un logro aparte (en verde en el calendario).</span>
      </p>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setOffset((o) => Math.min(o + 1, 3))} disabled={offset >= 3} className="rounded-full p-2 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <h2 className="font-bold">{((t) => t.charAt(0).toUpperCase() + t.slice(1))(month.toLocaleDateString("es-CL", { month: "long", year: "numeric" }))}</h2>
          <button onClick={() => setOffset((o) => Math.max(o - 1, 0))} disabled={offset === 0} className="rounded-full p-2 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" data-testid="streak-calendar">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const goal = g.goalDays.has(d), active = g.activeDays.has(d), freeze = g.freezes.has(d), today = d === g.today, future = d > g.today;
            const cls = goal ? "bg-emerald-500 text-white" : active ? "bg-h2o-500 text-white" : freeze ? "bg-sky-100 text-sky-700" : future ? "text-slate-300" : "bg-slate-50 text-slate-500";
            return (
              <span key={d} className={`relative flex aspect-square items-center justify-center rounded-xl text-xs font-bold ${cls} ${today ? "ring-2 ring-navy ring-offset-1" : ""}`}
                aria-label={`${d}${goal ? ", meta cumplida" : active ? ", con registro" : freeze ? ", protegido con escudo" : ""}`}>
                {freeze && !active ? <Shield size={14} /> : Number(d.slice(8))}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-h2o-500" /> Con registro</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-emerald-500" /> Meta cumplida</span>
          <span className="flex items-center gap-1"><Shield size={12} className="text-sky-600" /> Escudo</span>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <h2 className="flex items-center gap-2 font-bold"><Shield size={18} className="text-sky-600" /> Escudos de Gota: {g.shields}/{MAX_SHIELDS}</h2>
        <p className="mt-1 text-sm text-muted">Si un día se te olvida registrar, un escudo protege tu racha solo. Ganas uno con la racha de 7 y de 30 días, o lo compras en la tienda.</p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <h2 className="font-bold">Premios de racha</h2>
        <ul className="mt-3 space-y-2">
          {STREAK_MILESTONES.map((m) => {
            const done = g.milestonesDone.includes(m.days);
            const next = g.nextMilestone?.days === m.days;
            return (
              <li key={m.days} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${next ? "bg-orange-50 ring-1 ring-orange-200" : ""}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.days}</span>
                <span className="flex-1 text-sm">{m.label}{next && <span className="block text-xs text-orange-700">Te faltan {Math.max(m.days - g.streak, 0)} días</span>}</span>
                <span className="flex items-center gap-0.5 text-xs font-bold text-h2o-800">{done ? <CircleCheck size={18} className="text-emerald-500" /> : <><GotaIcon size={13} />{m.gotitas}</>}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
