import { describe, expect, it } from "vitest";
import { estimate, type HydrationAnswers } from "./calc";

const adult: HydrationAnswers = { ageRange: "31-50", weightKg: 70, exerciseMinutes: 0, intensity: null, heat: "nunca", medicalAdvice: false };
const ok = (a: HydrationAnswers) => {
  const r = estimate(a);
  if (r.kind !== "ok") throw new Error(`esperaba ok y fue ${r.kind}`);
  return r;
};

describe("meta de hidratación (método v1)", () => {
  it("adulto sin ejercicio: solo peso, dentro del rango de bebidas de las National Academies", () => {
    const r = ok(adult);
    expect(r.baseMl).toBe(2100);
    expect(r.trainingExtraMl).toBe(0);
    expect(r.baseMl).toBeGreaterThanOrEqual(1600);
    expect(r.baseMl).toBeLessThanOrEqual(3000);
    expect(r.warnings).toEqual([]);
  });
  it("el peso se acota: personas muy livianas o pesadas no reciben metas extremas", () => {
    expect(ok({ ...adult, weightKg: 45 }).baseMl).toBe(1600);
    expect(ok({ ...adult, weightKg: 140 }).baseMl).toBe(3000);
  });
  it("actividad física: se suma solo los días de entrenamiento, según duración e intensidad", () => {
    const r = ok({ ...adult, exerciseMinutes: 45, intensity: "moderada" });
    expect(r.baseMl).toBe(2100); // la base no cambia
    expect(r.trainingExtraMl).toBe(400); // 0,75 h × 0,5 L/h = 375 → 400
    expect(r.trainingDayMl).toBe(2500);
    expect(ok({ ...adult, exerciseMinutes: 45, intensity: "intensa" }).trainingExtraMl).toBeGreaterThan(r.trainingExtraMl);
  });
  it("calor y sudoración ajustan la base, sin duplicar el ajuste del entrenamiento", () => {
    const calor = ok({ ...adult, heat: "frecuente", exerciseMinutes: 45, intensity: "moderada" });
    expect(calor.baseMl).toBe(2600);
    expect(calor.trainingExtraMl).toBe(400); // igual que sin calor: no se cuenta dos veces
    expect(ok({ ...adult, heat: "a_veces" }).baseMl).toBe(2400);
  });
  it("evita recomendaciones excesivas y avisa cuando conviene revisión individual", () => {
    const r = ok({ ...adult, weightKg: 200, heat: "frecuente", exerciseMinutes: 105, intensity: "intensa" });
    expect(r.baseMl).toBeLessThanOrEqual(3500);
    expect(r.trainingDayMl).toBeLessThanOrEqual(4000);
    expect(r.trainingExtraMl).toBeLessThanOrEqual(1200);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("datos inválidos o faltantes", () => {
    const r1 = estimate({ ...adult, weightKg: null });
    expect(r1.kind).toBe("invalid");
    expect(estimate({ ...adult, weightKg: 12 }).kind).toBe("invalid");
    expect(estimate({ ...adult, weightKg: Number.NaN }).kind).toBe("invalid");
    expect(estimate({ ...adult, exerciseMinutes: 45, intensity: null }).kind).toBe("invalid");
    expect(estimate({ ...adult, heat: null }).kind).toBe("invalid");
    expect(estimate({ ...adult, ageRange: null }).kind).toBe("invalid");
  });
  it("menores de edad e indicaciones médicas → meta manual (sin fórmula de adultos)", () => {
    const menor = estimate({ ...adult, ageRange: "menor", weightKg: null, heat: null, exerciseMinutes: null });
    expect(menor.kind).toBe("manual");
    const med = estimate({ ...adult, medicalAdvice: true });
    expect(med.kind).toBe("manual");
    if (med.kind === "manual") expect(med.reason).toBe("indicacion");
  });
  it("la edad adulta no cambia la estimación (las National Academies usan el mismo valor de 19 a 70+)", () => {
    expect(ok({ ...adult, ageRange: "71+" }).baseMl).toBe(ok(adult).baseMl);
  });
});
