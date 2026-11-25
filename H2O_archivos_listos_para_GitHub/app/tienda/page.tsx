"use client";

import { useCallback, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ItemCard from "@/components/ItemCard";
import ItemSheet from "@/components/ItemSheet";
import Toast from "@/components/Toast";
import { GotaIcon } from "@/components/GameChips";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import { SLOT_LABELS, type CatalogItem, type Slot } from "@/lib/game/catalog";

const TABS: (Slot | "todo")[] = ["todo", "top", "pants", "jacket", "shoes", "hat", "glasses", "accessory", "costume", "consumable"];

export default function Tienda() {
  const s = useH2O();
  const g = useGame();
  const [tab, setTab] = useState<Slot | "todo">("todo");
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pet = s.data?.pet;
  if (!pet) return null;

  const items = g.catalog
    .filter((i) => tab === "todo" || i.slot === tab)
    .map((i) => ({ ...i, price: g.prices.get(i.id)?.price ?? i.price }))
    .sort((a, b) => Number(!a.purchasable) - Number(!b.purchasable) || a.price - b.price);

  return (
    <>
      <PageHeader
        title="Tienda"
        subtitle="Marcas de mentira, estilo de verdad. Solo con Gotitas (sin dinero real)."
        right={
          <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-h2o-50 px-3 py-2 text-lg font-extrabold text-h2o-800 ring-1 ring-h2o-100" data-testid="shop-balance">
            <GotaIcon size={20} /> {g.gotitas}
          </span>
        }
      />
      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Categorías">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${tab === t ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-slate-200"}`}>
            {t === "todo" ? "Todo" : SLOT_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it) => (
          <ItemCard key={it.id} item={it} species={pet.species} color={pet.color} owned={g.owned.has(it.id)} equipped={g.equipment[it.slot] === it.id} price={it.price} onClick={() => setItem(it)} />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">Todas las marcas son inventadas para Hidra. No hay compras con dinero real.</p>
      <ItemSheet item={item} onClose={() => setItem(null)} onMessage={setToast} />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
