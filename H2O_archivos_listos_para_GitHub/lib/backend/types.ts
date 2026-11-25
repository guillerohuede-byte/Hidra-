// Contrato de datos de Hidra. Las pantallas solo conocen esto; debajo puede
// estar Supabase (producción) o el backend de prueba (pruebas automáticas).
import type { Bottle, IntakeEntry } from "@/lib/types";

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  timezone: string;
  goalMl: number;
  onboarded: boolean;
  reduceMotion: boolean;
  selectedBottleId: string | null;
  localImportDoneAt: string | null;
  trainingExtraMl: number; // se suma a la meta solo los días de entrenamiento
  goalSource: "manual" | "calculada";
};

/** Respuestas guardadas del cálculo de meta (sin datos médicos) */
export type HydrationProfile = {
  ageRange: "18-30" | "31-50" | "51-70" | "71+";
  weightKg: number;
  exerciseMinutes: 0 | 20 | 45 | 75 | 105;
  intensity: "suave" | "moderada" | "intensa" | null;
  heat: "nunca" | "a_veces" | "frecuente";
  methodVersion: string;
  recommendedBaseMl: number;
  recommendedExtraMl: number;
  updatedAt: string;
};

export type Pet = { species: string; name: string; color: string };

export type Reward = {
  id: number;
  key: string;
  kind: string;
  label: string;
  gotitas: number;
  xp: number;
  shields: number;
  createdAt: string;
};

export type Summary = {
  today: string;
  xp: number;
  level: number;
  levelXpStart: number;
  levelXpNext: number;
  gotitas: number;
  shields: number;
  currentStreak: number;
  bestStreak: number;
  activeToday: boolean;
  freezes: string[];
  todayGoalMl: number; // meta de HOY (base + ajuste si hoy entrena)
  baseGoalMl: number;
  trainingExtraMl: number;
  trainingToday: boolean;
};

export type ShopPrice = { id: string; price: number; purchasable: boolean };

export type Snapshot = {
  profile: Profile;
  pet: Pet | null;
  bottles: Bottle[]; // incluye eliminadas (deletedAt) para explicar stickers viejos
  entries: IntakeEntry[];
  inventory: { itemId: string; source: "compra" | "premio" }[];
  equipment: Record<string, string>; // slot → itemId
  rewards: Reward[]; // más recientes primero
  rewardKeys: string[];
  summary: Summary;
  shop: ShopPrice[];
  hydration: HydrationProfile | null;
  dayGoals: Record<string, number>; // meta guardada de cada día (no cambia retroactivamente)
};

export type BottleInput = { name: string; capacityMl: number; defaultAmountMl: number; color?: string };

export type ImportPayload = {
  bottles: Bottle[];
  entries: IntakeEntry[];
  goalMl?: number;
};
export type ImportResult = {
  bottles_imported: number;
  bottles_already: number;
  bottles_conflict: string[];
  entries_imported: number;
  entries_skipped: number;
};

export interface Backend {
  readonly kind: "supabase" | "mock";
  currentUser(): Promise<{ id: string; email: string | null } | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string, redirectTo: string): Promise<{ needsConfirmation: boolean }>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;

  load(): Promise<Snapshot>;
  summary(): Promise<Summary>;
  updateProfile(patch: Partial<Pick<Profile, "displayName" | "timezone" | "goalMl" | "onboarded" | "reduceMotion" | "selectedBottleId" | "trainingExtraMl" | "goalSource">>): Promise<void>;
  setTrainingToday(training: boolean): Promise<void>;
  saveHydration(h: Omit<HydrationProfile, "updatedAt"> | null): Promise<void>; // null = borrar respuestas
  savePet(pet: Pet): Promise<void>;

  addBottle(id: string, input: BottleInput): Promise<Bottle>;
  updateBottle(id: string, input: BottleInput): Promise<Bottle>;
  deleteBottle(id: string): Promise<void>;

  addEntry(e: { clientKey: string; amountMl: number; source: "manual" | "nfc"; bottleId: string | null }): Promise<IntakeEntry>;
  deleteEntry(id: string): Promise<void>;

  claimRewards(): Promise<Reward[]>;
  buy(itemId: string, requestId: string): Promise<void>;
  equip(slot: string, itemId: string | null): Promise<void>;
  importLocal(payload: ImportPayload): Promise<ImportResult>;
}

/** Mensaje entendible para errores de red o del servidor */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg)) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(msg)) return "Primero confirma tu correo: revisa tu bandeja de entrada.";
  if (/User already registered/i.test(msg)) return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (/rate limit|too many/i.test(msg)) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (/Password should be/i.test(msg)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/bottles_user_name_uniq/.test(msg)) return "Ya tienes una botella con ese nombre";
  if (/Sin sesión|JWT expired|not authenticated/i.test(msg)) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (/row-level security|permission denied/i.test(msg)) return "No tienes permiso para hacer eso.";
  if (/violates check constraint/i.test(msg)) return "Revisa los valores: hay un dato fuera de rango.";
  if (/pet_equipment.*foreign key|inventory/i.test(msg)) return "Primero tienes que tener ese artículo.";
  return msg || "Algo salió mal. Inténtalo de nuevo.";
}
