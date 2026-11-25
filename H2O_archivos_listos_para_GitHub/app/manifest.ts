import type { MetadataRoute } from "next";

// Instalable en Android y en iPhone ("Agregar a pantalla de inicio").
// Sin service worker a propósito: así nunca queda una versión vieja guardada.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hidra — Hidratación con tu compañero",
    short_name: "Hidra",
    description: "Registra el agua que tomas con tu botella y su sticker NFC.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f7ff",
    theme_color: "#1f78ee",
    lang: "es-CL",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
