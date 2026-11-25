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
    const msg = "El enlace expiró o ya se usó. Pide uno nuevo.";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
