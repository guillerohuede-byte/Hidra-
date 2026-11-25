import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl">💧</p>
      <h1 className="text-xl font-bold">No encontramos esta página</h1>
      <Link href="/" className="rounded-2xl bg-navy px-5 py-3 font-bold text-white">Ir al inicio</Link>
    </div>
  );
}
