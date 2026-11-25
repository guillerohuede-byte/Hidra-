import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { MOCK_MODE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

// Rutas que se pueden ver sin sesión
const PUBLIC = [/^\/login/, /^\/registro/, /^\/recuperar/, /^\/auth\//, /^\/sin-conexion/];

/** Refresca la sesión en cada visita y manda al login si no hay sesión (recordando a dónde ibas). */
export async function updateSession(request: NextRequest) {
  if (MOCK_MODE) return NextResponse.next({ request });
  // Si Supabase devolvió el código de confirmación a la portada (falta la URL en la lista permitida), recuperarlo
  if (request.nextUrl.pathname === "/" && (request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims valida el token (no confiar solo en la cookie)
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error && !/session|missing|expired|invalid/i.test(error.message)) return response; // falla de red: decide la app
    userId = (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return response; // sin red hacia Supabase: la app decide con la sesión guardada (evita rebotes al login)
  }

  const path = request.nextUrl.pathname;
  if (!userId && !PUBLIC.some((r) => r.test(path))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}
