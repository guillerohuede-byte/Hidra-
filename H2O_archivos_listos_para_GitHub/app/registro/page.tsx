"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import AuthLayout, { Field, FormError, SubmitButton } from "@/components/AuthLayout";
import { getBackend, useH2O } from "@/lib/store";
import { friendlyError } from "@/lib/backend/types";
import { safeNext } from "@/lib/safeNext";
import { validateSignup } from "@/lib/validation";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const s = useH2O();
  const [v, setV] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const err = validateSignup(v);
    if (err) return setError(err);
    setBusy(true);
    setError(null);
    try {
      const redirect = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const r = await getBackend().signUp(v.email.trim(), v.password, v.name.trim(), redirect);
      if (r.needsConfirmation) {
        setSent(true);
      } else {
        await s.refresh();
        router.replace(next);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <AuthLayout title="Revisa tu correo" subtitle={`Te enviamos un enlace a ${v.email.trim()}.`}>
        <div className="flex flex-col items-center text-center" data-testid="signup-sent">
          <MailCheck size={44} className="text-h2o-500" />
          <p className="mt-3 text-sm text-muted">
            Ábrelo desde este mismo celular para activar tu cuenta. Si no llega en unos minutos, revisa la carpeta de spam.
          </p>
          <Link href="/login" className="mt-5 font-bold text-h2o-700">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Tus botellas, stickers y tu compañero, en todos tus dispositivos.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="name" label="Nombre" autoComplete="given-name" value={v.name} onChange={set("name")} maxLength={40} placeholder="Ej: Benja" />
        <Field id="email" label="Correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={v.email} onChange={set("email")} placeholder="tu@correo.cl" />
        <Field id="password" label="Contraseña" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} hint="Mínimo 8 caracteres." />
        <Field id="confirm" label="Repite la contraseña" type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} />
        <FormError message={error} />
        <SubmitButton busy={busy}>Crear cuenta</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-block py-2 font-bold text-h2o-700">Inicia sesión</Link>
      </p>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
        Hidra es una herramienta de hábitos; no reemplaza recomendaciones médicas. Pronto: entrar con Google o Apple.
      </p>
    </AuthLayout>
  );
}

export default function RegistroPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
