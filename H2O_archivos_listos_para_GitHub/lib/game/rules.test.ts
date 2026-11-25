import { describe, expect, it } from "vitest";
import { addDays, levelForXp, pendingRewards, streakStats, todayIn, weekStart, xpForLevel, type GameState } from "./rules";

const base = (over: Partial<GameState> = {}): GameState => ({
  today: "2026-11-25",
  goalMl: 1000,
  onboarded: true,
  entries: [],
  freezes: [],
  ownedPurchased: 0,
  keys: new Set(),
  shields: 0,
  xp: 0,
  goalsMet: 0,
  ...over,
});
const apply = (s: GameState) => {
  const r = pendingRewards(s);
  r.grants.forEach((g) => s.keys.add(g.key));
  s.xp += r.grants.reduce((a, g) => a + g.xp, 0);
  s.shields += r.grants.reduce((a, g) => a + (g.shields ?? 0), 0);
  s.goalsMet += r.grants.filter((g) => g.kind === "meta").length;
  if (r.freeze) s.freezes.push(r.freeze);
  return r.grants;
};

describe("fechas y zonas horarias", () => {
  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("la semana parte el lunes", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23"); // miércoles → lunes
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // domingo → lunes
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
  });
  it("'hoy' depende de la zona horaria del usuario", () => {
    const instante = new Date("2026-11-25T02:30:00Z"); // 23:30 del 24 en Santiago
    expect(todayIn("America/Santiago", instante)).toBe("2026-11-24");
    expect(todayIn("Europe/Madrid", instante)).toBe("2026-11-25");
    expect(todayIn("Zona/Inventada", instante)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("niveles", () => {
  it("coinciden con la fórmula de la base de datos", () => {
    expect([0, 99, 100, 299, 300, 999, 1000].map(levelForXp)).toEqual([1, 1, 2, 2, 3, 4, 5]);
    for (let l = 1; l < 30; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });
});

describe("rachas", () => {
  const T = "2026-11-25";
  it("cuenta días seguidos y sigue viva si hoy aún no registras", () => {
    const days = [addDays(T, -3), addDays(T, -2), addDays(T, -1)];
    expect(streakStats(days, T)).toEqual({ current: 3, best: 3, activeToday: false });
    expect(streakStats([...days, T], T)).toEqual({ current: 4, best: 4, activeToday: true });
  });
  it("se corta si faltó ayer, pero guarda la mejor racha", () => {
    const days = [addDays(T, -6), addDays(T, -5), addDays(T, -4), addDays(T, -2)];
    expect(streakStats(days, T)).toEqual({ current: 0, best: 3, activeToday: false });
  });
  it("varios registros el mismo día cuentan una vez", () => {
    expect(streakStats([T, T, T], T).current).toBe(1);
  });
  it("ignora días futuros (reloj adelantado)", () => {
    expect(streakStats([addDays(T, 1)], T).current).toBe(0);
  });
});

describe("premios", () => {
  it("son idempotentes: reclamar dos veces no duplica", () => {
    const s = base({ entries: [{ localDate: "2026-11-25", amountMl: 250, source: "manual" }] });
    expect(apply(s).length).toBeGreaterThan(0);
    expect(apply(s)).toEqual([]);
  });
  it("borrar y volver a registrar no da premios extra", () => {
    const s = base({ entries: [{ localDate: "2026-11-25", amountMl: 250, source: "manual" }] });
    apply(s);
    s.entries = [{ localDate: "2026-11-25", amountMl: 250, source: "manual" }]; // borrado + nuevo
    expect(apply(s)).toEqual([]);
  });
  it("máximo 6 registros premiados por día (no incentiva tomar de más)", () => {
    const s = base({ goalMl: 6000, entries: Array.from({ length: 10 }, () => ({ localDate: "2026-11-25", amountMl: 100, source: "manual" as const })) });
    expect(apply(s).filter((g) => g.kind === "registro")).toHaveLength(6);
  });
  it("la meta se premia una vez y superarla no da más", () => {
    const s = base({ entries: [{ localDate: "2026-11-25", amountMl: 1000, source: "manual" }] });
    expect(apply(s).filter((g) => g.kind === "meta")).toHaveLength(1);
    s.entries.push({ localDate: "2026-11-25", amountMl: 2000, source: "manual" });
    expect(apply(s).filter((g) => g.kind === "meta")).toHaveLength(0);
  });
  it("los registros importados no dan premios", () => {
    const s = base({ entries: [{ localDate: "2026-11-25", amountMl: 3000, source: "nfc", imported: true }] });
    const kinds = apply(s).map((g) => g.kind);
    expect(kinds).not.toContain("meta");
    expect(kinds).not.toContain("registro");
  });
  it("hito de 7 días entrega un Escudo, y el escudo cubre un día perdido", () => {
    const T = "2026-11-25";
    const s = base({ entries: Array.from({ length: 7 }, (_, i) => ({ localDate: addDays(T, -1 - i), amountMl: 100, source: "manual" as const })) });
    const g = apply(s);
    expect(g.find((x) => x.key === "streak:7")?.shields).toBe(1);
    expect(s.shields).toBe(1);
    // Al día siguiente sin registro "ayer", el escudo cubre ese día
    s.today = addDays(T, 1);
    const g2 = apply(s);
    expect(g2.some((x) => x.kind === "escudo")).toBe(true);
    expect(s.shields).toBe(0);
    expect(streakStats([...s.entries.map((e) => e.localDate), ...s.freezes], s.today).current).toBe(8);
  });
  it("días importados (aunque sean 100) no crean racha ni premios de racha", () => {
    const T = "2026-11-25";
    const s = base({ entries: Array.from({ length: 100 }, (_, i) => ({ localDate: addDays(T, -1 - i), amountMl: 250, source: "manual" as const, imported: true })) });
    const g = apply(s);
    expect(g.some((x) => x.kind === "racha")).toBe(false);
    expect(g.some((x) => x.item)).toBe(false);
  });
  it("misión semanal 'todas' solo tras las otras tres", () => {
    const T = "2026-11-29"; // domingo
    const entries = Array.from({ length: 5 }, (_, i) => ({ localDate: addDays("2026-11-23", i), amountMl: 1000, source: "nfc" as const }));
    const s = base({ today: T, entries });
    const keys = apply(s).map((g) => g.key);
    expect(keys).toContain("m:w:dias5:2026-11-23");
    expect(keys).toContain("m:w:todas:2026-11-23");
  });
  it("sube de nivel y entrega la bufanda en el nivel 5", () => {
    const s = base({ xp: 1000 });
    const g = apply(s);
    expect(g.filter((x) => x.kind === "nivel").map((x) => x.key)).toEqual(["level:2", "level:3", "level:4", "level:5"]);
    expect(g.find((x) => x.key === "level:5")?.item).toBe("bufanda-marejada");
  });
});

describe("metas por día (cambiar la meta no es retroactivo)", () => {
  const T = "2026-11-25";
  const Y = "2026-11-24";
  const st = (over: Partial<GameState>): GameState => ({
    today: T, goalMl: 2000, onboarded: true, entries: [], freezes: [], ownedPurchased: 0, keys: new Set(), shields: 0, xp: 0, goalsMet: 0, ...over,
  });
  it("bajar la meta hoy no da el premio de meta de ayer", () => {
    const s = st({ goalMl: 1000, dayGoals: { [Y]: 2000 }, entries: [{ localDate: Y, amountMl: 1500, source: "manual" }] });
    expect(pendingRewards(s).grants.some((g) => g.key === `goal:${Y}`)).toBe(false);
  });
  it("la meta de hoy usa la guardada (por ejemplo, con el ajuste de entrenamiento)", () => {
    const s = st({ goalMl: 2000, dayGoals: { [T]: 2500 }, entries: [{ localDate: T, amountMl: 2200, source: "manual" }] });
    expect(pendingRewards(s).grants.some((g) => g.key === `goal:${T}`)).toBe(false);
    s.dayGoals = { [T]: 2000 }; // hoy descanso
    expect(pendingRewards(s).grants.some((g) => g.key === `goal:${T}`)).toBe(true);
  });
  it("cumplir la meta dos veces el mismo día (p. ej. alternando entrenamiento) no duplica el premio", () => {
    const s = st({ dayGoals: { [T]: 2000 }, entries: [{ localDate: T, amountMl: 2600, source: "manual" }] });
    const first = pendingRewards(s).grants;
    s.keys = new Set(first.map((g) => g.key));
    s.dayGoals = { [T]: 2500 };
    expect(pendingRewards(s).grants.filter((g) => g.kind === "meta")).toHaveLength(0);
  });
});
