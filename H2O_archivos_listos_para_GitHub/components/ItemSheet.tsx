"use client";

// Detalle de un artículo: vista previa sobre tu mascota (con lo que ya lleva),
// comprar (con confirmación) y poner/quitar.
import { useRef, useState } from "react";
import { X, Shield } from "lucide-react";
import PetAvatar from "./pet/PetAvatar";
import { GotaIcon } from "./GameChips";
import { BRANDS, RARITY, SLOT_LABELS, MAX_SHIELDS, type CatalogItem } from "@/lib/game/catalog";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function ItemSheet({ item, onClose, onMessage }: { item: CatalogItem | null; onClose: () => void; onMessage: (m: string) => void }) {
  const s = useH2O();
  const g = useGame();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(newId()); // misma compra = mismo id (reintentos no cobran dos veces)
  if (!item || !s.data?.pet) return null;

  const pet = s.data.pet;
  const owned = g.owned.has(item.id);
  const equipped = g.equipment[item.slot] === item.id;
  const price = g.prices.get(item.id)?.price ?? item.price;
  const consumable = item.slot === "consumable";
  const enough = g.gotitas >= price;
  const shieldsFull = consumable && g.shields >= MAX_SHIELDS;
  const preview = consumable ? g.equipment : { ...g.equipment, [item.slot]: item.id };
  // Un disfraz completo tapa la ropa del cuerpo: se muestra así en la vista previa
  const r = RARITY[item.rarity];

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await s.buy(item.id, requestId.current);
      requestId.current = newId();
      setConfirming(false);
      onMessage(consumable ? "¡Escudo de Gota listo!" : `¡${item.name} es tuyo!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo comprar");
    } finally {
      setBusy(false);
    }
  };
  const toggleEquip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await s.equip(item.slot, equipped ? null : item.id);
      onMessage(equipped ? "Prenda guardada en el armario" : `${pet.name} se puso ${item.name}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={item.name}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="item-sheet"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: r.color }}>{r.label} · {SLOT_LABELS[item.slot]}</p>
            <h2 className="text-xl font-extrabold">{item.name}</h2>
            <p className="text-sm text-muted">{BRANDS[item.brand].name} — <i>{BRANDS[item.brand].tagline}</i></p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="my-4 flex justify-center rounded-3xl bg-gradient-to-b from-h2o-50 to-white py-3">
          {consumable ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Shield size={80} className="text-sky-500" fill="#e0f2fe" />
              <p className="mt-3 max-w-[16rem] text-sm text-muted">Si un día no registras, protege tu racha automáticamente. Tienes <b>{g.shields}</b> de {MAX_SHIELDS}.</p>
            </div>
          ) : (
            <PetAvatar species={pet.species} color={pet.color} equipment={preview} level={g.level} size={180} anim="reward" animKey={item.id.length} mood="feliz" />
          )}
        </div>

        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        {owned && !consumable ? (
          <button onClick={toggleEquip} disabled={busy} className={`w-full rounded-2xl py-4 font-bold ${equipped ? "bg-slate-100 text-ink" : "bg-navy text-white"}`} data-testid="equip-btn">
            {equipped ? "Quitar" : "Ponérselo"}
          </button>
        ) : !item.purchasable ? (
          <p className="rounded-2xl bg-violet-50 px-4 py-3 text-center text-sm font-semibold text-violet-800">Premio especial: {item.unlock}. No se vende.</p>
        ) : confirming ? (
          <div className="rounded-2xl bg-h2o-50 p-4">
            <p className="text-center text-sm">¿Comprar <b>{item.name}</b> por <b>{price} Gotitas</b>? Te quedarán {g.gotitas - price}.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirming(false)} className="rounded-2xl bg-white py-3 font-semibold ring-1 ring-slate-200">Cancelar</button>
              <button onClick={buy} disabled={busy} className="rounded-2xl bg-navy py-3 font-bold text-white disabled:opacity-60" data-testid="buy-confirm">{busy ? "Comprando…" : "Comprar"}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={!enough || shieldsFull}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
            data-testid="buy-btn"
          >
            {shieldsFull ? `Ya tienes ${MAX_SHIELDS} escudos` : enough ? <>Comprar · <GotaIcon /> {price}</> : <>Te faltan {price - g.gotitas} Gotitas</>}
          </button>
        )}
        {!enough && !owned && item.purchasable && !shieldsFull && (
          <p className="mt-2 text-center text-xs text-muted">Ganas Gotitas registrando agua, cumpliendo tu meta y completando misiones.</p>
        )}
      </div>
    </div>
  );
}
