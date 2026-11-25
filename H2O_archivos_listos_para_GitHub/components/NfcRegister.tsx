"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Nfc, Home, RotateCcw } from "lucide-react";
import Logo from "./Logo";
import BottleIcon from "./BottleIcon";
import AmountPicker, { useAmountChoice } from "./AmountPicker";
import type { Bottle } from "@/lib/types";
import { ml } from "@/lib/format";
import { useHydration, formatPct } from "@/lib/useHydration";
import { isValidBottleId } from "@/lib/storage";
import { useH2O } from "@/lib/store";
import type { Reward } from "@/lib/backend/types";
import PetAvatar from "./pet/PetAvatar";

// Pantalla que se abre al escanear el sticker.
// Flujo: Escanear → Confirmar → Listo. NUNCA registra sola.

type Status =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "missing"; deleted: boolean }
  | { kind: "ready"; bottle: Bottle }
  | { kind: "done"; bottle: Bottle | null; amountMl: number; again: boolean; rewards: Reward[] };

// Recuerda el último registro NFC de esta pestaña, para que RECARGAR la
// página no muestre de nuevo el botón (un escaneo nuevo sí lo muestra).
const LAST_KEY = "h2o:nfc:last";
type Last = { bottleId: string; entryId: string; amountMl: number; at: number };

function readLast(): Last | null {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_KEY) || "null");
  } catch {
    return null;
  }
}

function isReload() {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

export default function NfcRegister({ code }: { code: string }) {
  const h = useHydration();
  const store = useH2O();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const decided = useRef(false); // decidir una sola vez por escaneo (los refrescos no cambian la pantalla)

  useEffect(() => {
    if (!isValidBottleId(code)) return setStatus({ kind: "invalid" });
    if (!h.ready || decided.current) return;
    decided.current = true;
    // Las botellas vienen de la CUENTA: funciona igual en Safari y en la app instalada
    const bottle = h.allBottles.find((b) => b.id === code);
    if (!bottle || bottle.deletedAt) return setStatus({ kind: "missing", deleted: !!bottle?.deletedAt });
    const last = readLast();
    // Recarga justo después de registrar (y el registro sigue existiendo) → no ofrecer repetirlo
    const justDone = last && last.bottleId === code && Date.now() - last.at < 30 * 60_000;
    if (isReload() && justDone && h.entries.some((e) => e.id === last.entryId)) {
      return setStatus({ kind: "done", bottle, amountMl: last.amountMl, again: true, rewards: [] });
    }
    setStatus({ kind: "ready", bottle });
  }, [code, h.ready, h.allBottles, h.entries]);

  const pet = store.data?.pet;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md select-none flex-col px-5 pb-8 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" aria-label="Ir al inicio">
          <Logo compact />
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-h2o-50 px-3 py-1 text-xs font-semibold text-h2o-700">
          <Nfc size={14} /> Sticker NFC
        </span>
      </header>

      {status.kind === "loading" && <div className="flex-1" aria-busy="true" />}

      {status.kind === "invalid" && (
        <ErrorCard
          title="Este enlace no es válido"
          text={`El código «${code.slice(0, 20)}» no corresponde a una botella de Hidra. Revisa que el sticker tenga el enlace completo, copiado desde "Configurar NFC".`}
        />
      )}

      {status.kind === "missing" && (
        <ErrorCard
          title={status.deleted ? "Esta botella fue eliminada" : "No encontramos esta botella"}
          text={
            status.deleted
              ? "El sticker apunta a una botella que eliminaste. No se registró nada. Puedes crear una botella nueva y grabar su enlace en el sticker."
              : `Este sticker no está vinculado a tu cuenta${store.data?.profile.email ? ` (${store.data.profile.email})` : ""}. Puede ser de otra persona, o de una botella que creaste antes de tener cuenta: si es así, impórtala desde Perfil. No se registró nada.`
          }
        />
      )}

      {status.kind === "ready" && (
        <Confirm
          bottle={status.bottle}
          todayMl={h.total}
          goal={h.goal}
          onDone={(amountMl, entryId, rewards) => {
            try {
              sessionStorage.setItem(LAST_KEY, JSON.stringify({ bottleId: status.bottle.id, entryId, amountMl, at: Date.now() }));
            } catch {
              /* sin sessionStorage: igual funciona */
            }
            setStatus({ kind: "done", bottle: status.bottle, amountMl, again: false, rewards });
          }}
        />
      )}

      {status.kind === "done" && (
        <Done
          amountMl={status.amountMl}
          bottle={status.bottle}
          total={h.total}
          goal={h.goal}
          pct={h.pct}
          fromReload={status.again}
          rewards={status.rewards}
          pet={pet ? { ...pet, equipment: store.data?.equipment ?? {}, level: store.data?.summary.level ?? 1 } : null}
          onAnother={() => status.bottle && setStatus({ kind: "ready", bottle: status.bottle })}
        />
      )}
    </div>
  );
}

function Confirm({
  bottle,
  todayMl,
  goal,
  onDone,
}: {
  bottle: Bottle;
  todayMl: number;
  goal: number;
  onDone: (amountMl: number, entryId: string, rewards: Reward[]) => void;
}) {
  const h = useHydration();
  const pick = useAmountChoice(bottle.defaultAmountMl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false); // un solo registro aunque se toque dos veces

  // Una clave por escaneo: si la red falla y se reintenta, el servidor no duplica
  const clientKey = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const confirm = async () => {
    if (!pick.valid || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      // Misma función que el registro manual, con origen "nfc" y la botella
      const { entry, rewards } = await h.addEntry(pick.amount, "nfc", bottle.id, clientKey.current);
      onDone(pick.amount, entry.id, rewards);
    } catch (e) {
      lock.current = false;
      setBusy(false);
      setError(e instanceof Error ? e.message : "No se pudo guardar el registro");
    }
  };

  return (
    <main className="flex flex-1 flex-col">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
        <div className="flex items-center gap-4">
          <BottleIcon color={bottle.color} size={60} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-h2o-600">Botella detectada</p>
            <h1 className="truncate text-2xl font-bold tracking-tight" data-testid="nfc-bottle">
              {bottle.name}
            </h1>
            <p className="text-sm text-muted">
              Habitual: <b className="text-navy">{ml(bottle.defaultAmountMl)}</b> · Capacidad {ml(bottle.capacityMl)}
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-h2o-50 px-4 py-2.5 text-sm text-h2o-800">
          Hoy llevas <b>{ml(todayMl)}</b> de {ml(goal)}
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-h2o-100">
        <p className="mb-2 text-sm font-medium text-muted">¿Cuánto tomaste?</p>
        <AmountPicker state={pick} onEnter={confirm} />
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </section>

      <div className="mt-auto pt-6">
        <button
          onClick={confirm}
          disabled={!pick.valid || busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg shadow-navy/20 transition hover:bg-navy-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-navy/40"
        >
          <Check size={22} strokeWidth={2.8} />
          {pick.valid ? `Registrar ${ml(pick.amount)}` : "Registrar"}
        </button>
        <Link href="/" className="mt-3 block py-2 text-center text-sm font-semibold text-muted">
          Cancelar
        </Link>
      </div>
    </main>
  );
}

function Done({
  amountMl,
  bottle,
  total,
  goal,
  pct,
  fromReload,
  onAnother,
  rewards,
  pet,
}: {
  amountMl: number;
  bottle: Bottle | null;
  total: number;
  goal: number;
  pct: number;
  fromReload: boolean;
  onAnother: () => void;
  rewards: Reward[];
  pet: { species: string; name: string; color: string; equipment: Record<string, string>; level: number } | null;
}) {
  const gotitas = rewards.reduce((a, r) => a + r.gotitas, 0);
  const xp = rewards.reduce((a, r) => a + r.xp, 0);
  // Los botones se activan tras un instante: un doble toque sobre "Registrar"
  // no debe caer en ellos.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="flex flex-1 flex-col" role="status" aria-live="polite">
      <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-h2o-100">
        {pet ? (
          <PetAvatar species={pet.species} color={pet.color} equipment={pet.equipment} level={pet.level} size={130}
            anim={fromReload ? null : pct >= 100 ? "celebrate" : "drink"} mood="feliz" title={pet.name} />
        ) : (
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check size={32} strokeWidth={3} />
            </span>
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight" data-testid="nfc-done">
          {fromReload ? "Ya registraste" : "¡Listo!"} {ml(amountMl)}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {fromReload ? "Este consumo ya quedó guardado; recargar no lo repite." : `Registrados con ${bottle?.name ?? "tu botella"}`}
        </p>
        {(gotitas > 0 || xp > 0) && (
          <p className="pop-in mt-3 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700" data-testid="nfc-reward">
            +{gotitas} Gotitas · +{xp} XP
          </p>
        )}

        <div className="mt-6 w-full">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted">Hoy</span>
            <span>
              <b className="text-navy" data-testid="nfc-total">
                {ml(total)}
              </b>{" "}
              <span className="text-muted">/ {ml(goal)}</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-h2o-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-h2o-400 to-h2o-600"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs font-semibold text-navy">{formatPct(pct)}</p>
        </div>
      </section>

      <div className={`mt-auto space-y-3 pt-6 ${armed ? "" : "pointer-events-none opacity-60"}`}>
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-white transition hover:bg-navy-hover"
        >
          <Home size={20} /> Ir al inicio
        </Link>
        {bottle && (
          <button
            onClick={onAnother}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-h2o-700 ring-1 ring-h2o-200"
          >
            <RotateCcw size={16} /> Registrar otro consumo
          </button>
        )}
      </div>
    </main>
  );
}

function ErrorCard({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-h2o-100">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CircleAlert size={34} />
        </span>
        <h1 className="text-xl font-bold" data-testid="nfc-error">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      </section>
      <div className="mt-auto space-y-3 pt-6">
        <Link
          href="/botellas"
          className="flex w-full items-center justify-center rounded-2xl bg-navy py-4 font-bold text-white transition hover:bg-navy-hover"
        >
          Ir a Mis botellas
        </Link>
        <Link href="/" className="block py-2 text-center text-sm font-semibold text-muted">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
