"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Droplets, LogOut, Milk, Target, ShoppingBag, PawPrint, Globe, Accessibility, CloudUpload, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PetAvatar from "@/components/pet/PetAvatar";
import Toast from "@/components/Toast";
import { ImportPanel, useLegacy } from "@/components/ImportBanner";
import { useH2O } from "@/lib/store";
import { useGame } from "@/lib/useGame";
import { ml } from "@/lib/format";

const COMMON_TZ = ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter", "America/Argentina/Buenos_Aires", "America/Lima", "America/Bogota", "America/Mexico_City", "America/New_York", "Europe/Madrid", "UTC"];

export default function Perfil() {
  const s = useH2O();
  const g = useGame();
  const router = useRouter();
  const legacy = useLegacy();
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [name, setName] = useState(s.data?.profile.displayName ?? "");
  const [showImport, setShowImport] = useState(false);
  const p = s.data?.profile;
  const deviceTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Santiago";
    }
  }, []);
  if (!p) return null;
  const tzOptions = [...new Set([p.timezone, deviceTz, ...COMMON_TZ])];

  const save = async (patch: Parameters<typeof s.updateProfile>[0], msg: string) => {
    try {
      await s.updateProfile(patch);
      setToast(msg);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const logout = async () => {
    await s.signOut();
    router.replace("/login");
  };

  const row = "flex items-center gap-3 px-5 py-3.5 text-sm font-semibold";

  return (
    <>
      <PageHeader title="Perfil" />

      <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        {s.data?.pet && <PetAvatar species={s.data.pet.species} color={s.data.pet.color} equipment={g.equipment} level={g.level} size={72} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{p.displayName || "Sin nombre"}</p>
          <p className="truncate text-sm text-muted" data-testid="profile-email">{p.email}</p>
          <p className="mt-1 text-xs font-semibold text-h2o-700">Nivel {g.level} · {g.gotitas} Gotitas · Mejor racha {g.bestStreak}</p>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-h2o-100">
        {[
          { href: "/botellas", icon: Milk, label: "Mis botellas y stickers NFC" },
          { href: "/hidratacion", icon: Droplets, label: "Hidratación · meta personal" },
          { href: "/metas", icon: Target, label: `Metas · base ${ml(p.goalMl)}` },
          { href: "/companero", icon: PawPrint, label: "Mi compañero y armario" },
          { href: "/tienda", icon: ShoppingBag, label: "Tienda" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={`${row} border-b border-slate-100 last:border-0 hover:bg-slate-50`}>
            <Icon size={18} className="text-h2o-600" /> <span className="flex-1">{label}</span> <ChevronRight size={16} className="text-slate-300" />
          </Link>
        ))}
      </section>

      <section className="mt-4 space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
        <h2 className="font-bold">Ajustes</h2>
        <div>
          <label htmlFor="pf-name" className="text-sm font-semibold">Tu nombre</label>
          <div className="mt-1.5 flex gap-2">
            <input id="pf-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-h2o-500" />
            <button disabled={!name.trim() || name.trim() === p.displayName} onClick={() => save({ displayName: name.trim() }, "Nombre guardado")} className="rounded-2xl bg-navy px-4 font-bold text-white disabled:opacity-40">Guardar</button>
          </div>
        </div>
        <div>
          <label htmlFor="pf-tz" className="flex items-center gap-1.5 text-sm font-semibold"><Globe size={15} /> Zona horaria</label>
          <select id="pf-tz" value={p.timezone} onChange={(e) => save({ timezone: e.target.value }, "Zona horaria actualizada")} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base">
            {tzOptions.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}{tz === deviceTz ? " (este dispositivo)" : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Define cuándo empieza tu día para la meta, la racha y las misiones.</p>
        </div>
        <label className="flex items-center gap-3">
          <Accessibility size={18} className="text-h2o-600" />
          <span className="flex-1 text-sm font-semibold">Reducir animaciones<span className="block text-xs font-normal text-muted">También se respeta la opción de tu sistema.</span></span>
          <input type="checkbox" role="switch" checked={p.reduceMotion} onChange={(e) => save({ reduceMotion: e.target.checked }, e.target.checked ? "Animaciones reducidas" : "Animaciones activadas")} className="h-6 w-11 accent-h2o-600" data-testid="reduce-motion" />
        </label>
      </section>

      {legacy.has && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-h2o-100">
          <h2 className="flex items-center gap-2 font-bold"><CloudUpload size={18} className="text-h2o-600" /> Datos de este navegador</h2>
          {showImport ? (
            <div className="mt-2"><ImportPanel onClose={() => setShowImport(false)} /></div>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                {legacy.importedBy === p.id ? "Ya los importaste a esta cuenta. Puedes repetirlo: no se duplica nada." : "Hay botellas o registros de antes de tener cuenta."}
              </p>
              <button onClick={() => setShowImport(true)} className="mt-3 rounded-2xl bg-h2o-50 px-4 py-2.5 text-sm font-bold text-h2o-800">Revisar e importar</button>
            </>
          )}
        </section>
      )}

      <section className="mt-4 rounded-3xl bg-white p-5 text-xs leading-relaxed text-muted shadow-sm ring-1 ring-h2o-100">
        <p className="flex items-center gap-1.5 font-semibold text-ink"><ShieldCheck size={15} className="text-emerald-600" /> Tu privacidad</p>
        Tus datos solo los ves tú: no hay perfiles públicos ni rankings. Hidra es una herramienta de hábitos y no reemplaza recomendaciones médicas.
      </section>

      <button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-red-600 ring-1 ring-red-100" data-testid="logout">
        <LogOut size={18} /> Cerrar sesión
      </button>
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
