"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Check } from "lucide-react";
import BottleIcon from "./BottleIcon";
import AmountPicker, { useAmountChoice } from "./AmountPicker";
import type { Bottle } from "@/lib/types";
import { ml } from "@/lib/format";

// Panel para registrar agua: se elige la cantidad y NADA se guarda
// hasta presionar "Registrar". Si hay una botella en uso, parte con su
// cantidad habitual ya seleccionada.

type Props = {
  open: boolean;
  bottle?: Bottle | null;
  onClose: () => void;
  onConfirm: (amountMl: number) => void;
};

// El contenido se crea de nuevo cada vez que se abre: así parte limpio y
// con la cantidad habitual correcta desde el primer instante.
export default function RegisterSheet(props: Props) {
  if (!props.open) return null;
  return <SheetBody {...props} />;
}

function SheetBody({ bottle, onClose, onConfirm }: Props) {
  const pick = useAmountChoice(bottle?.defaultAmountMl);
  const { amount, valid } = pick;
  const [busy, setBusy] = useState(false);
  const lock = useRef(false); // evita doble registro por toques rápidos

  // Cerrar con Escape (computador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirm = () => {
    if (!valid || lock.current) return;
    lock.current = true;
    setBusy(true);
    onConfirm(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar agua"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Registrar agua</h2>
          <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-slate-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Botella en uso */}
        {bottle ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-h2o-50 px-4 py-3" data-testid="sheet-bottle">
            <BottleIcon color={bottle.color} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{bottle.name}</span>
              <span className="block text-xs text-muted">Habitual: {ml(bottle.defaultAmountMl)}</span>
            </span>
            <Link href="/botellas" onClick={onClose} className="text-sm font-semibold text-h2o-600">
              Cambiar
            </Link>
          </div>
        ) : (
          <p className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-muted">
            Sin botella seleccionada.{" "}
            <Link href="/botellas" onClick={onClose} className="font-semibold text-h2o-600">
              Agrega una
            </Link>{" "}
            para que la cantidad habitual aparezca sola.
          </p>
        )}

        <p className="mb-2 text-sm font-medium text-muted">¿Cuánto tomaste?</p>
        <AmountPicker state={pick} onEnter={confirm} />

        <button
          onClick={confirm}
          disabled={!valid || busy}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-white transition hover:bg-navy-hover active:scale-[0.98] disabled:cursor-not-allowed ${busy ? "disabled:bg-emerald-600" : "disabled:bg-navy/40"}`}
        >
          <Check size={20} strokeWidth={2.6} />
          {busy ? "¡Registrado!" : valid ? `Registrar ${ml(amount)}` : "Registrar"}
        </button>
      </div>
    </div>
  );
}
