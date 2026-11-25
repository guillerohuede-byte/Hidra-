/** Solo destinos internos (evita redirecciones a otros sitios) */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/^\/(login|registro|recuperar|auth)(\/|\?|$)/.test(next)) return fallback;
  return next;
}
