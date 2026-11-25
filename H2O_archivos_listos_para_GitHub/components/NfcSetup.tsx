"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Copy, Check, ExternalLink, TriangleAlert, Nfc } from "lucide-react";
import BottleIcon from "./BottleIcon";
import type { Bottle } from "@/lib/types";
import { ml } from "@/lib/format";
import { isPublicOrigin, nfcUrl } from "@/lib/storage";

// Panel "Configurar NFC": muestra el enlace que se graba en el sticker.
// El enlace usa el código fijo de la botella: abrir este panel no genera nada nuevo.

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para navegadores sin acceso al portapapeles (ej. http://IP)
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function NfcSetup({ bottle, onClose }: { bottle: Bottle | null; onClose: () => void }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    setCopied(null);
  }, [bottle]);

  useEffect(() => {
    if (!bottle) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bottle, onClose]);

  if (!bottle || !origin) return null;
  const url = nfcUrl(bottle.id, origin);
  const publicOk = isPublicOrigin(origin);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Configurar NFC"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Nfc size={20} className="text-h2o-500" /> Configurar NFC
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-slate-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Datos de la botella */}
        <div className="flex items-center gap-3 rounded-2xl bg-h2o-50 p-4">
          <BottleIcon color={bottle.color} size={44} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-bold">{bottle.name}</p>
            <p className="text-muted">
              Capacidad {ml(bottle.capacityMl)} · Registra {ml(bottle.defaultAmountMl)}
            </p>
            <p className="text-muted">
              Código: <span className="font-mono font-semibold text-navy" data-testid="nfc-code">{bottle.id}</span>
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-muted">
          Este es el enlace que se graba en el sticker. Al acercar el celular, se abrirá Hidra listo para registrar{" "}
          {ml(bottle.defaultAmountMl)} en esta botella.
        </p>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="break-all font-mono text-sm text-navy" data-testid="nfc-url">
            {url}
          </p>
        </div>

        {!publicOk && (
          <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              <b>Todavía no grabes este enlace.</b> La app está abierta desde una dirección local o sin HTTPS, que el celular
              no puede abrir desde el sticker. Abre esta pantalla desde la dirección publicada (Vercel) y copia el enlace desde ahí.
            </span>
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={async () => setCopied((await copyText(url)) ? "ok" : "fail")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-bold text-white transition hover:bg-navy-hover"
          >
            {copied === "ok" ? <Check size={18} /> : <Copy size={18} />}
            {copied === "ok" ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <Link
            href={`/nfc/${bottle.id}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-h2o-700 ring-1 ring-h2o-200"
          >
            <ExternalLink size={16} /> Probar enlace
          </Link>
        </div>
        {copied === "fail" && (
          <p className="mt-2 text-xs text-red-600">No se pudo copiar automáticamente. Mantén presionado el enlace para copiarlo.</p>
        )}

        <ol className="mt-5 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-muted">
          <li>
            <b className="text-ink">1.</b> Abre la app <b>NFC Tools</b> → <b>Escribir</b> → <b>Agregar un registro</b> → <b>URL / URI</b>.
          </li>
          <li>
            <b className="text-ink">2.</b> Pega el enlace y toca <b>Escribir</b>; acerca el sticker.
          </li>
          <li>
            <b className="text-ink">3.</b> No uses «Bloquear» ni «Proteger con contraseña»: así podrás regrabarlo.
          </li>
        </ol>
      </div>
    </div>
  );
}
