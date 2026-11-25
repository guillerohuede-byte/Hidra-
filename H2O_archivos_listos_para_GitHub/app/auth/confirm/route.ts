// Enlace de los correos de Supabase (confirmar cuenta / recuperar contraseña).
// Crea la sesión en el servidor y redirige a un destino interno seguro.
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const sb = await supabaseServer();

  let error: string | null = null;
  if (code) {
    const r = await sb.auth.exchangeCodeForSession(code);
    error = r.error?.message ?? null;
  } else if (tokenHash && type) {
    const r = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    error = r.error?.message ?? null;
  } else {
    error = "Enlace incompleto";
  }

  if (error) {
    const recovery = type === "recovery" || next === "/actualizar-clave";
    // En confirmación de cuenta, Supabase ya validó el correo antes de llegar aquí; si falla crear la sesión
    // (enlace abierto en otro navegador, p. ej. Safari vs. app instalada), basta con iniciar sesión.
    const msg = recovery
      ? "El enlace expiró o se abrió en otro navegador. Pide uno nuevo desde este mismo navegador."
      : "Tu correo quedó confirmado. Inicia sesión con tu contraseña.";
    const dest = new URL(recovery ? "/recuperar" : "/login", url.origin);
    if (!recovery) {
      dest.searchParams.set("info", msg);
      if (next !== "/") dest.searchParams.set("next", next);
    } else dest.searchParams.set("error", msg);
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
