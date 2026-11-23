"use client";

import { useEffect, useState } from "react";

// Devuelve la fecha actual solo en el navegador (evita desfases
// entre la hora del servidor y la del celular del usuario).
export function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

export function greeting(d: Date | null) {
  if (!d) return "Hola";
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export const longDate = (d: Date) => {
  const s = d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1); // "Lunes, 23 de noviembre"
};

export const shortWeekday = (d: Date) =>
  d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");
