"use client";

// Tarjeta de un artículo: se ve puesto sobre TU mascota (vista previa real).
import { Check, Lock, Shield } from "lucide-react";
import PetAvatar from "./pet/PetAvatar";
import { BRANDS, RARITY, type CatalogItem } from "@/lib/game/catalog";
import { GotaIcon } from "./GameChips";

export default function ItemCard({
  item, species, color, owned, equipped, price, onClick,
}: {
  item: CatalogItem; species: string; color: string; owned: boolean; equipped: boolean; price: number; onClick: () => void;
}) {
  const r = RARITY[item.rarity];
  const brand = BRANDS[item.brand];
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-2xl bg-white p-2 pb-2.5 text-left shadow-sm ring-1 transition active:scale-[0.98] ${equipped ? "ring-2 ring-h2o-500" : "ring-slate-100"}`}
      data-testid={`item-${item.id}`}
      aria-label={`${item.name}, ${r.label}${owned ? ", lo tienes" : item.purchasable ? `, ${price} Gotitas` : ", premio"}`}
    >
      <span className="absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: r.color }}>{r.label}</span>
      {equipped && <span className="absolute right-2 top-2 rounded-full bg-h2o-500 p-0.5 text-white"><Check size={12} strokeWidth={3} /></span>}
      <span className="mt-3 flex h-[92px] items-center justify-center">
        {item.slot === "consumable" ? (
          <Shield size={58} className="text-sky-500" fill="#e0f2fe" />
        ) : (
          <PetAvatar species={species} color={color} equipment={{ [item.slot]: item.id }} size={80} />
        )}
      </span>
      <span className="mt-1 w-full truncate text-center text-[13px] font-bold leading-tight">{item.name}</span>
      <span className="w-full truncate text-center text-[10.5px] text-muted">{brand.name}</span>
      <span className="mt-1.5 flex items-center gap-1 text-xs font-bold">
        {owned && item.slot !== "consumable" ? (
          <span className="text-emerald-600">Tuyo</span>
        ) : item.purchasable ? (
          <><GotaIcon size={14} /> {price}</>
        ) : (
          <span className="flex items-center gap-1 text-violet-700"><Lock size={12} /> {item.unlock}</span>
        )}
      </span>
    </button>
  );
}
