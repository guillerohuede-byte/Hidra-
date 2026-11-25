"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout, { Field, FormError, SubmitButton } from "@/components/AuthLayout";
import { getBackend } from "@/lib/store";
import { friendlyError } from "@/lib/backend/types";

export default function ActualizarClavePage() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (p1.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (p1 !== p2) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    setError(null);
    try {
      await getBackend().updatePassword(p1);
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña que no uses en otros sitios.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="p1" label="Contraseña nueva" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} hint="Mínimo 8 caracteres." />
          <Field id="p2" label="Repítela" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
          <FormError message={error} />
          <SubmitButton busy={busy}>Guardar contraseña</SubmitButton>
        </form>
    </AuthLayout>
  );
}
