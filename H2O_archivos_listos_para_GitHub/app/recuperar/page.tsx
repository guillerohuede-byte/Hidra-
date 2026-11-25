"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import AuthLayout, { Field, FormError, SubmitButton } from "@/components/AuthLayout";
import { getBackend } from "@/lib/store";
import { friendlyError } from "@/lib/backend/types";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Revisa tu correo.");
    setBusy(true);
    setError(null);
    try {
      await getBackend().resetPassword(email.trim(), `${window.location.origin}/auth/confirm?next=/actualizar-clave`);
      setSent(true); // mismo mensaje exista o no la cuenta (no revela quién está registrado)
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Recupera tu acceso" subtitle={sent ? undefined : "Te enviaremos un enlace para crear una contraseña nueva."}>
      {sent ? (
        <div className="flex flex-col items-center text-center" data-testid="reset-sent">
          <MailCheck size={44} className="text-h2o-500" />
          <p className="mt-3 text-sm text-muted">Si hay una cuenta con <b>{email.trim()}</b>, te llegará un correo con el enlace. Ábrelo en este celular.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="email" label="Correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" />
          <FormError message={error} />
          <SubmitButton busy={busy}>Enviar enlace</SubmitButton>
        </form>
      )}
      <p className="mt-4 text-center text-sm"><Link href="/login" className="font-bold text-h2o-700">Volver a iniciar sesión</Link></p>
    </AuthLayout>
  );
}
