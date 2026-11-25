"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Droplet, Pencil, ShoppingBag, Sparkles, Hand } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PetStage from "@/components/pet/PetStage";
import PetAvatar from "@/components/pet/PetAvatar";
import RegisterSheet from "@/components/RegisterSheet";
import ItemCard from "@/components/ItemCard";
import ItemSheet from "@/components/ItemSheet";
import Toast from "@/components/Toast";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import { useHydration } from "@/lib/useHydration";
import { SPECIES, SPECIES_BY_ID, evolutionFor } from "@/lib/pets/species";
import { EQUIP_SLOTS, ITEMS_BY_ID, SLOT_LABELS, type CatalogItem } from "@/lib/game/catalog";
import { ml } from "@/lib/format";

export default function Companero() {
  const s = useH2O();
  const g = useGame();
  const h = useHydration();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pet = s.data?.pet;
  if (!pet) return null;
  const sp = SPECIES_BY_ID[pet.species];
  const evo = evolutionFor(g.level);
  const wardrobe = g.catalog.filter((i) => g.owned.has(i.id) && i.slot !== "consumable");

  // "Darle agua" = registrar un consumo REAL. No hay puntos por tocar la mascota.
  const giveWater = (amount: number) => {
    h.addEntry(amount, "manual", h.selectedBottle?.id ?? null)
      .then(() => setToast(`${pet.name} tomó contigo: ${ml(amount)}`))
      .catch((e) => setToast(e instanceof Error ? e.message : "No se pudo guardar"));
    window.setTimeout(() => setSheetOpen(false), 350);
  };

  return (
    <>
      <PageHeader title="Mi compañero" subtitle={`${pet.name} · ${sp?.name ?? ""}`} />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-h2o-100 via-h2o-50 to-white px-4 pb-5 pt-4 ring-1 ring-h2o-100">
        <PetStage pct={h.pct} count={h.today.length} size={210} />
        <div className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-h2o-100">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold">Nivel {g.level} · <span className="text-h2o-700">{evo.label}</span></span>
            <span className="text-xs text-muted">{g.xpToNext} XP para el nivel {g.level + 1}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-valuenow={Math.round(g.levelPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de nivel">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all" style={{ width: `${g.levelPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Con los niveles gana brillo: nivel 5 aura, nivel 10 estrella, nivel 20 aura dorada.</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setSheetOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 font-bold text-white active:scale-[0.98]" data-testid="give-water">
            <Droplet size={18} fill="currentColor" /> Darle agua
          </button>
          <button onClick={() => { s.poke("pet"); }} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-bold text-h2o-700 ring-1 ring-h2o-200 active:scale-[0.98]">
            <Hand size={18} /> Acariciar
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">«Darle agua» registra lo que <b>tú</b> tomas: tu compañero bebe contigo.</p>
      </section>

      {/* Personalizar */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Personalizar</h2>
          <button onClick={() => setEditing((v) => !v)} className="-my-2 flex items-center gap-1 py-2 text-sm font-semibold text-h2o-700"><Pencil size={14} /> {editing ? "Listo" : "Editar"}</button>
        </div>
        {editing ? <EditPet onSaved={(m) => { setToast(m); setEditing(false); }} /> : (
          <p className="mt-1 text-sm text-muted">{sp?.personality}</p>
        )}
      </section>

      {/* Armario */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Armario</h2>
          <Link href="/tienda" className="-my-2 flex items-center gap-1 py-2 text-sm font-semibold text-h2o-700"><ShoppingBag size={15} /> Tienda</Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {EQUIP_SLOTS.map((slot) => {
            const it = g.equipment[slot] ? ITEMS_BY_ID[g.equipment[slot]] : null;
            return (
              <span key={slot} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${it ? "bg-h2o-50 text-h2o-800" : "bg-slate-50 text-slate-400"}`}>
                {SLOT_LABELS[slot]}: {it ? it.name : "—"}
              </span>
            );
          })}
        </div>
        {wardrobe.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center text-sm text-muted">
            <Sparkles className="mb-2 text-amber-500" />
            Aún no tienes prendas. Junta Gotitas tomando agua y visita la tienda.
            <Link href="/tienda" className="mt-3 rounded-2xl bg-navy px-5 py-2.5 font-bold text-white">Ir a la tienda</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {wardrobe.map((it) => (
              <ItemCard key={it.id} item={it} species={pet.species} color={pet.color} owned equipped={g.equipment[it.slot] === it.id} price={it.price} onClick={() => setItem(it)} />
            ))}
          </div>
        )}
      </section>

      <RegisterSheet open={sheetOpen} bottle={h.selectedBottle} onClose={() => setSheetOpen(false)} onConfirm={giveWater} />
      <ItemSheet item={item} onClose={() => setItem(null)} onMessage={setToast} />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}

function EditPet({ onSaved }: { onSaved: (msg: string) => void }) {
  const s = useH2O();
  const pet = s.data!.pet!;
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species);
  const [color, setColor] = useState(pet.color);
  const [error, setError] = useState<string | null>(null);
  const sp = SPECIES_BY_ID[species];
  const save = async () => {
    if (!name.trim() || name.trim().length > 20) return setError("El nombre debe tener entre 1 y 20 caracteres.");
    try {
      await s.savePet({ species, color, name: name.trim() });
      onSaved("Cambios guardados");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };
  return (
    <div className="mt-3 space-y-4">
      <label className="block text-sm font-semibold" htmlFor="pet-name">Nombre
        <input id="pet-name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-h2o-500" />
      </label>
      <div>
        <p className="text-sm font-semibold">Color</p>
        <div className="mt-2 flex gap-2">
          {sp.palettes.map((p) => (
            <button key={p.id} onClick={() => setColor(p.id)} aria-pressed={color === p.id} className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold ${color === p.id ? "ring-2 ring-h2o-500" : "ring-1 ring-slate-200"}`}>
              <PetAvatar species={species} color={p.id} size={44} />
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-h2o-700">Cambiar de especie</summary>
        <p className="mt-1 text-xs text-muted">Conservas tu nivel, Gotitas y ropa: la ropa calza en todas las especies.</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {SPECIES.map((x) => (
            <button key={x.id} onClick={() => { setSpecies(x.id); setColor("base"); }} aria-pressed={species === x.id} className={`flex flex-col items-center rounded-2xl p-1 text-[11px] font-semibold ${species === x.id ? "ring-2 ring-h2o-500" : "ring-1 ring-slate-100"}`}>
              <PetAvatar species={x.id} color="base" size={48} />{x.name}
            </button>
          ))}
        </div>
      </details>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      <button onClick={save} className="w-full rounded-2xl bg-navy py-3.5 font-bold text-white">Guardar</button>
    </div>
  );
}
