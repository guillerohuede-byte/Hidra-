import Logo from "./Logo";

// Encabezado de cada sección. En celular muestra el logo arriba
// (en computador el logo ya está en el menú lateral).
export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="mb-5 md:hidden">
        <Logo compact />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
