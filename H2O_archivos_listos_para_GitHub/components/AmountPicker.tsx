"use client";

import { useEffect, useRef, useState } from "react";
import { ml } from "@/lib/format";
import { MAX_AMOUNT_ML, MIN_AMOUNT_ML } from "@/lib/storage";

// Selector de cantidad compartido por el registro manual y el registro NFC
// (así ambos validan exactamente igual).

const QUICK = [150, 250, 500];
/** Si la cantidad habitual no está entre los atajos, ocupa el primer lugar */
const quickOptions = (habitual?: number) => (habitual && !QUICK.includes(habitual) ? [habitual, 250, 500] : QUICK);
type Choice = number | "otra";

export function useAmountChoice(habitual?: number) {
  const [choice, setChoice] = useState<Choice>(() => habitual ?? 250);
  const [custom, setCustom] = useState("");
  const amount = choice === "otra" ? Number(custom.replace(",", ".")) : choice;
  const valid = Number.isInteger(amount) && amount >= MIN_AMOUNT_ML && amount <= MAX_AMOUNT_ML;
  const customError =
    choice === "otra" && custom !== "" && !valid ? `Ingresa un número entero entre ${MIN_AMOUNT_ML} y ${ml(MAX_AMOUNT_ML)}` : "";
  return { habitual, choice, setChoice, custom, setCustom, amount, valid, customError };
}

export default function AmountPicker({
  state,
  onEnter,
}: {
  state: ReturnType<typeof useAmountChoice>;
  onEnter?: () => void;
}) {
  const { habitual, choice, setChoice, custom, setCustom, customError } = state;
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (choice === "otra") customRef.current?.focus();
  }, [choice]);

  const chip = (active: boolean) =>
    `rounded-2xl border py-3 text-sm font-semibold ${active ? "border-h2o-500 bg-h2o-50 text-h2o-700" : "border-slate-200 text-ink"}`;

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {quickOptions(habitual).map((q) => (
          <button key={q} type="button" onClick={() => setChoice(q)} aria-pressed={choice === q} className={chip(choice === q)}>
            {q}
            <span className="block text-[10px] font-medium text-muted">{q === habitual ? "habitual" : "ml"}</span>
          </button>
        ))}
        <button type="button" onClick={() => setChoice("otra")} aria-pressed={choice === "otra"} className={chip(choice === "otra")}>
          Otra
          <span className="block text-[10px] font-medium text-muted">cantidad</span>
        </button>
      </div>

      {choice === "otra" && (
        <div className="mt-4">
          <label htmlFor="custom-ml" className="mb-1.5 block text-sm font-medium text-muted">
            Cantidad personalizada
          </label>
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-h2o-500">
            <input
              id="custom-ml"
              ref={customRef}
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT_ML}
              max={MAX_AMOUNT_ML}
              step={1}
              placeholder="Ej: 330"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
              className="w-full bg-transparent py-3 text-base font-semibold outline-none"
            />
            <span className="text-sm font-medium text-muted">ml</span>
          </div>
          {customError && <p className="mt-1.5 text-xs font-medium text-red-600">{customError}</p>}
        </div>
      )}
    </>
  );
}
