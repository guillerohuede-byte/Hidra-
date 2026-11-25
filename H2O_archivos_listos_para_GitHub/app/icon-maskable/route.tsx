import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/iconArt";

// Versión con margen de seguridad para íconos recortados (Android)
export function GET() {
  return new ImageResponse(<IconArt size={512} pad={80} />, { width: 512, height: 512 });
}
