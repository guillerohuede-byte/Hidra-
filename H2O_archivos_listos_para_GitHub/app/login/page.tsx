"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nfc } from "lucide-react";
import AuthLayout, { Field, FormError, SubmitButton } from "@/components/AuthLayout";
import { getBackend, useH2O } from "@/lib/store";
import { friendlyError } from "@/lib/backend/types";
import { safeNext } from "@/lib/safeNext";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const s = useH2O();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const info = params.get("info");
  const fromSticker = next.startsWith("/nfc/");

  // Si ya hay sesión, seguir directo
  useEffect(() => {
    if (s.status === "ready") router.replace(next);
  }, [s.status, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) return setError("Escribe tu correo y tu contraseña.");
    setBusy(true);
    setError(null);
    try {
      await getBackend().signIn(email.trim(), password);
      await s.refresh();
      router.replace(next);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Hola de nuevo" subtitle="Inicia sesión para seguir con tu racha.">
      {fromSticker && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-h2o-50 px-3 py-2.5 text-sm text-h2o-800" data-testid="login-from-nfc">
          <Nfc size={18} className="mt-0.5 shrink-0" /> Escaneaste un sticker. Inicia sesión y te llevamos de vuelta para confirmar el registro.
        </p>
      )}
      {info && !error && (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800" role="status">{info}</p>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="email" label="Correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" />
        <Field id="password" label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError message={error} />
        <SubmitButton busy={busy}>Iniciar sesión</SubmitButton>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link href={`/recuperar${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-block py-2 font-semibold text-h2o-700">¿Olvidaste tu contraseña?</Link>
        <p className="text-muted">
          ¿No tienes cuenta?{" "}
          <Link href={`/registro${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="inline-block py-2 font-bold text-h2o-700">Créala gratis</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
