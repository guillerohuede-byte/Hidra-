"use client";

// Escenario de la mascota: fondo, globo de diálogo y reacción a los eventos
// (tomar agua, premios, subir de nivel). Mensajes siempre amables, sin culpa.
import { useMemo, useState } from "react";
import PetAvatar, { type Mood, type PetAnim } from "./PetAvatar";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import { SPECIES_BY_ID } from "@/lib/pets/species";

export function petMood(pct: number, count: number, hour: number): Mood {
  if (pct >= 100) return "feliz";
  if (hour >= 23 || hour < 6) return "dormido";
  if (count === 0 && hour >= 13) return "sediento";
  if (pct >= 50) return "emocionado";
  return "tranquilo";
}

export function petLine(opts: { name: string; pct: number; count: number; daysAway: number | null; streak: number; greeting: string; mood: Mood }) {
  const { pct, count, daysAway, streak, greeting, mood } = opts;
  if (count === 0 && daysAway !== null && daysAway >= 2) return "¡Qué bueno verte de vuelta! Partamos con un vaso, sin apuro.";
  if (pct >= 100) return streak >= 3 ? `¡Meta cumplida y ${streak} días seguidos! Estoy orgulloso.` : "¡Meta cumplida! Lo que tomes ahora es extra, a tu ritmo.";
  if (mood === "dormido") return "Zzz… mañana seguimos.";
  if (count === 0) return greeting;
  if (pct >= 75) return "¡Ya casi! Me encanta este ritmo.";
  if (pct >= 50) return "¡Vamos por la mitad! Gracias por cuidarnos.";
  return "¡Glup! Cada sorbo cuenta.";
}

export default function PetStage({ pct, count, size = 190, compact = false }: { pct: number; count: number; size?: number; compact?: boolean }) {
  const s = useH2O();
  const g = useGame();
  const pet = s.data?.pet;
  const [localAnim, setLocalAnim] = useState<{ a: PetAnim; k: number }>({ a: null, k: 0 });
  const hour = new Date().getHours();
  const mood = petMood(pct, count, hour);
  const sp = pet ? SPECIES_BY_ID[pet.species] : undefined;
  const line = useMemo(
    () => (pet ? petLine({ name: pet.name, pct, count, daysAway: g.daysAway, streak: g.streak, greeting: sp?.greeting ?? "¡Hola!", mood }) : ""),
    [pet, pct, count, g.daysAway, g.streak, sp, mood],
  );
  if (!pet) return null;

  const ev = s.petEvent;
  const useLocal = localAnim.k > (ev?.at ?? 0);
  const anim = useLocal ? localAnim.a : (ev?.type ?? null);
  const animKey = useLocal ? localAnim.k : (ev?.at ?? 0);

  return (
    <div className={`relative flex flex-col items-center ${compact ? "" : "pt-2"}`}>
      {!compact && (
        <div className="pop-in relative mb-1 max-w-[17rem] rounded-2xl bg-white px-4 py-2.5 text-center text-sm font-medium text-navy shadow-sm ring-1 ring-h2o-100" data-testid="pet-line" key={line}>
          {line}
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-h2o-100 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </div>
      )}
      <button
        type="button"
        className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-h2o-200"
        onClick={() => setLocalAnim({ a: "pet", k: Date.now() })}
        aria-label={`Acariciar a ${pet.name}`}
      >
        <PetAvatar
          species={pet.species}
          color={pet.color}
          equipment={g.equipment}
          level={g.level}
          mood={mood}
          anim={anim}
          animKey={animKey}
          size={size}
          title={`${pet.name}, tu ${sp?.name.toLowerCase() ?? "mascota"}`}
        />
      </button>
    </div>
  );
}
