// Etiqueta visible para cualquier dato que NO es real.
export default function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ${className}`}
    >
      Datos de ejemplo
    </span>
  );
}
