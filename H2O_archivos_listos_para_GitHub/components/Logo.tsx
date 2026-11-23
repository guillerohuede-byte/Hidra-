// Logo según los mockups del Miro: gota de contorno con una ola + "H2O".
// Es una recreación provisoria; se reemplaza por el archivo oficial cuando exista.
export default function Logo({ compact = false }: { compact?: boolean }) {
  const s = compact ? 26 : 30;
  return (
    <div className="flex items-center gap-2">
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 3C16 3 6.5 13.5 6.5 19.8a9.5 9.5 0 0 0 19 0C25.5 13.5 16 3 16 3Z"
          stroke="#2f80ed"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 21.5c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0"
          stroke="#2f80ed"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className={`${compact ? "text-xl" : "text-2xl"} font-extrabold tracking-tight text-navy`}>
        H<sub className="text-[0.6em] font-bold">2</sub>O
      </span>
    </div>
  );
}
