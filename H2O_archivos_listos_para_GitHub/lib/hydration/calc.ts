// ─────────────────────────────────────────────────────────────
// Estimación ORIENTATIVA de la meta diaria de líquidos (método v1).
// Fuentes y justificación: docs/meta-de-hidratacion.md
// Calcula líquidos para beber (no agua total: ~20 % viene de alimentos).
// ─────────────────────────────────────────────────────────────

export const METHOD_VERSION = "v1";

export type AgeRange = "menor" | "18-30" | "31-50" | "51-70" | "71+";
export type ExerciseMinutes = 0 | 20 | 45 | 75 | 105; // nada, <30, 30–60, 60–90, >90 min por sesión
export type Intensity = "suave" | "moderada" | "intensa";
export type Heat = "nunca" | "a_veces" | "frecuente";

export type HydrationAnswers = {
  ageRange: AgeRange | null;
  weightKg: number | null;
  exerciseMinutes: ExerciseMinutes | null;
  intensity: Intensity | null;
  heat: Heat | null;
  medicalAdvice: boolean | null; // ¿un profesional le dio indicaciones sobre líquidos? (no se guarda)
};

export type Factor = { label: string; ml: number; note?: string };

export type HydrationResult =
  | { kind: "manual"; reason: "menor" | "indicacion"; message: string }
  | { kind: "invalid"; errors: string[] }
  | {
      kind: "ok";
      baseMl: number; // meta de todos los días
      trainingExtraMl: number; // se suma solo los días de entrenamiento
      trainingDayMl: number;
      factors: Factor[];
      warnings: string[];
      assumptions: string[];
    };

export const LIMITS = {
  mlPerKg: 30,
  baseMin: 1600,
  weightBaseMax: 3000,
  baseMax: 3500,
  extraMax: 1200,
  dayMax: 4000,
  weightMin: 30,
  weightMax: 250,
} as const;

export const HEAT_ML: Record<Heat, number> = { nunca: 0, a_veces: 250, frecuente: 500 };
export const RATE_L_PER_H: Record<Intensity, number> = { suave: 0.3, moderada: 0.5, intensa: 0.7 };

const round = (v: number, step: number) => Math.round(v / step) * step;

export function validate(a: HydrationAnswers): string[] {
  const e: string[] = [];
  if (!a.ageRange) e.push("Indica tu rango de edad.");
  if (a.medicalAdvice === null) e.push("Responde si tienes indicaciones de un profesional sobre líquidos.");
  if (a.ageRange === "menor" || a.medicalAdvice) return e; // en esos casos no se piden más datos
  if (a.weightKg === null || !Number.isFinite(a.weightKg)) e.push("Indica tu peso.");
  else if (a.weightKg < LIMITS.weightMin || a.weightKg > LIMITS.weightMax) e.push(`El peso debe estar entre ${LIMITS.weightMin} y ${LIMITS.weightMax} kg.`);
  if (a.exerciseMinutes === null) e.push("Indica cuánto ejercicio haces.");
  if (a.exerciseMinutes && !a.intensity) e.push("Indica la intensidad del ejercicio.");
  if (!a.heat) e.push("Indica tu exposición al calor.");
  return e;
}

export function estimate(a: HydrationAnswers): HydrationResult {
  const errors = validate(a);
  if (errors.length) return { kind: "invalid", errors };
  if (a.ageRange === "menor")
    return {
      kind: "manual",
      reason: "menor",
      message:
        "Para menores de 18 años las necesidades cambian según la edad y el desarrollo, así que no aplicamos un cálculo para adultos. Elige una meta junto a tu familia o con la ayuda de un profesional de salud.",
    };
  if (a.medicalAdvice)
    return {
      kind: "manual",
      reason: "indicacion",
      message:
        "Como tienes una indicación de un profesional sobre cuánto líquido tomar, esa indicación manda. Ingresa la meta que te dieron; Hidra no la calcula por ti.",
    };

  const weight = a.weightKg!;
  const factors: Factor[] = [];
  const warnings: string[] = [];

  const byWeightRaw = weight * LIMITS.mlPerKg;
  const byWeight = Math.min(Math.max(byWeightRaw, LIMITS.baseMin), LIMITS.weightBaseMax);
  factors.push({
    label: `Peso (${Math.round(weight)} kg × ${LIMITS.mlPerKg} ml)`,
    ml: round(byWeight, 50),
    note: byWeight !== byWeightRaw ? `Acotado al rango ${LIMITS.baseMin / 1000}–${LIMITS.weightBaseMax / 1000} L` : undefined,
  });

  const heat = HEAT_ML[a.heat!];
  if (heat) factors.push({ label: a.heat === "frecuente" ? "Calor o sudoración frecuente" : "Calor o sudoración a veces", ml: heat });

  let base = round(byWeight + heat, 100);
  if (base > LIMITS.baseMax) {
    base = LIMITS.baseMax;
    warnings.push("Tu estimación llegó al máximo que Hidra calcula. Si sudas mucho a diario, conviene una evaluación individual.");
  }

  let extra = 0;
  if (a.exerciseMinutes && a.intensity) {
    const raw = (a.exerciseMinutes / 60) * RATE_L_PER_H[a.intensity] * 1000;
    extra = Math.min(round(raw, 50), LIMITS.extraMax);
    if (a.exerciseMinutes > 90)
      warnings.push("Entrenas más de 90 minutos: tu pérdida por sudor puede variar mucho. Pésate antes y después de entrenar para conocerla, o consulta a un profesional.");
    if (raw > LIMITS.extraMax) warnings.push("El ajuste por entrenamiento llegó a su máximo.");
  }
  if (base + extra > LIMITS.dayMax) {
    extra = Math.max(0, LIMITS.dayMax - base);
    warnings.push("La meta de un día de entrenamiento llegó al máximo de 4 L.");
  }
  if (weight < 40 || weight > 150) warnings.push("Con este peso la estimación es menos precisa; tómala solo como punto de partida.");

  return {
    kind: "ok",
    baseMl: base,
    trainingExtraMl: extra,
    trainingDayMl: base + extra,
    factors,
    warnings,
    assumptions: [
      "Es una estimación de líquidos para beber: cerca de un 20 % del agua diaria llega con los alimentos.",
      "El peso se usa como guía general, no como fórmula exacta.",
      "El calor del día a día va en la meta base; el sudor del entrenamiento se suma solo los días que entrenas (no se cuenta dos veces).",
      "La sed sigue siendo una buena guía: no hace falta tomar de más.",
    ],
  };
}

export const AGE_LABELS: Record<AgeRange, string> = { menor: "Menos de 18", "18-30": "18 a 30", "31-50": "31 a 50", "51-70": "51 a 70", "71+": "71 o más" };
export const EXERCISE_LABELS: Record<ExerciseMinutes, string> = { 0: "No entreno", 20: "Menos de 30 min", 45: "30 a 60 min", 75: "60 a 90 min", 105: "Más de 90 min" };
export const INTENSITY_LABELS: Record<Intensity, string> = { suave: "Suave", moderada: "Moderada", intensa: "Intensa" };
export const HEAT_LABELS: Record<Heat, string> = { nunca: "Casi nunca", a_veces: "A veces", frecuente: "Seguido" };
