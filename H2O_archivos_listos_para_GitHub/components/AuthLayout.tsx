"use client";

import Logo from "./Logo";
import PetAvatar from "./pet/PetAvatar";

/** Marco de las pantallas de acceso: limpio, grande y cómodo en iPhone */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-gradient-to-b from-h2o-100 via-h2o-50 to-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-8">
        <Logo />
        <div className="mt-6 flex items-end justify-center gap-1" aria-hidden>
          <PetAvatar species="ajolote" color="base" size={78} mood="feliz" />
          <PetAvatar species="capibara" color="base" size={104} equipment={{ hat: "pescador-splash" }} />
          <PetAvatar species="pinguino" color="base" size={78} mood="emocionado" />
        </div>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const { label, hint, id, ...rest } = props;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        id={id}
        {...rest}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base outline-none transition focus:border-h2o-500 focus:ring-4 focus:ring-h2o-100"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ busy, children }: { busy?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-white shadow-lg shadow-navy/20 transition hover:bg-navy-hover active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? "Un momento…" : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
