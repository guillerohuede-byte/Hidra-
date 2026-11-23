"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Milk, Target } from "lucide-react";
import Logo from "./Logo";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/botellas", label: "Mis botellas", icon: Milk },
  { href: "/metas", label: "Metas", icon: Target },
];

function isActive(pathname: string, href: string) {
  const p = pathname.replace(/\/$/, "") || "/";
  return href === "/" ? p === "/" : p.startsWith(href);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pantalla del sticker: sin menús, solo confirmar
  if (pathname.startsWith("/nfc")) return <>{children}</>;

  return (
    <div className="min-h-dvh md:flex">
      {/* Menú lateral — solo computador */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:gap-8 md:border-r md:border-h2o-100 md:bg-white md:px-5 md:py-8 md:sticky md:top-0 md:h-dvh">
        <Logo />
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
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
          H2O es una herramienta de seguimiento de hábitos. No reemplaza recomendaciones médicas.
        </p>
      </aside>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6 md:max-w-3xl md:px-10 md:pb-12 md:pt-10">
        {children}
      </main>

      {/* Barra inferior — solo celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-h2o-100 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                    active ? "text-h2o-600" : "text-slate-400"
                  }`}
                >
                  <span className={`rounded-full px-4 py-1 transition ${active ? "bg-h2o-50" : ""}`}>
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
