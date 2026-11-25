"use client";

// Datos de juego listos para mostrar: misiones con progreso, racha,
// nivel, inventario. Los premios los decide el servidor; aquí solo se muestra.
import { useMemo } from "react";
import { useH2O } from "./store";
import { MISSIONS, STREAK_MILESTONES, missionProgress, addDays, type MissionDef } from "./game/rules";
import { CATALOG, ITEMS_BY_ID } from "./game/catalog";

export type MissionView = MissionDef & { progress: number; done: boolean };

export function useGame() {
  const s = useH2O();
  const d = s.data;

  return useMemo(() => {
    const today = s.todayKey || d?.summary.today || "";
    const keys = new Set(d?.rewardKeys ?? []);
    const entries = (d?.entries ?? []).filter((e) => !e.pending).map((e) => ({
      localDate: e.date, amountMl: e.amountMl, source: e.source, imported: e.imported,
    }));
    const ownedPurchased = (d?.inventory ?? []).filter((i) => i.source === "compra" && ITEMS_BY_ID[i.itemId]?.slot !== "consumable").length;
    const goalsMet = (d?.rewardKeys ?? []).filter((k) => k.startsWith("goal:")).length;
    const goalMl = d?.profile.goalMl ?? 2000;

    const missions: MissionView[] = MISSIONS.map((m) => {
      const done = today ? keys.has(m.key(today)) : false;
      const dayGoals = { ...(d?.dayGoals ?? {}), ...(today && d ? { [today]: d.summary.todayGoalMl } : {}) };
      const progress = done ? m.target : Math.min(missionProgress(m, { today, goalMl, dayGoals, entries, ownedPurchased, keys, goalsMet }), m.target);
      return { ...m, progress, done };
    });

    const sum = d?.summary;
    const level = sum?.level ?? 1;
    const levelSpan = Math.max((sum?.levelXpNext ?? 100) - (sum?.levelXpStart ?? 0), 1);
    const levelPct = Math.min(100, Math.max(0, (((sum?.xp ?? 0) - (sum?.levelXpStart ?? 0)) / levelSpan) * 100));

    // Calendario de racha: días con registro (no importados no cuentan distinto: todos cuentan para el hábito)
    // La racha solo cuenta días registrados en la app; lo importado se muestra aparte
    const activeDays = new Set(entries.filter((e) => !e.imported).map((e) => e.localDate));
    const importedDays = new Set(entries.filter((e) => e.imported).map((e) => e.localDate));
    const goalDays = new Set<string>();
    const byDay = new Map<string, number>();
    for (const e of entries.filter((x) => !x.imported)) byDay.set(e.localDate, (byDay.get(e.localDate) ?? 0) + e.amountMl);
    for (const [day, ml] of byDay) if (ml >= (d?.dayGoals?.[day] ?? goalMl)) goalDays.add(day);
    const freezes = new Set(sum?.freezes ?? []);

    const owned = new Set((d?.inventory ?? []).map((i) => i.itemId));
    const nextMilestone = STREAK_MILESTONES.find((m) => !keys.has(`streak:${m.days}`));

    return {
      today,
      missions,
      daily: missions.filter((m) => m.period === "diaria"),
      weekly: missions.filter((m) => m.period === "semanal"),
      achievements: missions.filter((m) => m.period === "logro"),
      level,
      levelPct,
      xp: sum?.xp ?? 0,
      xpToNext: Math.max(0, (sum?.levelXpNext ?? 0) - (sum?.xp ?? 0)),
      gotitas: sum?.gotitas ?? 0,
      shields: sum?.shields ?? 0,
      streak: sum?.currentStreak ?? 0,
      bestStreak: sum?.bestStreak ?? 0,
      activeToday: sum?.activeToday ?? false,
      activeDays,
      importedDays,
      goalDays,
      freezes,
      owned,
      equipment: d?.equipment ?? {},
      nextMilestone,
      milestonesDone: STREAK_MILESTONES.filter((m) => keys.has(`streak:${m.days}`)).map((m) => m.days),
      catalog: CATALOG,
      prices: new Map((d?.shop ?? []).map((p) => [p.id, p])),
      lastActive: [...activeDays].sort().at(-1) ?? null,
      daysAway: (() => {
        const last = [...activeDays].sort().at(-1);
        if (!last || !today) return null;
        let n = 0;
        for (let x = last; x < today && n < 400; x = addDays(x, 1)) n++;
        return n;
      })(),
    };
  }, [d, s.todayKey]);
}
