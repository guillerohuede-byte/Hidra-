"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bottle, IntakeEntry } from "./types";
import * as store from "./storage";

/**
 * Hook único que usan las pantallas para leer y modificar los datos.
 * - Se actualiza solo cuando cambian los datos (también desde otra pestaña).
 * - Revisa cada 30 s y al volver a la app si cambió el día (medianoche).
 */
export function useHydration() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [goal, setGoalState] = useState(store.DEFAULT_GOAL_ML);
  const [todayKey, setTodayKey] = useState("");
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setEntries(store.getEntries());
    setGoalState(store.getGoal());
    setTodayKey(store.localDateKey(new Date()));
    setBottles(store.getBottles());
    setSelectedId(store.getSelectedBottleId());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = store.subscribe(refresh);
    const checkDay = () => {
      const k = store.localDateKey(new Date());
      setTodayKey((prev) => (prev === k ? prev : k));
    };
    const timer = window.setInterval(checkDay, 30_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      unsub();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const today = todayKey ? store.entriesForDate(entries, todayKey) : [];
  const total = store.totalMl(today);
  const pct = goal > 0 ? (total / goal) * 100 : 0;

  return {
    ready, // false durante el primer instante (antes de leer el navegador)
    entries,
    today, // registros de hoy, del más reciente al más antiguo
    todayKey,
    total,
    goal,
    pct, // puede superar 100
    remaining: Math.max(goal - total, 0),
    addEntry: store.addEntry,
    deleteEntry: store.deleteEntry,
    setGoal: store.setGoal,
    // Botellas
    bottles,
    selectedBottle: bottles.find((b) => b.id === selectedId) ?? null,
    addBottle: store.addBottle,
    updateBottle: store.updateBottle,
    deleteBottle: store.deleteBottle,
    selectBottle: store.selectBottle,
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
