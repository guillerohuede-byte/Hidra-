"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import type { Bottle } from "@/lib/types";
import { ml } from "@/lib/format";
import { validateBottle, MAX_BOTTLE_NAME, type BottleInput } from "@/lib/storage";

// Formulario para crear o editar una botella (panel desde abajo).
const CAPACITIES = [350, 500, 600, 750, 1000];
const AMOUNTS = [150, 250, 500];
type Pick = number | "otra";

const toInt = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() === "" ? NaN : n;
};

type Props = {
  open: boolean;
  bottle?: Bottle | null; // si viene, estamos editando
  others: Bottle[];
  onClose: () => void;
  onSave: (input: BottleInput) => Promise<string | null>; // devuelve error o null
};

// El formulario se crea de nuevo cada vez que se abre, ya precargado.
export default function BottleForm(props: Props) {
  if (!props.open) return null;
  return <FormBody key={props.bottle?.id ?? "nueva"} {...props} />;
}

const initPick = (value: number | undefined, list: number[], fallback: number): [Pick, string] =>
  value === undefined ? [fallback, ""] : list.includes(value) ? [value, ""] : ["otra", String(value)];

function FormBody({ bottle, others, onClose, onSave }: Props) {
  const [name, setName] = useState(bottle?.name ?? "");
  const [cap, setCap] = useState<Pick>(() => initPick(bottle?.capacityMl, CAPACITIES, 750)[0]);
  const [capCustom, setCapCustom] = useState(() => initPick(bottle?.capacityMl, CAPACITIES, 750)[1]);
  const [amt, setAmt] = useState<Pick>(() => initPick(bottle?.defaultAmountMl, AMOUNTS, 250)[0]);
  const [amtCustom, setAmtCustom] = useState(() => initPick(bottle?.defaultAmountMl, AMOUNTS, 250)[1]);
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Al crear una botella nueva, el cursor parte en el nombre
  useEffect(() => {
    if (!bottle) nameRef.current?.focus();
  }, [bottle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);


  const input: BottleInput = {
    name,
    capacityMl: cap === "otra" ? toInt(capCustom) : cap,
    defaultAmountMl: amt === "otra" ? toInt(amtCustom) : amt,
  };
  const error = validateBottle(input, others, bottle?.id);

  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error || saving) return;
    setSaving(true);
    setSaveError(null);
    const err = await onSave(input);
    setSaving(false);
    if (err) setSaveError(err);
  };

  const chip = (active: boolean) =>
    `rounded-xl border px-1 py-2.5 text-sm font-semibold ${
      active ? "border-h2o-500 bg-h2o-50 text-h2o-700" : "border-slate-200 text-ink"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        noValidate
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={bottle ? "Editar botella" : "Agregar botella"}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{bottle ? "Editar botella" : "Nueva botella"}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-slate-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Nombre */}
        <label htmlFor="bottle-name" className="mb-1.5 block text-sm font-semibold">
          Nombre
        </label>
        <input
          id="bottle-name"
          ref={nameRef}
          value={name}
          maxLength={MAX_BOTTLE_NAME}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Botella de la U"
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-h2o-500"
        />

        {/* Capacidad */}
        <p className="mb-1.5 mt-5 text-sm font-semibold">Capacidad de la botella</p>
        <div className="grid grid-cols-3 gap-2">
          {CAPACITIES.map((c) => (
            <button type="button" key={c} onClick={() => setCap(c)} aria-pressed={cap === c} className={chip(cap === c)}>
              {ml(c)}
            </button>
          ))}
          <button type="button" onClick={() => setCap("otra")} aria-pressed={cap === "otra"} className={chip(cap === "otra")}>
            Otra
          </button>
        </div>
        {cap === "otra" && (
          <div className="mt-2 flex items-center rounded-2xl border border-slate-200 px-4 focus-within:border-h2o-500">
            <input
              aria-label="Capacidad personalizada en ml"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 900"
              value={capCustom}
              onChange={(e) => setCapCustom(e.target.value)}
              className="w-full bg-transparent py-3 text-base outline-none"
            />
            <span className="text-sm text-muted">ml</span>
          </div>
        )}

        {/* Cantidad habitual */}
        <p className="mt-5 text-sm font-semibold">¿Cuánto tomas cada vez?</p>
        <p className="mb-1.5 text-xs text-muted">Es la cantidad que se propondrá al registrar. Puedes cambiarla en cada registro.</p>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button type="button" key={a} onClick={() => setAmt(a)} aria-pressed={amt === a} className={chip(amt === a)}>
              {ml(a)}
            </button>
          ))}
          <button type="button" onClick={() => setAmt("otra")} aria-pressed={amt === "otra"} className={chip(amt === "otra")}>
            Otra
          </button>
        </div>
        {amt === "otra" && (
          <div className="mt-2 flex items-center rounded-2xl border border-slate-200 px-4 focus-within:border-h2o-500">
            <input
              aria-label="Cantidad habitual personalizada en ml"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 330"
              value={amtCustom}
              onChange={(e) => setAmtCustom(e.target.value)}
              className="w-full bg-transparent py-3 text-base outline-none"
            />
            <span className="text-sm text-muted">ml</span>
          </div>
        )}

        {((touched && error) || saveError) && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {saveError ?? error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-white transition hover:bg-navy-hover active:scale-[0.98]"
        >
          <Check size={20} strokeWidth={2.6} /> {bottle ? "Guardar cambios" : "Agregar botella"}
        </button>
      </form>
    </div>
  );
}
