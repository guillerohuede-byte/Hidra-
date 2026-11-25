// Esqueleto común de todas las mascotas (coordenadas en un lienzo de 200×230).
// La ropa se dibuja relativa a estos puntos: por eso calza en cualquier animal.
export const SK = {
  W: 200,
  H: 230,
  head: { cx: 100, cy: 84, rx: 54, ry: 50 },
  body: { cx: 100, cy: 162, rx: 42, ry: 38 },
  eyes: { y: 88, dx: 21, r: 7.5 },
  mouth: { y: 107 },
  cheeks: { y: 101, dx: 34 },
  arms: { y: 160, dx: 41, rx: 10, ry: 18, tilt: 22 },
  feet: { y: 202, dx: 20, rx: 15, ry: 8 },
  neck: { y: 128 },
  hatBase: 46, // borde inferior de un gorro
} as const;

/** Ajustes por especie (pocas: el esqueleto es el mismo) */
export const SPECIES_OFFSETS: Record<string, { hatLift?: number }> = {
  rana: { hatLift: 6 }, // sus ojos sobresalen: el gorro va un poco más arriba
};
