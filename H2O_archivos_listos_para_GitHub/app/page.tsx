"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Plus, Nfc, ChevronRight, Pencil, Droplet, Milk, ListChecks, Target } from "lucide-react";
import Logo from "@/components/Logo";
import RegisterSheet from "@/components/RegisterSheet";
import BottleIcon from "@/components/BottleIcon";
import Toast from "@/components/Toast";
import EntryList from "@/components/EntryList";
import { ml } from "@/lib/format";
import { longDate } from "@/lib/useNow";
import { useHydration, formatPct, progressMessage } from "@/lib/useHydration";

export default function Inicio() {
  const h = useHydration();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const msg = progressMessage(h.pct, h.today.length);
  const bottle = h.selectedBottle;

  const handleConfirm = (amount: number) => {
    // Se guarda al instante, pero el panel se cierra ~0,35 s después:
    // así un segundo toque rápido cae sobre el botón (ya bloqueado) y no
    // sobre lo que hay debajo del panel.
    try {
      h.addEntry(amount, "manual", bottle?.id);
      setToast(`${ml(amount)} registrados`);
    } catch {
      setToast("No se pudo guardar el registro");
    }
    window.setTimeout(() => setSheetOpen(false), 350);
  };

  return (
    <>
      <header className="mb-6 flex items-center justify-between md:hidden">
        <Logo compact />
      </header>

      {/* Saludo + progreso */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="msg-title">
              {h.ready ? msg.title : " "}
            </h1>
            <p className="mt-0.5 text-sm text-muted">{h.todayKey ? longDate(new Date(`${h.todayKey}T12:00:00`)) : " "}</p>

            <p className="mt-5 text-sm text-muted">Hoy has registrado</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-5xl font-extrabold tracking-tight text-navy" data-testid="total">
                {h.ready ? ml(h.total).replace(" ml", "") : "–"}
              </span>
              <span className="text-lg font-medium text-muted">/ {ml(h.goal)}</span>
            </p>
          </div>

          <Link
            href="/metas"
            className="flex items-center gap-3 rounded-2xl bg-h2o-50 px-4 py-3 md:flex-col md:items-start md:gap-1"
          >
            <span className="flex flex-1 items-center justify-between gap-6 text-xs font-semibold text-muted md:w-full">
              Meta diaria <Pencil size={14} />
            </span>
            <span className="flex items-center gap-1.5 text-lg font-bold text-navy" data-testid="goal">
              <Droplet size={16} className="text-h2o-500" fill="currentColor" /> {ml(h.goal)}
            </span>
          </Link>
        </div>

        {/* Barra de progreso: se topa en 100% aunque el total siga sumando */}
        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-3.5 flex-1 overflow-hidden rounded-full bg-h2o-100"
            role="progressbar"
            aria-valuenow={Math.round(Math.min(h.pct, 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              data-testid="bar"
              className={`h-full rounded-full transition-all duration-700 ${
                h.pct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-h2o-400 to-h2o-600"
              }`}
              style={{ width: `${Math.min(h.pct, 100)}%` }}
            />
          </div>
          <span className="min-w-12 text-right font-bold text-navy" data-testid="pct">
            {formatPct(h.pct)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted" data-testid="remaining">
          {h.pct >= 100 ? (
            <>
              Superaste tu meta por <b className="text-navy">{ml(h.total - h.goal)}</b>
            </>
          ) : (
            <>
              Te faltan <b className="text-navy">{ml(h.remaining)}</b> · {msg.text}
            </>
          )}
        </p>

        <button
          onClick={() => setSheetOpen(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-white shadow-lg shadow-navy/20 transition hover:bg-navy-hover active:scale-[0.98]"
        >
          <Plus size={22} strokeWidth={2.6} /> Registrar agua
        </button>
      </section>

      {/* Tarjetas resumen */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Link href="/botellas" className="relative rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-h2o-100">
          <p className="text-[11px] font-semibold text-muted">Botella actual</p>
          {bottle ? (
            <>
              <span className="my-1.5 block">
                <BottleIcon color={bottle.color} size={20} />
              </span>
              <p className="text-sm font-bold leading-tight">{ml(bottle.defaultAmountMl)}</p>
              <p className="truncate text-[11px] text-h2o-600" data-testid="current-bottle">{bottle.name}</p>
            </>
          ) : (
            <>
              <Milk size={20} className="my-1.5 text-slate-300" />
              <p className="text-sm font-bold leading-tight text-slate-400">Ninguna</p>
              <p className="text-[11px] text-h2o-600">Agregar</p>
            </>
          )}
        </Link>
        <Link href="/historial" className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-h2o-100">
          <p className="text-[11px] font-semibold text-muted">Registros hoy</p>
          <ListChecks size={20} className="my-1.5 text-h2o-500" />
          <p className="text-sm font-bold leading-tight" data-testid="count">{h.today.length}</p>
          <p className="text-[11px] text-h2o-600">Ver detalle</p>
        </Link>
        <Link href="/metas" className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-h2o-100">
          <p className="text-[11px] font-semibold text-muted">{h.pct >= 100 ? "Meta" : "Te faltan"}</p>
          <Target size={20} className={`my-1.5 ${h.pct >= 100 ? "text-emerald-500" : "text-h2o-500"}`} />
          <p className="text-sm font-bold leading-tight">{h.pct >= 100 ? "¡Cumplida!" : ml(h.remaining)}</p>
          <p className="text-[11px] text-h2o-600">Ver meta</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 self-start rounded-3xl bg-gradient-to-br from-h2o-500 to-h2o-700 p-5 text-white shadow-sm">
          <span className="rounded-2xl bg-white/15 p-3">
            <Nfc size={26} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Registra con un toque</span>
            <span className="block text-sm text-h2o-100">Pronto: acerca tu celular al sticker de tu botella</span>
          </span>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Hoy</h2>
            <Link href="/historial" className="flex items-center text-sm font-semibold text-h2o-600">
              Ver historial <ChevronRight size={16} />
            </Link>
          </div>
          {h.ready && h.today.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Aún no hay registros hoy.</p>
          ) : (
            <EntryList entries={h.today.slice(0, 4)} />
          )}
          {h.today.length > 4 && (
            <p className="pt-2 text-center text-xs text-muted">y {h.today.length - 4} más en el historial</p>
          )}
        </section>
      </div>

      <RegisterSheet open={sheetOpen} bottle={bottle} onClose={() => setSheetOpen(false)} onConfirm={handleConfirm} />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
