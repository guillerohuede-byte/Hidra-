"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, History, PawPrint, Sparkles, UserRound, ShoppingBag, Milk, Target, WifiOff, RefreshCw } from "lucide-react";
import Logo from "./Logo";
import Celebration from "./Celebration";
import ImportBanner from "./ImportBanner";
import { useH2O } from "@/lib/store";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/companero", label: "Compañero", icon: PawPrint },
  { href: "/misiones", label: "Misiones", icon: Sparkles },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];
const DESKTOP_EXTRA = [
  { href: "/tienda", label: "Tienda", icon: ShoppingBag },
  { href: "/botellas", label: "Mis botellas", icon: Milk },
  { href: "/metas", label: "Metas", icon: Target },
];

// Pantallas que se ven sin sesión
const PUBLIC = ["/login", "/registro", "/recuperar", "/auth", "/sin-conexion"];
export const isPublicPath = (p: string) => PUBLIC.some((x) => p === x || p.startsWith(`${x}/`));

function isActive(pathname: string, href: string) {
  const p = pathname.replace(/\/$/, "") || "/";
  return href === "/" ? p === "/" : p.startsWith(href);
}

export function Splash({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true" role="status">
      <svg width={56} height={56} viewBox="0 0 24 24" className="animate-bounce" aria-hidden>
        <path d="M12 2.5C9 7 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5Z" fill="#38bdf8" />
      </svg>
      <p className="text-sm font-medium text-muted">{text}</p>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const s = useH2O();
  const pub = isPublicPath(pathname);
  const needsOnboarding = s.status === "ready" && !!s.data && !s.data.profile.onboarded;

  // Reducir movimiento elegido en el perfil
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!s.data?.profile.reduceMotion);
  }, [s.data?.profile.reduceMotion]);

  // Sin sesión → login, recordando a dónde iba (ej. el link del sticker)
  useEffect(() => {
    if (s.status === "signed-out" && !pub) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [s.status, pub, router]);

  // Cuenta nueva → onboarding (guardando el destino)
  useEffect(() => {
    if (needsOnboarding && !pathname.startsWith("/bienvenida") && !pub) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(next === "/" ? "/bienvenida" : `/bienvenida?next=${encodeURIComponent(next)}`);
    }
  }, [needsOnboarding, pathname, pub, router]);

  if (pub) return <>{children}</>;

  if (s.status === "loading" || s.status === "signed-out") return <Splash />;
  if (s.status === "error" && !s.data)
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <WifiOff size={40} className="text-h2o-400" />
        <h1 className="text-xl font-bold">No pudimos cargar tus datos</h1>
        <p className="text-sm text-muted">{s.error}</p>
        <button onClick={() => void s.refresh()} className="flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 font-bold text-white">
          <RefreshCw size={18} /> Reintentar
        </button>
      </div>
    );
  if (needsOnboarding && !pathname.startsWith("/bienvenida")) return <Splash />;

  const offline = !s.online && (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900" role="status" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
      <WifiOff size={14} /> Sin conexión: lo que registres podría no guardarse hasta que vuelva internet.
    </div>
  );

  // Sticker y onboarding: pantalla limpia, sin menús
  if (pathname.startsWith("/nfc") || pathname.startsWith("/bienvenida") || pathname.startsWith("/actualizar-clave"))
    return (
      <>
        {offline}
        {children}
        <Celebration />
      </>
    );

  return (
    <div className="min-h-dvh md:flex">
      {/* Menú lateral — solo computador */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:gap-8 md:border-r md:border-h2o-100 md:bg-white md:px-5 md:py-8">
        <Logo />
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {[...NAV_ITEMS, ...DESKTOP_EXTRA].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                  active ? "bg-h2o-50 text-h2o-600" : "text-muted hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-muted">
          Hidra es una herramienta de seguimiento de hábitos. No reemplaza recomendaciones médicas.
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        {offline}
        {/* Contenido */}
        <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6 md:max-w-3xl md:px-10 md:pb-12 md:pt-10" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
          <ImportBanner />
          {children}
        </main>
      </div>

      {/* Barra inferior — solo celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-h2o-100 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Principal"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${active ? "text-h2o-600" : "text-slate-400"}`}
                >
                  <span className={`rounded-full px-3.5 py-1 transition ${active ? "bg-h2o-50" : ""}`}>
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Celebration />
    </div>
  );
}
