// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE LA TIENDA H2O
// Marcas 100% ficticias y originales (sin logos ni nombres de marcas reales).
// La base de datos se genera desde este archivo (scripts/gen-catalog-sql.mjs)
// y el precio que vale es el de la base de datos.
// ─────────────────────────────────────────────────────────────

export type Slot = "top" | "pants" | "jacket" | "shoes" | "hat" | "glasses" | "accessory" | "costume" | "consumable";
export type Rarity = "comun" | "rara" | "epica" | "legendaria";

export type Brand = { id: string; name: string; tagline: string; color: string };

export const BRANDS: Record<string, Brand> = {
  goutte: { id: "goutte", name: "Maison Goutte", tagline: "Elegancia gota a gota", color: "#1c2b4a" },
  hidrolujo: { id: "hidrolujo", name: "Hidrolujo", tagline: "Brilla más que el agua", color: "#c9a227" },
  balde: { id: "balde", name: "Balde & Co.", tagline: "Talla única: enorme", color: "#7c3aed" },
  charco: { id: "charco", name: "Charco Norte", tagline: "Hecho para saltar charcos", color: "#0f766e" },
  gotafit: { id: "gotafit", name: "Gotafit", tagline: "Suda, hidrata, repite", color: "#ef4444" },
  burbuja: { id: "burbuja", name: "Burbuja Runners", tagline: "Corre ligero como espuma", color: "#0ea5e9" },
  marea: { id: "marea", name: "Marea Clásica", tagline: "Lo clásico nunca se seca", color: "#1e40af" },
  glu: { id: "glu", name: "Glu-Glu Basics", tagline: "Lo básico, pero mojado", color: "#64748b" },
  ola: { id: "ola", name: "Ola Urbana", tagline: "Estilo que rompe", color: "#f97316" },
  splash: { id: "splash", name: "Splashwear", tagline: "Ropa para chapotear", color: "#06b6d4" },
  waterclub: { id: "waterclub", name: "Water Club", tagline: "Solo para los más constantes", color: "#0e4cab" },
  drynt: { id: "drynt", name: "Dryn't", tagline: "Moda absurda, hidratación seria", color: "#ec4899" },
};

export type CatalogItem = {
  id: string;
  slot: Slot;
  brand: keyof typeof BRANDS;
  name: string;
  price: number; // en Gotitas
  rarity: Rarity;
  purchasable: boolean; // false = solo como premio
  unlock?: string; // cómo se consigue si no se compra
  colors: [string, string, string?]; // principal, secundario, detalle
};

export const CATALOG: CatalogItem[] = [
  // Poleras y polerones
  { id: "polera-glu", slot: "top", brand: "glu", name: "Polera básica Gota", price: 30, rarity: "comun", purchasable: true, colors: ["#e0f2fe", "#38bdf8"] },
  { id: "polera-gotafit", slot: "top", brand: "gotafit", name: "Polera Hidrotérmica", price: 50, rarity: "comun", purchasable: true, colors: ["#ef4444", "#ffffff"] },
  { id: "polera-drynt", slot: "top", brand: "drynt", name: "Polera «Seco por dentro»", price: 60, rarity: "rara", purchasable: true, colors: ["#fde047", "#ec4899"] },
  { id: "poleron-ola", slot: "top", brand: "ola", name: "Polerón Oleaje", price: 80, rarity: "rara", purchasable: true, colors: ["#f97316", "#fff7ed", "#1c2b4a"] },
  { id: "camisa-marea", slot: "top", brand: "marea", name: "Camisa Náutica", price: 90, rarity: "rara", purchasable: true, colors: ["#ffffff", "#1e40af", "#ef4444"] },
  // Pantalones
  { id: "short-splash", slot: "pants", brand: "splash", name: "Short de baño Splash", price: 40, rarity: "comun", purchasable: true, colors: ["#06b6d4", "#fef08a"] },
  { id: "buzo-gotafit", slot: "pants", brand: "gotafit", name: "Buzo Gotafit", price: 45, rarity: "comun", purchasable: true, colors: ["#1f2937", "#ef4444"] },
  { id: "jeans-ola", slot: "pants", brand: "ola", name: "Jeans Corriente", price: 60, rarity: "comun", purchasable: true, colors: ["#3b82f6", "#1e3a8a"] },
  { id: "pantalon-balde", slot: "pants", brand: "balde", name: "Pantalón Balde XXL", price: 120, rarity: "epica", purchasable: true, colors: ["#a78bfa", "#6d28d9"] },
  // Chaquetas
  { id: "impermeable-charco", slot: "jacket", brand: "charco", name: "Impermeable Llovizna", price: 90, rarity: "rara", purchasable: true, colors: ["#facc15", "#ca8a04"] },
  { id: "parka-charco", slot: "jacket", brand: "charco", name: "Parka Charco Norte", price: 150, rarity: "epica", purchasable: true, colors: ["#0f766e", "#134e4a", "#f8fafc"] },
  { id: "chaqueta-balde", slot: "jacket", brand: "balde", name: "Chaqueta Megabalde", price: 180, rarity: "epica", purchasable: true, colors: ["#7c3aed", "#c4b5fd"] },
  { id: "blazer-goutte", slot: "jacket", brand: "goutte", name: "Blazer Goutte", price: 220, rarity: "epica", purchasable: true, colors: ["#1c2b4a", "#e2e8f0", "#c9a227"] },
  // Zapatillas
  { id: "botas-charco", slot: "shoes", brand: "charco", name: "Botas de charco", price: 60, rarity: "comun", purchasable: true, colors: ["#facc15", "#a16207"] },
  { id: "zapas-gotafit", slot: "shoes", brand: "gotafit", name: "Zapatillas Salpicón", price: 70, rarity: "comun", purchasable: true, colors: ["#ffffff", "#ef4444"] },
  { id: "zapas-burbuja", slot: "shoes", brand: "burbuja", name: "Burbuja Runners 990", price: 90, rarity: "rara", purchasable: true, colors: ["#94a3b8", "#0ea5e9"] },
  { id: "zapas-balde", slot: "shoes", brand: "balde", name: "Zapatillas Megabalde", price: 200, rarity: "legendaria", purchasable: true, colors: ["#f8fafc", "#7c3aed", "#facc15"] },
  // Gorros
  { id: "jockey-ola", slot: "hat", brand: "ola", name: "Jockey Ola Urbana", price: 40, rarity: "comun", purchasable: true, colors: ["#f97316", "#1c2b4a"] },
  { id: "gorro-lana-marea", slot: "hat", brand: "marea", name: "Gorro de lana Marea", price: 50, rarity: "comun", purchasable: true, colors: ["#1e40af", "#ffffff"] },
  { id: "pescador-splash", slot: "hat", brand: "splash", name: "Gorro pescador", price: 55, rarity: "comun", purchasable: true, colors: ["#fef08a", "#06b6d4"] },
  { id: "boina-goutte", slot: "hat", brand: "goutte", name: "Boina Goutte", price: 120, rarity: "rara", purchasable: true, colors: ["#be123c", "#881337"] },
  { id: "sombrero-hidrolujo", slot: "hat", brand: "hidrolujo", name: "Sombrero Hidrolujo", price: 260, rarity: "epica", purchasable: true, colors: ["#1c2b4a", "#c9a227"] },
  { id: "corona-gotas", slot: "hat", brand: "waterclub", name: "Corona de Gotas", price: 0, rarity: "legendaria", purchasable: false, unlock: "Racha de 100 días", colors: ["#7dd3fc", "#0ea5e9", "#facc15"] },
  // Lentes
  { id: "lentes-splash", slot: "glasses", brand: "splash", name: "Lentes de sol Splash", price: 45, rarity: "comun", purchasable: true, colors: ["#0f172a", "#06b6d4"] },
  { id: "antiparras", slot: "glasses", brand: "splash", name: "Antiparras de buceo", price: 60, rarity: "rara", purchasable: true, colors: ["#38bdf8", "#f97316"] },
  { id: "lentes-hidrolujo", slot: "glasses", brand: "hidrolujo", name: "Lentes Hidrolujo dorados", price: 240, rarity: "epica", purchasable: true, colors: ["#c9a227", "#7c2d12"] },
  // Accesorios
  { id: "flotador-patito", slot: "accessory", brand: "drynt", name: "Flotador de patito", price: 70, rarity: "rara", purchasable: true, colors: ["#facc15", "#f97316"] },
  { id: "bolso-goutte", slot: "accessory", brand: "goutte", name: "Bolso Maison Goutte", price: 280, rarity: "epica", purchasable: true, colors: ["#1c2b4a", "#c9a227"] },
  { id: "cadena-gota", slot: "accessory", brand: "hidrolujo", name: "Cadena Gota de Oro", price: 300, rarity: "legendaria", purchasable: true, colors: ["#facc15", "#38bdf8"] },
  { id: "bufanda-marejada", slot: "accessory", brand: "waterclub", name: "Bufanda Marejada", price: 0, rarity: "rara", purchasable: false, unlock: "Llega al nivel 5", colors: ["#0ea5e9", "#ffffff"] },
  { id: "medalla-water-club", slot: "accessory", brand: "waterclub", name: "Medalla Water Club", price: 0, rarity: "epica", purchasable: false, unlock: "Racha de 30 días", colors: ["#facc15", "#0e4cab"] },
  { id: "capa-tsunami", slot: "accessory", brand: "waterclub", name: "Capa Tsunami", price: 0, rarity: "legendaria", purchasable: false, unlock: "Llega al nivel 10", colors: ["#0e4cab", "#7dd3fc"] },
  // Disfraces completos
  { id: "disfraz-botella", slot: "costume", brand: "drynt", name: "Disfraz de botella", price: 250, rarity: "epica", purchasable: true, colors: ["#bae6fd", "#0ea5e9", "#1c2b4a"] },
  { id: "disfraz-tiburon", slot: "costume", brand: "splash", name: "Disfraz de tiburón", price: 320, rarity: "legendaria", purchasable: true, colors: ["#64748b", "#f1f5f9"] },
  { id: "disfraz-gota", slot: "costume", brand: "drynt", name: "Disfraz de gota", price: 350, rarity: "legendaria", purchasable: true, colors: ["#38bdf8", "#e0f2fe"] },
  // Consumibles
  { id: "escudo-gota", slot: "consumable", brand: "waterclub", name: "Escudo de Gota", price: 60, rarity: "comun", purchasable: true, colors: ["#38bdf8", "#0e4cab"] },
];

export const ITEMS_BY_ID: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

export const SLOT_LABELS: Record<Slot, string> = {
  top: "Poleras y polerones",
  pants: "Pantalones",
  jacket: "Chaquetas",
  shoes: "Zapatillas",
  hat: "Gorros",
  glasses: "Lentes",
  accessory: "Accesorios",
  costume: "Disfraces",
  consumable: "Especiales",
};

export const RARITY: Record<Rarity, { label: string; color: string; bg: string }> = {
  comun: { label: "Común", color: "#475569", bg: "#f1f5f9" },
  rara: { label: "Rara", color: "#0369a1", bg: "#e0f2fe" },
  epica: { label: "Épica", color: "#7c3aed", bg: "#ede9fe" },
  legendaria: { label: "Legendaria", color: "#b45309", bg: "#fef3c7" },
};

export const EQUIP_SLOTS: Exclude<Slot, "consumable">[] = ["hat", "glasses", "top", "jacket", "pants", "shoes", "accessory", "costume"];
export const MAX_SHIELDS = 3;
