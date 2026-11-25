// Configuración pública de Supabase. La URL y la clave PUBLICABLE están hechas
// para ir en el navegador (los datos los protege RLS). Nunca pongas aquí la
// clave secreta/service_role. Se pueden sobreescribir con variables de entorno.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kvchfntwgcprgndpomou.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4853eP3nd1auNWPPkQyNXg_uAt40Ehx";

/** Modo de prueba local (sin Supabase). Imposible en Vercel: ver next.config.ts. */
export const MOCK_MODE = process.env.NEXT_PUBLIC_H2O_MOCK === "1" && process.env.H2O_MOCK_ALLOWED === "1";
