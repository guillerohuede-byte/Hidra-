// ─────────────────────────────────────────────────────────────
// Validaciones compartidas + lectura de datos ANTIGUOS del navegador.
// Desde la Etapa 2 los datos viven en Supabase (lib/backend). Este archivo
// ya no escribe datos: solo lee lo que H2O guardó en localStorage antes,
// para ofrecer importarlo a la cuenta. Nunca lo borra.
// ─────────────────────────────────────────────────────────────

import type { Bottle, IntakeEntry } from "./types";

const LEGACY_KEYS = {
  entries: "h2o:v1:entries",
  goal: "h2o:v1:goal",
  bottles: "h2o:v1:bottles",
  imported: "h2o:v1:importedBy", // id de la cuenta a la que ya se importó (evita volver a preguntar)
};

export const DEFAULT_GOAL_ML = 2000;
export const MIN_GOAL_ML = 1000;
export const MAX_GOAL_ML = 6000;
export const MIN_AMOUNT_ML = 1;
export const MAX_AMOUNT_ML = 3000;
export const MIN_CAPACITY_ML = 50;
export const MAX_CAPACITY_ML = 5000;
export const MAX_BOTTLE_NAME = 30;

// ── Fechas ───────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
export const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── Botellas y códigos NFC ───────────────────────────────────
export const BOTTLE_COLORS = ["#1f78ee", "#0ea5a4", "#6366f1", "#f97316", "#ec4899", "#64748b"];
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L

/** Código único y permanente de 8 caracteres, ej. "B7K3QX9M" */
export function newBottleCode(existing: Set<string> = new Set()) {
  let id = "";
  do {
    const bytes = new Uint8Array(7);
    crypto.getRandomValues(bytes);
    id = "B" + [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
  } while (existing.has(id));
  return id;
}

const BOTTLE_ID_RE = /^B[A-Z2-9]{7}$/;
export const isValidBottleId = (id: string) => BOTTLE_ID_RE.test(id);

export type BottleInput = { name: string; capacityMl: number; defaultAmountMl: number };

/** Devuelve un mensaje de error, o null si los datos son válidos (misma regla que la base de datos) */
export function validateBottle(b: BottleInput, others: Bottle[] = [], editingId?: string): string | null {
  const name = b.name.trim();
  if (!name) return "Ponle un nombre a tu botella";
  if (name.length > MAX_BOTTLE_NAME) return `El nombre puede tener hasta ${MAX_BOTTLE_NAME} caracteres`;
  if (others.some((o) => o.id !== editingId && !o.deletedAt && o.name.trim().toLowerCase() === name.toLowerCase()))
    return "Ya tienes una botella con ese nombre";
  if (!Number.isInteger(b.capacityMl) || b.capacityMl < MIN_CAPACITY_ML || b.capacityMl > MAX_CAPACITY_ML)
    return `La capacidad debe estar entre ${MIN_CAPACITY_ML} y ${MAX_CAPACITY_ML} ml`;
  if (!Number.isInteger(b.defaultAmountMl) || b.defaultAmountMl < MIN_AMOUNT_ML)
    return "La cantidad habitual debe ser un número entero positivo";
  if (b.defaultAmountMl > b.capacityMl) return "La cantidad habitual no puede ser mayor que la capacidad";
  if (b.defaultAmountMl > MAX_AMOUNT_ML) return `La cantidad habitual puede ser hasta ${MAX_AMOUNT_ML} ml`;
  return null;
}

/** Link que se graba en el sticker */
export const nfcUrl = (bottleId: string, origin = window.location.origin) => `${origin}/nfc/${bottleId}`;

/** ¿Sirve esta dirección para un sticker? (HTTPS y no un computador local) */
export function isPublicOrigin(origin = window.location.origin) {
  try {
    const u = new URL(origin);
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || u.hostname.endsWith(".local");
    return u.protocol === "https:" && !local;
  } catch {
    return false;
  }
}

// ── Cálculos ─────────────────────────────────────────────────
export const entriesForDate = (entries: IntakeEntry[], dateKey: string) =>
  entries.filter((e) => e.date === dateKey).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const totalMl = (entries: IntakeEntry[]) => entries.reduce((acc, e) => acc + e.amountMl, 0);

// ── Datos antiguos (localStorage, Módulos 2–4) ───────────────
function readLegacy<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readLegacyData() {
  const bottles = readLegacy<Bottle[]>(LEGACY_KEYS.bottles, []);
  const entries = readLegacy<IntakeEntry[]>(LEGACY_KEYS.entries, []);
  const goal = readLegacy<number | null>(LEGACY_KEYS.goal, null);
  return {
    bottles: Array.isArray(bottles) ? bottles.filter((b) => b && isValidBottleId(String(b.id)) && typeof b.name === "string") : [],
    entries: Array.isArray(entries) ? entries.filter((e) => e && typeof e.amountMl === "number" && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date))) : [],
    goalMl: typeof goal === "number" ? goal : undefined,
  };
}

export const legacyImportedFor = () => readLegacy<string | null>(LEGACY_KEYS.imported, null);
export function markLegacyImported(userId: string) {
  try {
    window.localStorage.setItem(LEGACY_KEYS.imported, JSON.stringify(userId)); // los datos originales NO se borran
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
