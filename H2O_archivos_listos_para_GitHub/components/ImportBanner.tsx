"use client";

// Ofrece pasar a la cuenta los datos guardados antes en este navegador
// (versión sin cuenta). Pide confirmación, se puede repetir sin duplicar
// y NUNCA borra los datos originales del navegador.
import { useEffect, useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { useH2O } from "@/lib/store";
import { readLegacyData, legacyImportedFor, markLegacyImported } from "@/lib/storage";
import type { ImportResult } from "@/lib/backend/types";

const SNOOZE = "h2o:import:snooze";

export function useLegacy() {
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacyData> | null>(null);
  const [importedBy, setImportedBy] = useState<string | null>(null);
  useEffect(() => {
    setLegacy(readLegacyData());
    setImportedBy(legacyImportedFor());
  }, []);
  const has = !!legacy && (legacy.bottles.length > 0 || legacy.entries.length > 0);
  return { legacy, has, importedBy, refreshMark: () => setImportedBy(legacyImportedFor()) };
}

export function ImportPanel({ onClose, onDone }: { onClose?: () => void; onDone?: (r: ImportResult) => void }) {
  const s = useH2O();
  const { legacy, refreshMark } = useLegacy();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!legacy) return null;

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await s.importLocal({ bottles: legacy.bottles, entries: legacy.entries, goalMl: legacy.goalMl });
      // Verificación: todo lo del navegador quedó en la cuenta (nuevo o ya existente)
      const okBottles = r.bottles_imported + r.bottles_already + r.bottles_conflict.length === legacy.bottles.length;
      const okEntries = r.entries_imported + r.entries_skipped === legacy.entries.length;
      if (okBottles && okEntries && s.data) markLegacyImported(s.data.profile.id);
      refreshMark();
      setResult(r);
      onDone?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar");
    } finally {
      setBusy(false);
    }
  };

  if (result)
    return (
      <div className="text-sm" data-testid="import-result">
        <p className="font-bold text-emerald-700">¡Listo! Tus datos quedaron en tu cuenta.</p>
        <ul className="mt-1 list-disc pl-5 text-muted">
          <li>{result.bottles_imported} botellas nuevas{result.bottles_already ? ` (${result.bottles_already} ya estaban)` : ""}</li>
          <li>{result.entries_imported} registros nuevos{result.entries_skipped ? ` (${result.entries_skipped} ya estaban)` : ""}</li>
          {result.bottles_conflict.length > 0 && (
            <li className="text-amber-700">{result.bottles_conflict.length} sticker(s) ya pertenecen a otra cuenta y no se movieron.</li>
          )}
        </ul>
        <p className="mt-2 text-xs text-muted">Los datos originales siguen guardados en este navegador. Los registros importados no dan Gotitas (para que todo sea justo).</p>
        {onClose && <button onClick={onClose} className="mt-3 font-semibold text-h2o-700">Cerrar</button>}
      </div>
    );

  return (
    <div className="text-sm">
      <p className="text-muted">
        En este navegador hay <b className="text-navy">{legacy.bottles.length} botellas</b> y <b className="text-navy">{legacy.entries.length} registros</b> de antes de tener cuenta.
        ¿Los pasamos a tu cuenta? Así tus stickers funcionan también en la app instalada y en otros dispositivos.
      </p>
      <p className="mt-1 text-xs text-muted">No se borra nada de este navegador. Si lo haces dos veces, no se duplica.</p>
      {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 font-medium text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={run} disabled={busy} className="flex-1 rounded-2xl bg-navy py-3 font-bold text-white disabled:opacity-60" data-testid="import-confirm">
          {busy ? "Importando…" : "Sí, importar"}
        </button>
        {onClose && <button onClick={onClose} className="rounded-2xl px-4 py-3 font-semibold text-muted ring-1 ring-slate-200">Ahora no</button>}
      </div>
    </div>
  );
}

export default function ImportBanner() {
  const s = useH2O();
  const { has, importedBy } = useLegacy();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(SNOOZE) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const uid = s.data?.profile.id;
  if (!has || !uid || importedBy === uid || hidden) return null;

  const close = () => {
    try {
      sessionStorage.setItem(SNOOZE, "1");
    } catch {}
    setHidden(true);
  };
  return (
    <section className="pop-in mb-4 rounded-3xl bg-white p-5 shadow-sm ring-2 ring-h2o-200" data-testid="import-banner">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold"><CloudUpload size={18} className="text-h2o-600" /> Encontramos datos guardados</h2>
        <button onClick={close} className="rounded-full p-1.5 text-muted hover:bg-slate-100" aria-label="Cerrar"><X size={16} /></button>
      </div>
      <ImportPanel onClose={close} />
    </section>
  );
}
