"use client";

import { useId } from "react";

// Logo de Hidra: la gota con ola de siempre, ahora con relleno degradado,
// y el nombre en minúsculas con H mayúscula. Minimalista y azul.
export function HidraMark({ size = 30 }: { size?: number }) {
  // id único: si hay varios logos (uno oculto en el menú lateral), cada uno tiene su degradado
  const id = `hidra-gota-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="4" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fb0ff" />
          <stop offset="1" stopColor="#1f63d8" />
        </linearGradient>
      </defs>
      <path d="M16 2.8C16 2.8 6.2 13.4 6.2 19.9a9.8 9.8 0 0 0 19.6 0C25.8 13.4 16 2.8 16 2.8Z" fill={`url(#${id})`} />
      <path d="M9.6 21.2c2.2-1.6 4.2-1.6 6.4 0s4.2 1.6 6.4 0" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M11.3 15.2c.6-1.6 1.6-3 2.6-4.2" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label="Hidra">
      <HidraMark size={compact ? 26 : 30} />
      <span className={`${compact ? "text-xl" : "text-2xl"} font-extrabold tracking-tight text-navy`} aria-hidden>
        Hidra
      </span>
    </div>
  );
}
