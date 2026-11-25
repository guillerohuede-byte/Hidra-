"use client";

import { useCallback, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Nfc } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottleIcon from "@/components/BottleIcon";
import BottleForm from "@/components/BottleForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import NfcSetup from "@/components/NfcSetup";
import Toast from "@/components/Toast";
import type { Bottle } from "@/lib/types";
import type { BottleInput } from "@/lib/storage";
import { ml } from "@/lib/format";
import { useHydration } from "@/lib/useHydration";

export default function Botellas() {
  const h = useHydration();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bottle | null>(null);
  const [toDelete, setToDelete] = useState<Bottle | null>(null);
  const [nfcFor, setNfcFor] = useState<Bottle | null>(null);
  const closeNfc = useCallback(() => setNfcFor(null), []);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (b: Bottle) => {
    setEditing(b);
    setFormOpen(true);
  };

  const save = async (input: BottleInput): Promise<string | null> => {
    try {
      if (editing) {
        await h.updateBottle(editing.id, input);
        setToast("Cambios guardados");
      } else {
        const b = await h.addBottle(input);
        setToast(h.bottles.length === 0 ? `${b.name} agregada y en uso` : `${b.name} agregada`);
      }
      setFormOpen(false);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "No se pudo guardar";
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const b = toDelete;
    setToDelete(null);
    try {
      await h.deleteBottle(b.id);
      setToast(`${b.name} eliminada`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const hasBottles = h.bottles.length > 0;

  return (
    <>
      <PageHeader
        title="Mis botellas"
        subtitle={hasBottles ? "Toca una botella para usarla" : "Configura la botella que usas a diario"}
        right={
          hasBottles && (
            <button
              onClick={openNew}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-h2o-500 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-h2o-600"
            >
              <Plus size={16} strokeWidth={2.6} /> Agregar
            </button>
          )
        }
      />

      {h.ready && !hasBottles && (
        <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-h2o-100">
          <div className="mb-4 flex items-end gap-1">
            <BottleIcon color="#85bdff" size={44} />
            <BottleIcon color="#1f78ee" size={64} />
            <BottleIcon color="#b9d9ff" size={36} />
          </div>
          <h2 className="text-lg font-bold">Aún no tienes botellas</h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Agrega tu botella de siempre y define cuánto tomas cada vez. Así registrar será un solo toque.
          </p>
          <button
            onClick={openNew}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-navy px-6 py-3.5 font-bold text-white transition hover:bg-navy-hover"
          >
            <Plus size={20} strokeWidth={2.6} /> Agregar mi primera botella
          </button>
        </section>
      )}

      {hasBottles && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {h.bottles.map((b) => {
            const selected = h.selectedBottle?.id === b.id;
            return (
              <li
                key={b.id}
                data-testid="bottle-card"
                className={`rounded-3xl bg-white shadow-sm transition ${
                  selected ? "ring-2 ring-h2o-500" : "ring-1 ring-h2o-100"
                }`}
              >
                <button
                  onClick={() => {
                    if (!selected) {
                      h.selectBottle(b.id);
                      setToast(`Usando ${b.name}`);
                    }
                  }}
                  aria-pressed={selected}
                  aria-label={`Usar ${b.name}`}
                  className="flex w-full items-center gap-4 p-5 pb-3 text-left"
                >
                  <BottleIcon color={b.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{b.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">Capacidad {ml(b.capacityMl)}</span>
                    <span className="block text-sm text-muted">
                      Registra <b className="text-navy">{ml(b.defaultAmountMl)}</b> por vez
                    </span>
                    {b.tagLinkedAt && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Nfc size={12} /> Sticker funcionando
                      </span>
                    )}
                  </span>
                  {selected ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-h2o-500 px-2.5 py-1 text-xs font-bold text-white">
                      <CheckCircle2 size={14} /> En uso
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-400">
                      <Circle size={14} /> Usar
                    </span>
                  )}
                </button>
                <div className="flex justify-end gap-1 border-t border-slate-100 px-3 py-1.5">
                  <button
                    onClick={() => setNfcFor(b)}
                    className="mr-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-h2o-600 hover:bg-h2o-50"
                    aria-label={`Configurar NFC de ${b.name}`}
                  >
                    <Nfc size={15} /> NFC
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-slate-50 hover:text-ink"
                    aria-label={`Editar ${b.name}`}
                  >
                    <Pencil size={15} /> Editar
                  </button>
                  <button
                    onClick={() => setToDelete(b)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label={`Eliminar ${b.name}`}
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BottleForm open={formOpen} bottle={editing} others={h.bottles} onClose={closeForm} onSave={save} />
      <NfcSetup bottle={nfcFor} onClose={closeNfc} />
      <ConfirmDialog
        open={!!toDelete}
        title={`¿Eliminar ${toDelete?.name ?? "botella"}?`}
        text="Tus registros de consumo con esta botella se conservan en el historial."
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
