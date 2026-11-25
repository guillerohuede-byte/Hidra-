// ─────────────────────────────────────────────────────────────
// ESPECIES DE MASCOTAS
// Para agregar un animal nuevo: añade una entrada aquí y sus rasgos
// en components/pet/SpeciesParts.tsx. Todas comparten el mismo
// esqueleto (lib/pets/skeleton.ts), así la ropa calza en todas.
// ─────────────────────────────────────────────────────────────

export type Palette = {
  id: string;
  label: string;
  body: string; // color principal
  belly: string; // panza / hocico
  accent: string; // detalles (orejas internas, picos, branquias)
  dark: string; // contornos y manchas
};

export type Species = {
  id: string;
  name: string;
  personality: string; // cómo es (se muestra al elegirlo)
  greeting: string; // lo que dice al saludar
  palettes: Palette[];
};

export const SPECIES: Species[] = [
  {
    id: "capibara", name: "Capibara", personality: "Tranquila, zen y amiga de todos.", greeting: "Respira… y toma agüita.",
    palettes: [
      { id: "base", label: "Clásica", body: "#b07b52", belly: "#d4a77f", accent: "#8a5a37", dark: "#5c3a22" },
      { id: "caramelo", label: "Caramelo", body: "#d39b62", belly: "#ecc79d", accent: "#a86f3b", dark: "#6b4220" },
      { id: "chocolate", label: "Chocolate", body: "#7a5238", belly: "#a8805f", accent: "#5a3a25", dark: "#3b2416" },
    ],
  },
  {
    id: "ajolote", name: "Ajolote", personality: "Sonriente, curioso y un poco dramático.", greeting: "¡Glu glu! ¿Tomamos agua?",
    palettes: [
      { id: "base", label: "Rosado", body: "#f9a8c9", belly: "#fde2ee", accent: "#ec4899", dark: "#9d2a63" },
      { id: "celeste", label: "Celeste", body: "#93c5fd", belly: "#dbeafe", accent: "#3b82f6", dark: "#1e3a8a" },
      { id: "dorado", label: "Dorado", body: "#fcd34d", belly: "#fef3c7", accent: "#f59e0b", dark: "#92400e" },
    ],
  },
  {
    id: "rana", name: "Rana", personality: "Saltarina, optimista y fan de los charcos.", greeting: "¡Croac! Un sorbo más.",
    palettes: [
      { id: "base", label: "Verde", body: "#6cc96a", belly: "#d9f5c6", accent: "#3f9a45", dark: "#225c2a" },
      { id: "lima", label: "Lima", body: "#a3e635", belly: "#ecfccb", accent: "#65a30d", dark: "#365314" },
      { id: "turquesa", label: "Turquesa", body: "#2dd4bf", belly: "#ccfbf1", accent: "#0d9488", dark: "#134e4a" },
    ],
  },
  {
    id: "pinguino", name: "Pingüino", personality: "Elegante, ordenado y siempre fresco.", greeting: "Hidratarse es de gente elegante.",
    palettes: [
      { id: "base", label: "Clásico", body: "#334155", belly: "#f8fafc", accent: "#fb923c", dark: "#0f172a" },
      { id: "azul", label: "Azul", body: "#1e40af", belly: "#eff6ff", accent: "#fbbf24", dark: "#172554" },
      { id: "gris", label: "Bebé", body: "#94a3b8", belly: "#f1f5f9", accent: "#fb923c", dark: "#475569" },
    ],
  },
  {
    id: "nutria", name: "Nutria", personality: "Juguetona, cariñosa y experta en flotar.", greeting: "¡Flotemos juntos!",
    palettes: [
      { id: "base", label: "Café", body: "#9a6b4b", belly: "#e7cfb4", accent: "#6f4630", dark: "#3f2716" },
      { id: "arena", label: "Arena", body: "#c89f78", belly: "#f3e4d1", accent: "#94704f", dark: "#5c4330" },
      { id: "noche", label: "Noche", body: "#57534e", belly: "#d6d3d1", accent: "#44403c", dark: "#1c1917" },
    ],
  },
  {
    id: "gato", name: "Gato", personality: "Independiente, pero te extraña (no lo admitirá).", greeting: "Miau. Toma agua, humano.",
    palettes: [
      { id: "base", label: "Naranjo", body: "#f6a34b", belly: "#fde7c8", accent: "#f9a8c9", dark: "#b45309" },
      { id: "gris", label: "Gris", body: "#9ca3af", belly: "#f3f4f6", accent: "#f9a8c9", dark: "#4b5563" },
      { id: "negro", label: "Negro", body: "#3f3f46", belly: "#a1a1aa", accent: "#f9a8c9", dark: "#18181b" },
    ],
  },
  {
    id: "perro", name: "Perro", personality: "Leal, entusiasta y celebra todo.", greeting: "¡Guau! ¡Qué bueno verte!",
    palettes: [
      { id: "base", label: "Dorado", body: "#e9b872", belly: "#fbe8c8", accent: "#a86f3b", dark: "#6b4220" },
      { id: "dalmata", label: "Blanco", body: "#f5f5f4", belly: "#ffffff", accent: "#57534e", dark: "#292524" },
      { id: "chocolate", label: "Chocolate", body: "#8b5a3c", belly: "#d6b394", accent: "#5c3a25", dark: "#2e1c11" },
    ],
  },
  {
    id: "zorro", name: "Zorro", personality: "Astuto, aventurero y muy fotogénico.", greeting: "Tengo un plan: agua.",
    palettes: [
      { id: "base", label: "Rojizo", body: "#f97316", belly: "#fff7ed", accent: "#3f2a1d", dark: "#7c2d12" },
      { id: "artico", label: "Ártico", body: "#e2e8f0", belly: "#ffffff", accent: "#64748b", dark: "#475569" },
      { id: "plata", label: "Plateado", body: "#71717a", belly: "#e4e4e7", accent: "#27272a", dark: "#18181b" },
    ],
  },
  {
    id: "panda", name: "Panda", personality: "Glotón, dormilón y abrazable.", greeting: "Agua, bambú y siesta.",
    palettes: [
      { id: "base", label: "Clásico", body: "#fafafa", belly: "#ffffff", accent: "#27272a", dark: "#18181b" },
      { id: "rojo", label: "Rojo", body: "#c2410c", belly: "#fed7aa", accent: "#431407", dark: "#1c0a03" },
      { id: "cafe", label: "Café", body: "#f5ebe0", belly: "#fffaf3", accent: "#6b4f3a", dark: "#3b2a1e" },
    ],
  },
  {
    id: "pato", name: "Pato", personality: "Ruidoso, alegre y profesional del agua.", greeting: "¡Cuac! El agua es lo mío.",
    palettes: [
      { id: "base", label: "Pollito", body: "#fde047", belly: "#fef9c3", accent: "#fb923c", dark: "#a16207" },
      { id: "blanco", label: "Blanco", body: "#f8fafc", belly: "#ffffff", accent: "#fb923c", dark: "#94a3b8" },
      { id: "silvestre", label: "Silvestre", body: "#a16207", belly: "#fde68a", accent: "#f59e0b", dark: "#422006" },
    ],
  },
  {
    id: "tortuga", name: "Tortuga", personality: "Paciente y constante: paso a paso.", greeting: "Despacito, pero todos los días.",
    palettes: [
      { id: "base", label: "Bosque", body: "#86c47a", belly: "#e6f4d7", accent: "#7c5a35", dark: "#3f6b34" },
      { id: "mar", label: "Marina", body: "#7dd3c0", belly: "#e0f7f1", accent: "#1d6f6a", dark: "#134e4a" },
      { id: "desierto", label: "Desierto", body: "#d6c48a", belly: "#f6efd5", accent: "#8a6d3b", dark: "#5a4520" },
    ],
  },
  {
    id: "conejo", name: "Conejo", personality: "Rápido, tierno y salta de alegría.", greeting: "¡Salto de felicidad por ti!",
    palettes: [
      { id: "base", label: "Nube", body: "#f5f5f5", belly: "#ffffff", accent: "#f9a8c9", dark: "#a3a3a3" },
      { id: "cafe", label: "Canela", body: "#c8a27a", belly: "#f1e3d0", accent: "#f9a8c9", dark: "#7a5a3a" },
      { id: "gris", label: "Ceniza", body: "#a8a29e", belly: "#e7e5e4", accent: "#f9a8c9", dark: "#57534e" },
    ],
  },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function paletteFor(speciesId: string, colorId: string): Palette {
  const sp = SPECIES_BY_ID[speciesId] ?? SPECIES[0];
  return sp.palettes.find((p) => p.id === colorId) ?? sp.palettes[0];
}

/** Evolución visual por nivel (el animal no cambia, gana detalles) */
export function evolutionFor(level: number) {
  if (level >= 20) return { tier: 3, label: "Leyenda del agua" };
  if (level >= 10) return { tier: 2, label: "Gota brillante" };
  if (level >= 5) return { tier: 1, label: "Chapoteador" };
  return { tier: 0, label: "Gotita" };
}
