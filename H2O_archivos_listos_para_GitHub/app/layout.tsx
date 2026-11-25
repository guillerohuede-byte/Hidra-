import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { H2OProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: { default: "Hidra — Tu hidratación, simple", template: "%s · Hidra" },
  description: "Registra tu consumo de agua con tu botella de siempre y cuida a tu compañero.",
  applicationName: "Hidra",
  appleWebApp: { capable: true, title: "Hidra", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f78ee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL">
      <body className="antialiased">
        <H2OProvider>
          <AppShell>{children}</AppShell>
        </H2OProvider>
      </body>
    </html>
  );
}
