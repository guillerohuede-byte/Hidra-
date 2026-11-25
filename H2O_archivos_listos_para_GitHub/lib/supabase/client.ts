"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente de Supabase para el navegador (sesión en cookies, compartida con el servidor) */
export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
