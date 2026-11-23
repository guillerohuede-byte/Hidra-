import { Nfc, Hand, Trash2 } from "lucide-react";
import type { IntakeEntry } from "@/lib/types";
import { ml } from "@/lib/format";

// Lista de registros (ya viene ordenada: más reciente primero).
export default function EntryList({
  entries,
  onDelete,
}: {
  entries: IntakeEntry[];
  onDelete?: (e: IntakeEntry) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2.5" data-testid="entry">
          <span className={`rounded-xl p-2 ${e.source === "nfc" ? "bg-h2o-50 text-h2o-600" : "bg-slate-100 text-slate-500"}`}>
            {e.source === "nfc" ? <Nfc size={16} /> : <Hand size={16} />}
          </span>
          <span className="flex-1 text-sm">
            <span className="block font-semibold">{ml(e.amountMl)}</span>
            <span className="text-xs text-muted">{e.bottleName ?? "Sin botella"}
              {e.source === "nfc" ? " · NFC" : ""}</span>
          </span>
          <span className="text-xs font-medium text-muted">{e.time}</span>
          {onDelete && (
            <button
              onClick={() => onDelete(e)}
              className="-mr-2 rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label={`Eliminar registro de ${ml(e.amountMl)} de las ${e.time}`}
            >
              <Trash2 size={17} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
