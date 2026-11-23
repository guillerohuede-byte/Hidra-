"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// Confirmación breve que desaparece sola.
export default function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-5 md:bottom-8"
    >
      <div className="flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-xl">
        <CheckCircle2 size={18} className="text-emerald-300" /> {message}
      </div>
    </div>
  );
}
