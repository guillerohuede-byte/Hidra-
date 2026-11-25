"use client";

import { useMemo } from "react";
import { useH2O } from "./store";
import { entriesForDate, totalMl, DEFAULT_GOAL_ML } from "./storage";

/**
 * Vista simple de los datos de hidratación para las pantallas
 * (misma forma que en los módulos anteriores, ahora conectada a la cuenta).
 */
export function useHydration() {
  const s = useH2O();
  const d = s.data;
  // Meta de HOY: la base, más el ajuste si hoy es día de entrenamiento
  const goal = d?.summary.todayGoalMl ?? d?.profile.goalMl ?? DEFAULT_GOAL_ML;
  const baseGoal = d?.profile.goalMl ?? DEFAULT_GOAL_ML;
  const trainingExtra = d?.profile.trainingExtraMl ?? 0;
  const trainingToday = !!d?.summary.trainingToday;
  /** Meta guardada de un día (los días pasados no cambian si después se cambia la meta) */
  const goalForDay = (day: string) => d?.dayGoals?.[day] ?? (day === s.todayKey ? goal : baseGoal);
  const entries = useMemo(() => d?.entries ?? [], [d?.entries]);
  const today = useMemo(() => (s.todayKey ? entriesForDate(entries, s.todayKey) : []), [entries, s.todayKey]);
  const total = totalMl(today);
  const pct = goal > 0 ? (total / goal) * 100 : 0;
  const bottles = useMemo(() => (d?.bottles ?? []).filter((b) => !b.deletedAt), [d?.bottles]);

  return {
    ready: s.status === "ready" && !!d,
    entries,
    today,
    todayKey: s.todayKey,
    total,
    goal,
    baseGoal,
    trainingExtra,
    trainingToday,
    goalForDay,
    setTrainingToday: s.setTrainingToday,
    pct,
    remaining: Math.max(goal - total, 0),
    addEntry: s.addEntry,
    deleteEntry: s.deleteEntry,
    setGoal: (goalMl: number) => s.updateProfile({ goalMl }),
    bottles,
    allBottles: d?.bottles ?? [],
    selectedBottle: bottles.find((b) => b.id === d?.profile.selectedBottleId) ?? null,
    addBottle: s.addBottle,
    updateBottle: s.updateBottle,
    deleteBottle: s.deleteBottle,
    selectBottle: s.selectBottle,
  };
}

/** 37.5 → "37,5%"; 25 → "25%" */
export const formatPct = (p: number) =>
  `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(Math.round(p * 10) / 10)}%`;

export function progressMessage(pct: number, count: number) {
  if (count === 0) return { title: "¡Empecemos!", text: "Registra tu primer consumo del día." };
  if (pct >= 100) return { title: "¡Meta cumplida! 🎉", text: "Lograste tu meta de hoy." };
  if (pct >= 75) return { title: "¡Ya casi!", text: "Te queda poco para tu meta." };
  if (pct >= 50) return { title: "¡Buen trabajo!", text: "Vas por la mitad del camino." };
  return { title: "Buen comienzo", text: "Sigue registrando durante el día." };
}
