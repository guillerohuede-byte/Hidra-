"use client";

import Link from "next/link";
import { Flame, Shield } from "lucide-react";
import { useGame } from "@/lib/useGame";
import { useH2O } from "@/lib/store";

/** Gotita (moneda del juego) */
export function GotaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5C9 7 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5Z" fill="#38bdf8" stroke="#0369a1" strokeWidth={1.4} />
      <path d="M9 14.5a3 3 0 0 0 2.6 3" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function GameChips() {
  const s = useH2O();
  const g = useGame();
  if (s.status !== "ready") return <span className="h-8" />;
  return (
    <div className="flex items-center gap-1.5">
      <Link href="/misiones" className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1.5 text-sm font-bold text-orange-700 ring-1 ring-orange-100" aria-label={`Racha: ${g.streak} días`} data-testid="chip-streak">
        <Flame size={16} className={g.activeToday ? "text-orange-500" : "text-orange-300"} fill={g.activeToday ? "currentColor" : "none"} />
        {g.streak}
      </Link>
      {g.shields > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1.5 text-sm font-bold text-sky-700 ring-1 ring-sky-100" aria-label={`${g.shields} Escudos de Gota`}>
          <Shield size={15} /> {g.shields}
        </span>
      )}
      <Link href="/tienda" className="flex items-center gap-1 rounded-full bg-h2o-50 px-2.5 py-1.5 text-sm font-bold text-h2o-800 ring-1 ring-h2o-100" aria-label={`${g.gotitas} Gotitas`} data-testid="chip-gotitas">
        <GotaIcon /> {g.gotitas}
      </Link>
    </div>
  );
}
