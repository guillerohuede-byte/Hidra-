// ─────────────────────────────────────────────────────────────
// CAPA DE DATOS DE H2O
// Único lugar de la app que sabe DÓNDE se guardan los datos.
// Hoy: localStorage (en el navegador del celular).
// Etapa 2: se reemplaza el cuerpo de estas funciones por llamadas a
// la base de datos, sin tocar las pantallas.
// ─────────────────────────────────────────────────────────────

import type { Bottle, IntakeEntry } from "./types";

const KEYS = {
  entries: "h2o:v1:entries",
  goal: "h2o:v1:goal",
  bottles: "h2o:v1:bottles",
  selectedBottle: "h2o:v1:selectedBottle",
  deletedBottles: "h2o:v1:deletedBottles", // ids eliminados (para explicar un sticker "huérfano")
};

export const DEFAULT_GOAL_ML = 2000; // valor de demostración, configurable
export const MIN_AMOUNT_ML = 1;
export const MAX_AMOUNT_ML = 3000; // tope por registro, para evitar errores de tipeo
export const MIN_CAPACITY_ML = 50;
export const MAX_CAPACITY_ML = 5000;
export const MAX_BOTTLE_NAME = 30;

// ── Fechas en hora LOCAL del usuario (no UTC) ────────────────
const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-23" según el reloj del celular */
export const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "14:05" */
export const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// crypto.randomUUID no existe si la página se abre por http://IP (contexto
// no seguro), así que hay un respaldo.
function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Lectura / escritura segura ───────────────────────────────
function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback; // datos corruptos o almacenamiento bloqueado
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  notify();
}

// Aviso a la app (y a otras pestañas) de que los datos cambiaron
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("h2o:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// ── API pública ──────────────────────────────────────────────
export function getEntries(): IntakeEntry[] {
  const list = read<IntakeEntry[]>(KEYS.entries, []);
  return Array.isArray(list) ? list.filter((e) => e && typeof e.amountMl === "number" && e.date) : [];
}

export function addEntry(amountMl: number, source: IntakeEntry["source"] = "manual", bottleId?: string | null): IntakeEntry {
  const amount = Math.round(amountMl);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT_ML || amount > MAX_AMOUNT_ML) {
    throw new Error(`Cantidad inválida: debe estar entre ${MIN_AMOUNT_ML} y ${MAX_AMOUNT_ML} ml`);
  }
  const now = new Date();
  const bottle = bottleId ? getBottles().find((b) => b.id === bottleId) : undefined;
  const entry: IntakeEntry = {
    id: newId(),
    amountMl: amount,
    timestamp: now.toISOString(),
    date: localDateKey(now),
    time: localTime(now),
    source,
    ...(bottle ? { bottleId: bottle.id, bottleName: bottle.name } : {}),
  };
  write(KEYS.entries, [...getEntries(), entry]);
  return entry;
}

export function deleteEntry(id: string) {
  write(
    KEYS.entries,
    getEntries().filter((e) => e.id !== id),
  );
}

export function getGoal(): number {
  const g = read<number>(KEYS.goal, DEFAULT_GOAL_ML);
  return typeof g === "number" && g > 0 ? g : DEFAULT_GOAL_ML;
}

export function setGoal(ml: number) {
  write(KEYS.goal, Math.round(ml));
}

// ── Botellas ─────────────────────────────────────────────────
const BOTTLE_COLORS = ["#1f78ee", "#0ea5a4", "#6366f1", "#f97316", "#ec4899", "#64748b"];
// Sin letras/números que se confunden (0/O, 1/I/L)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código único y estable de 8 caracteres, ej. "B7K3QX9M" */
function newBottleId(existing: Set<string>) {
  const rand = (n: number) => {
    const out: string[] = [];
    const bytes = new Uint8Array(n);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes.forEach((b) => out.push(CODE_CHARS[b % CODE_CHARS.length]));
    return out.join("");
  };
  let id = "";
  do id = "B" + rand(7);
  while (existing.has(id));
  return id;
}

export type BottleInput = { name: string; capacityMl: number; defaultAmountMl: number };

/** Devuelve un mensaje de error, o null si los datos son válidos */
export function validateBottle(b: BottleInput, others: Bottle[] = [], editingId?: string): string | null {
  const name = b.name.trim();
  if (!name) return "Ponle un nombre a tu botella";
  if (name.length > MAX_BOTTLE_NAME) return `El nombre puede tener hasta ${MAX_BOTTLE_NAME} caracteres`;
  if (others.some((o) => o.id !== editingId && o.name.trim().toLowerCase() === name.toLowerCase()))
    return "Ya tienes una botella con ese nombre";
  if (!Number.isInteger(b.capacityMl) || b.capacityMl < MIN_CAPACITY_ML || b.capacityMl > MAX_CAPACITY_ML)
    return `La capacidad debe estar entre ${MIN_CAPACITY_ML} y ${MAX_CAPACITY_ML} ml`;
  if (!Number.isInteger(b.defaultAmountMl) || b.defaultAmountMl < MIN_AMOUNT_ML)
    return "La cantidad habitual debe ser un número entero positivo";
  if (b.defaultAmountMl > b.capacityMl) return "La cantidad habitual no puede ser mayor que la capacidad";
  if (b.defaultAmountMl > MAX_AMOUNT_ML) return `La cantidad habitual puede ser hasta ${MAX_AMOUNT_ML} ml`;
  return null;
}

export function getBottles(): Bottle[] {
  const list = read<Bottle[]>(KEYS.bottles, []);
  return Array.isArray(list) ? list.filter((b) => b && typeof b.id === "string" && typeof b.name === "string") : [];
}

export function addBottle(input: BottleInput): Bottle {
  const bottles = getBottles();
  const err = validateBottle(input, bottles);
  if (err) throw new Error(err);
  const bottle: Bottle = {
    id: newBottleId(new Set(bottles.map((b) => b.id))),
    name: input.name.trim(),
    capacityMl: input.capacityMl,
    defaultAmountMl: input.defaultAmountMl,
    color: BOTTLE_COLORS[bottles.length % BOTTLE_COLORS.length],
    createdAt: new Date().toISOString(),
  };
  write(KEYS.bottles, [...bottles, bottle]);
  // La primera botella queda seleccionada automáticamente
  if (!getSelectedBottleId()) write(KEYS.selectedBottle, bottle.id);
  return bottle;
}

/** Edita nombre/capacidad/cantidad. El id NO cambia (el sticker sigue apuntando a ella). */
export function updateBottle(id: string, input: BottleInput): Bottle {
  const bottles = getBottles();
  const current = bottles.find((b) => b.id === id);
  if (!current) throw new Error("La botella ya no existe");
  const err = validateBottle(input, bottles, id);
  if (err) throw new Error(err);
  const updated: Bottle = { ...current, name: input.name.trim(), capacityMl: input.capacityMl, defaultAmountMl: input.defaultAmountMl };
  write(KEYS.bottles, bottles.map((b) => (b.id === id ? updated : b)));
  return updated;
}

/** Elimina la botella. Los registros de consumo NO se tocan. */
export function deleteBottle(id: string) {
  const remaining = getBottles().filter((b) => b.id !== id);
  write(KEYS.bottles, remaining);
  const deleted = read<string[]>(KEYS.deletedBottles, []);
  if (!deleted.includes(id)) write(KEYS.deletedBottles, [...deleted, id].slice(-50));
  if (read<string | null>(KEYS.selectedBottle, null) === id) {
    write(KEYS.selectedBottle, remaining[0]?.id ?? null); // pasa a la siguiente, o a ninguna
  }
}

/** Id de la botella en uso (solo si todavía existe) */
export function getSelectedBottleId(): string | null {
  const id = read<string | null>(KEYS.selectedBottle, null);
  return id && getBottles().some((b) => b.id === id) ? id : null;
}

export function selectBottle(id: string | null) {
  write(KEYS.selectedBottle, id);
}

// ── NFC ──────────────────────────────────────────────────────
// El sticker guarda solo un link: https://<dominio>/nfc/<código de la botella>

const BOTTLE_ID_RE = /^B[A-Z2-9]{7}$/;
export const isValidBottleId = (id: string) => BOTTLE_ID_RE.test(id);

export const getBottle = (id: string) => getBottles().find((b) => b.id === id) ?? null;

export const wasBottleDeleted = (id: string) => read<string[]>(KEYS.deletedBottles, []).includes(id);

/** Link que se graba en el sticker, usando la dirección donde está abierta la app */
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

/** Marca que el sticker de esta botella ya se usó con éxito al menos una vez */
export function markTagUsed(id: string) {
  const bottles = getBottles();
  const b = bottles.find((x) => x.id === id);
  if (!b || b.tagLinkedAt) return;
  write(KEYS.bottles, bottles.map((x) => (x.id === id ? { ...x, tagLinkedAt: new Date().toISOString() } : x)));
}

// ── Cálculos (no dependen de dónde vienen los datos) ─────────
export const entriesForDate = (entries: IntakeEntry[], dateKey: string) =>
  entries
    .filter((e) => e.date === dateKey)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // más reciente primero

export const totalMl = (entries: IntakeEntry[]) => entries.reduce((acc, e) => acc + e.amountMl, 0);
