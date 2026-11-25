import type { NextConfig } from "next";

// En Vercel (producción y vistas previas) el modo de prueba queda deshabilitado
// en el código compilado, aunque alguien configure NEXT_PUBLIC_H2O_MOCK por error.
const onVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  env: { H2O_MOCK_ALLOWED: onVercel ? "0" : "1" },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
