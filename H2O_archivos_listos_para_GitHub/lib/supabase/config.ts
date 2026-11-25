// Configuración pública de Supabase. La URL y la clave PUBLICABLE están hechas
// para ir en el navegador (los datos los protege RLS). Nunca pongas aquí la
// clave secreta/service_role. Se pueden sobreescribir con variables de entorno.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kvchfntwgcprgndpomou.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4853eP3nd1auNWPPkQyNXg_uAt40Ehx";

/** Modo de prueba local (sin Supabase). Nunca activo en producción de Vercel. */
export const MOCK_MODE = process.env.NEXT_PUBLIC_H2O_MOCK === "1" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
