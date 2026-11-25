"use client";

// Celebración de premios: metas, rachas, niveles, misiones.
// La recompensa diaria y los escudos se avisan con una franja discreta.
import { useEffect, useMemo } from "react";
import { Shield, Sparkles, X } from "lucide-react";
import { useH2O } from "@/lib/store";
import { GotaIcon } from "./GameChips";
import PetAvatar from "./pet/PetAvatar";

const BIG = new Set(["meta", "racha", "nivel", "mision", "bienvenida"]);
const COLORS = ["#38bdf8", "#facc15", "#f472b6", "#34d399", "#a78bfa"];

export default function Celebration() {
  const s = useH2O();
  const list = s.celebration;
  const big = list.filter((r) => BIG.has(r.kind));
  const small = list.filter((r) => !BIG.has(r.kind));
  const reduce = !!s.data?.profile.reduceMotion;

  // Franja pequeña: se va sola
  useEffect(() => {
    if (big.length || !small.length) return;
    const t = window.setTimeout(s.dismissCelebration, 3200);
    return () => window.clearTimeout(t);
  }, [big.length, small.length, s.dismissCelebration]);

  const confetti = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.12, color: COLORS[i % COLORS.length] })),
    [],
  );
  if (!list.length) return null;

  const gotitas = list.reduce((a, r) => a + r.gotitas, 0);
  const xp = list.reduce((a, r) => a + r.xp, 0);
  const shields = list.reduce((a, r) => a + Math.max(r.shields, 0), 0);
  const pet = s.data?.pet;

  if (!big.length)
    return (
      <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }} role="status" aria-live="polite">
        <button onClick={s.dismissCelebration} className="pop-in flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-lg ring-1 ring-h2o-100" data-testid="reward-toast">
          {small.some((r) => r.kind === "escudo") ? <Shield size={16} className="text-sky-600" /> : <GotaIcon />}
          {small.map((r) => r.label).join(" · ")}
          {gotitas > 0 && <span className="text-amber-600">+{gotitas}</span>}
        </button>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-5" role="dialog" aria-modal="true" aria-labelledby="celebra-titulo" onClick={s.dismissCelebration}>
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map((c, i) => (
            <span key={i} className="confetti-bit" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, background: c.color }} />
          ))}
        </div>
      )}
      <div className="pop-in relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="celebration">
        <button onClick={s.dismissCelebration} className="absolute right-3 top-3 rounded-full p-2 text-muted hover:bg-slate-100" aria-label="Cerrar">
          <X size={18} />
        </button>
        {pet && (
          <div className="flex justify-center">
            <PetAvatar species={pet.species} color={pet.color} equipment={s.data?.equipment} level={s.data?.summary.level} size={120} anim="celebrate" mood="feliz" />
          </div>
        )}
        <h2 id="celebra-titulo" className="mt-2 flex items-center justify-center gap-1.5 text-xl font-extrabold">
          <Sparkles size={20} className="text-amber-500" /> {big[0].label}
        </h2>
        {list.length > 1 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {list.slice(big.length > 1 ? 1 : 0).filter((r) => r !== big[0]).map((r) => (
              <li key={r.key}>{r.label}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold">
          {gotitas > 0 && <span className="flex items-center gap-1 rounded-full bg-h2o-50 px-3 py-1 text-h2o-800"><GotaIcon /> +{gotitas}</span>}
          {xp > 0 && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">+{xp} XP</span>}
          {shields > 0 && <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sky-700"><Shield size={14} /> +{shields}</span>}
        </div>
        <button onClick={s.dismissCelebration} className="mt-5 w-full rounded-2xl bg-navy py-3.5 font-bold text-white" autoFocus>
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
