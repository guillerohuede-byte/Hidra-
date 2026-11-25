// ─────────────────────────────────────────────────────────────
// REGLAS DEL JUEGO H2O (espejo de supabase/migrations/…_reglas_del_juego.sql)
// La base de datos es la autoridad: otorga los premios. Este archivo
// sirve para mostrar progreso en pantalla y para el modo de prueba.
// Si cambias una regla, cámbiala en ambos lugares y en las pruebas.
// ─────────────────────────────────────────────────────────────

export type RuleEntry = { localDate: string; amountMl: number; source: "manual" | "nfc"; imported?: boolean };

export type Grant = { key: string; kind: string; label: string; gotitas: number; xp: number; shields?: number; item?: string };

export const ECONOMY = {
  welcome: 50,
  daily: { gotitas: 5, xp: 5 },
  drink: { gotitas: 2, xp: 10, maxPerDay: 6 },
  goal: { gotitas: 20, xp: 50 },
  levelGotitasPerLevel: 10,
} as const;

export const STREAK_MILESTONES: { days: number; gotitas: number; xp: number; shields?: number; item?: string; label: string }[] = [
  { days: 3, gotitas: 15, xp: 30, label: "Racha de 3 días" },
  { days: 7, gotitas: 40, xp: 60, shields: 1, label: "Racha de 7 días + Escudo de Gota" },
  { days: 14, gotitas: 60, xp: 80, label: "Racha de 14 días" },
  { days: 30, gotitas: 120, xp: 120, shields: 1, item: "medalla-water-club", label: "Racha de 30 días + Escudo + Medalla" },
  { days: 60, gotitas: 200, xp: 150, label: "Racha de 60 días" },
  { days: 100, gotitas: 400, xp: 200, item: "corona-gotas", label: "Racha de 100 días + Corona de Gotas" },
];

export const LEVEL_ITEMS: Record<number, string> = { 5: "bufanda-marejada", 10: "capa-tsunami" };

// ── Fechas (YYYY-MM-DD, sin horas) ───────────────────────────
export const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
/** Lunes de la semana de `d` */
export const weekStart = (d: string) => {
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay(); // 0 domingo
  return addDays(d, -((dow + 6) % 7));
};
/** "Hoy" en una zona horaria IANA */
export function todayIn(timezone: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
}

// ── Niveles: nivel L requiere 50·L·(L−1) XP ──────────────────
export const xpForLevel = (level: number) => 50 * level * (level - 1);
export const levelForXp = (xp: number) => Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * Math.max(xp, 0)) / 100)) / 2));

// ── Rachas ───────────────────────────────────────────────────
/** Un día cuenta si tiene al menos un registro o un Escudo de Gota. La racha sigue viva hasta el final de hoy. */
export function streakStats(activeDays: Iterable<string>, today: string) {
  const days = [...new Set(activeDays)].filter((d) => d <= today).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  let lastRunEnd: string | null = null;
  let lastRunLen = 0;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
    lastRunEnd = d;
    lastRunLen = run;
  }
  const alive = lastRunEnd !== null && lastRunEnd >= addDays(today, -1);
  return { current: alive ? lastRunLen : 0, best, activeToday: days.includes(today) };
}

// ── Misiones (definiciones para la interfaz) ─────────────────
export type MissionDef = {
  id: string;
  period: "diaria" | "semanal" | "logro";
  title: string;
  target: number;
  gotitas: number;
  xp: number;
  key: (today: string) => string;
};

export const MISSIONS: MissionDef[] = [
  { id: "registro3", period: "diaria", title: "Registra agua 3 veces hoy", target: 3, gotitas: 10, xp: 15, key: (t) => `m:d:registro3:${t}` },
  { id: "meta", period: "diaria", title: "Cumple tu meta de hoy", target: 1, gotitas: 10, xp: 15, key: (t) => `m:d:meta:${t}` },
  { id: "nfc", period: "diaria", title: "Registra una vez con tu sticker", target: 1, gotitas: 10, xp: 15, key: (t) => `m:d:nfc:${t}` },
  { id: "dias5", period: "semanal", title: "Registra agua 5 días esta semana", target: 5, gotitas: 40, xp: 40, key: (t) => `m:w:dias5:${weekStart(t)}` },
  { id: "metas3", period: "semanal", title: "Cumple tu meta 3 días esta semana", target: 3, gotitas: 40, xp: 40, key: (t) => `m:w:metas3:${weekStart(t)}` },
  { id: "nfc3", period: "semanal", title: "Usa tu sticker 3 veces esta semana", target: 3, gotitas: 30, xp: 30, key: (t) => `m:w:nfc3:${weekStart(t)}` },
  { id: "todas", period: "semanal", title: "Completa todas las misiones de la semana", target: 3, gotitas: 50, xp: 50, key: (t) => `m:w:todas:${weekStart(t)}` },
  { id: "primer-registro", period: "logro", title: "Primer registro", target: 1, gotitas: 10, xp: 20, key: () => "a:primer-registro" },
  { id: "primer-nfc", period: "logro", title: "Primera toma con sticker", target: 1, gotitas: 15, xp: 20, key: () => "a:primer-nfc" },
  { id: "metas5", period: "logro", title: "Cumple 5 metas diarias", target: 5, gotitas: 30, xp: 50, key: () => "a:metas5" },
  { id: "semana", period: "logro", title: "Registra agua 7 días (no seguidos)", target: 7, gotitas: 30, xp: 50, key: () => "a:semana" },
  { id: "primera-prenda", period: "logro", title: "Consigue tu primer accesorio", target: 1, gotitas: 10, xp: 20, key: () => "a:primera-prenda" },
];

export type GameState = {
  today: string;
  goalMl: number; // meta actual (para días sin meta guardada)
  dayGoals?: Record<string, number>; // meta guardada de cada día (no cambia si después se cambia la meta)
  onboarded: boolean;
  entries: RuleEntry[];
  freezes: string[];
  ownedPurchased: number; // prendas compradas
  keys: Set<string>; // premios ya otorgados
  shields: number;
  xp: number;
  goalsMet: number; // cantidad de premios 'meta' ya otorgados
};

const live = (e: RuleEntry[]) => e.filter((x) => !x.imported);
const byDate = (e: RuleEntry[], d: string) => e.filter((x) => x.localDate === d);
const sum = (e: RuleEntry[]) => e.reduce((a, x) => a + x.amountMl, 0);
/** Meta de un día: la guardada ese día; si no hay, la actual (igual que goal_for en la base) */
export const goalOf = (s: Pick<GameState, "goalMl" | "dayGoals">, day: string) => s.dayGoals?.[day] ?? s.goalMl;

/** Progreso de cada misión (para dibujar barras) */
export function missionProgress(m: MissionDef, s: Pick<GameState, "today" | "goalMl" | "dayGoals" | "entries" | "ownedPurchased" | "keys" | "goalsMet">) {
  const e = live(s.entries);
  const today = byDate(e, s.today);
  const ws = weekStart(s.today);
  const week = e.filter((x) => x.localDate >= ws && x.localDate <= addDays(ws, 6));
  const weekDays = [...new Set(week.map((x) => x.localDate))];
  switch (m.id) {
    case "registro3": return today.length;
    case "meta": return sum(today) >= goalOf(s, s.today) ? 1 : 0;
    case "nfc": return today.some((x) => x.source === "nfc") ? 1 : 0;
    case "dias5": return weekDays.length;
    case "metas3": return weekDays.filter((d) => sum(byDate(week, d)) >= goalOf(s, d)).length;
    case "nfc3": return week.filter((x) => x.source === "nfc").length;
    case "todas": return ["dias5", "metas3", "nfc3"].filter((id) => s.keys.has(MISSIONS.find((x) => x.id === id)!.key(s.today))).length;
    case "primer-registro": return e.length > 0 ? 1 : 0;
    case "primer-nfc": return e.some((x) => x.source === "nfc") ? 1 : 0;
    case "metas5": return s.goalsMet;
    case "semana": return new Set(e.map((x) => x.localDate)).size;
    case "primera-prenda": return s.ownedPurchased > 0 ? 1 : 0;
    default: return 0;
  }
}

/**
 * Evalúa todas las reglas y devuelve los premios pendientes (los que aún no
 * tienen su clave). Misma lógica que claim_rewards() en la base de datos.
 */
export function pendingRewards(s: GameState): { grants: Grant[]; freeze?: string } {
  const grants: Grant[] = [];
  const keys = new Set(s.keys);
  const give = (g: Grant) => {
    if (keys.has(g.key)) return false;
    keys.add(g.key);
    grants.push(g);
    return true;
  };
  let shields = s.shields;
  let freeze: string | undefined;
  const freezes = new Set(s.freezes);

  if (s.onboarded) give({ key: "welcome", kind: "bienvenida", label: "¡Bienvenida a Hidra!", gotitas: ECONOMY.welcome, xp: 0 });
  give({ key: `login:${s.today}`, kind: "diaria", label: "Recompensa diaria", ...ECONOMY.daily });

  // Escudo de Gota automático
  const yesterday = addDays(s.today, -1);
  const before = addDays(s.today, -2);
  const has = (d: string) => live(s.entries).some((x) => x.localDate === d) || freezes.has(d);
  if (shields > 0 && !has(yesterday) && has(before)) {
    freeze = yesterday;
    freezes.add(yesterday);
    if (give({ key: `freeze:${yesterday}`, kind: "escudo", label: "Escudo de Gota protegió tu racha", gotitas: 0, xp: 0, shields: -1 })) shields -= 1;
  }

  const e = live(s.entries);
  for (const d of [yesterday, s.today]) {
    const day = byDate(e, d);
    for (let k = 1; k <= Math.min(day.length, ECONOMY.drink.maxPerDay); k++) {
      give({ key: `drink:${d}:${k}`, kind: "registro", label: "Registro de agua", gotitas: ECONOMY.drink.gotitas, xp: ECONOMY.drink.xp });
    }
    if (sum(day) >= goalOf(s, d)) give({ key: `goal:${d}`, kind: "meta", label: "Meta diaria cumplida", ...ECONOMY.goal });
  }

  const goalsMet = s.goalsMet + grants.filter((g) => g.kind === "meta").length;
  const ctx = { ...s, keys, goalsMet };
  for (const m of MISSIONS) {
    if (m.id === "todas") continue;
    if (missionProgress(m, ctx) >= m.target) {
      give({ key: m.key(s.today), kind: m.period === "logro" ? "logro" : "mision", label: (m.period === "logro" ? "Logro: " : "Misión: ") + m.title, gotitas: m.gotitas, xp: m.xp });
    }
  }
  const todas = MISSIONS.find((m) => m.id === "todas")!;
  if (missionProgress(todas, { ...ctx, keys }) >= 3) give({ key: todas.key(s.today), kind: "mision", label: "¡Todas las misiones de la semana!", gotitas: todas.gotitas, xp: todas.xp });

  // La racha solo cuenta días registrados en la app (los importados son historial)
  const active = [...live(s.entries).map((x) => x.localDate), ...freezes];
  const { current } = streakStats(active, s.today);
  for (const ms of STREAK_MILESTONES) {
    if (current >= ms.days) give({ key: `streak:${ms.days}`, kind: "racha", label: ms.label, gotitas: ms.gotitas, xp: ms.xp, shields: ms.shields, item: ms.item });
  }

  const xp = s.xp + grants.reduce((a, g) => a + g.xp, 0);
  const level = levelForXp(xp);
  for (let l = 2; l <= level; l++) {
    give({ key: `level:${l}`, kind: "nivel", label: `¡Subiste al nivel ${l}!`, gotitas: ECONOMY.levelGotitasPerLevel * l, xp: 0, item: LEVEL_ITEMS[l] });
  }
  return { grants, freeze };
}
