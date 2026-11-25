"use client";

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL DE H2O
// Carga los datos de la cuenta, los muestra al instante (cambios
// optimistas) y los sincroniza con el backend. Los premios los decide
// el servidor: después de cada acción se llama a claimRewards().
// ─────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_MODE } from "@/lib/supabase/config";
import { SupabaseBackend } from "@/lib/backend/supabase";
import { MockBackend } from "@/lib/backend/mock";
import type { Backend, BottleInput, ImportResult, Pet, Profile, Reward, Snapshot } from "@/lib/backend/types";
import { friendlyError } from "@/lib/backend/types";
import type { Bottle, IntakeEntry } from "@/lib/types";
import { BOTTLE_COLORS, newBottleCode } from "@/lib/storage";
import { todayIn } from "@/lib/game/rules";

let backendSingleton: Backend | null = null;
export function getBackend(): Backend {
  backendSingleton ??= MOCK_MODE ? new MockBackend() : new SupabaseBackend();
  return backendSingleton;
}

export type PetEvent = { type: "drink" | "celebrate" | "reward" | "levelup" | "pet"; at: number };
type Status = "loading" | "ready" | "signed-out" | "error";

type Ctx = {
  status: Status;
  error: string | null;
  online: boolean;
  data: Snapshot | null;
  todayKey: string;
  petEvent: PetEvent | null;
  celebration: Reward[];
  dismissCelebration: () => void;
  poke: (type: PetEvent["type"]) => void;
  refresh: () => Promise<void>;
  addEntry: (amountMl: number, source: "manual" | "nfc", bottleId: string | null, clientKey?: string) => Promise<{ entry: IntakeEntry; rewards: Reward[] }>;
  deleteEntry: (id: string) => Promise<void>;
  updateProfile: (patch: Parameters<Backend["updateProfile"]>[0]) => Promise<void>;
  addBottle: (input: BottleInput) => Promise<Bottle>;
  updateBottle: (id: string, input: BottleInput) => Promise<Bottle>;
  deleteBottle: (id: string) => Promise<void>;
  selectBottle: (id: string | null) => Promise<void>;
  savePet: (pet: Pet) => Promise<void>;
  equip: (slot: string, itemId: string | null) => Promise<void>;
  buy: (itemId: string, requestId: string) => Promise<void>;
  importLocal: (payload: Parameters<Backend["importLocal"]>[0]) => Promise<ImportResult>;
  setTrainingToday: (training: boolean) => Promise<void>;
  saveHydration: (h: Parameters<Backend["saveHydration"]>[0]) => Promise<void>;
  claim: () => Promise<Reward[]>;
  signOut: () => Promise<void>;
};

const H2OContext = createContext<Ctx | null>(null);

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function H2OProvider({ children }: { children: React.ReactNode }) {
  const backend = getBackend();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [petEvent, setPetEvent] = useState<PetEvent | null>(null);
  const [celebration, setCelebration] = useState<Reward[]>([]);
  const dataRef = useRef<Snapshot | null>(null);
  dataRef.current = data;

  const poke = useCallback((type: PetEvent["type"]) => setPetEvent({ type, at: Date.now() }), []);

  const patch = useCallback((fn: (d: Snapshot) => Snapshot) => {
    setData((d) => (d ? fn(d) : d));
  }, []);

  /** Aplica premios nuevos: suma al estado y lanza la celebración */
  const applyRewards = useCallback(
    async (rewards: Reward[]) => {
      if (!rewards.length) return;
      let summary = dataRef.current?.summary;
      try {
        summary = await backend.summary();
      } catch {
        /* se actualizará en el próximo refresco */
      }
      const prevLevel = dataRef.current?.summary.level ?? 1;
      patch((d) => ({
        ...d,
        summary: summary ?? d.summary,
        rewards: [...[...rewards].reverse(), ...d.rewards].slice(0, 60),
        rewardKeys: [...d.rewardKeys, ...rewards.map((r) => r.key)],
      }));
      // Rachas y niveles pueden traer prendas de premio: recargar el inventario
      if (rewards.some((r) => r.kind === "racha" || r.kind === "nivel")) {
        backend.load().then(setData).catch(() => {});
      }
      // Lo visible: solo lo que vale la pena celebrar (no cada registro)
      const notable = rewards.filter((r) => r.kind !== "registro" && r.kind !== "compra");
      if (notable.length) setCelebration((c) => [...c, ...notable]);
      if (summary && summary.level > prevLevel) poke("levelup");
      else if (rewards.some((r) => r.kind === "meta")) poke("celebrate");
      else if (notable.length) poke("reward");
    },
    [backend, patch, poke],
  );

  const claim = useCallback(async () => {
    try {
      const r = await backend.claimRewards();
      await applyRewards(r);
      return r;
    } catch {
      return []; // sin red: se reclamará después (es idempotente)
    }
  }, [backend, applyRewards]);

  const refresh = useCallback(async () => {
    try {
      const user = await backend.currentUser();
      if (!user) {
        setStatus("signed-out");
        setData(null);
        return;
      }
      const snap = await backend.load();
      setData(snap);
      setTodayKey(snap.summary.today || todayIn(snap.profile.timezone));
      setStatus("ready");
      setError(null);
      if (snap.profile.onboarded) void claim();
    } catch (e) {
      const msg = friendlyError(e);
      if (/sesión expiró/.test(msg)) {
        setStatus("signed-out");
        setData(null);
      } else {
        setError(msg);
        setStatus((s) => (s === "ready" ? "ready" : "error"));
      }
    }
  }, [backend, claim]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Cambio de día, volver a la app y estado de la conexión
  useEffect(() => {
    const tick = () => {
      const d = dataRef.current;
      if (!d) return;
      const k = todayIn(d.profile.timezone);
      setTodayKey((prev) => {
        if (prev && prev !== k) void refresh(); // nuevo día: nueva recompensa diaria y racha recalculada
        return k;
      });
    };
    const t = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const setNet = () => setOnline(navigator.onLine);
    const onOnline = () => {
      setNet();
      void refresh(); // al volver la conexión: sincronizar y reclamar premios pendientes
    };
    setNet();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", setNet);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", setNet);
    };
  }, [refresh]);

  // ── Acciones ────────────────────────────────────────────────
  const addEntry = useCallback<Ctx["addEntry"]>(
    async (amountMl, source, bottleId, clientKey = uuid()) => {
      const d = dataRef.current;
      if (!d) throw new Error("Cargando…");
      const bottle = bottleId ? d.bottles.find((b) => b.id === bottleId) : undefined;
      const tmp: IntakeEntry = {
        id: `tmp-${clientKey}`,
        amountMl,
        timestamp: new Date().toISOString(),
        date: todayIn(d.profile.timezone),
        time: new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
        source,
        bottleId: bottle?.id ?? null,
        bottleName: bottle?.name ?? null,
        pending: true,
      };
      patch((s) => ({ ...s, entries: [tmp, ...s.entries] }));
      poke("drink");
      try {
        const entry = await backend.addEntry({ clientKey, amountMl, source, bottleId: bottle?.id ?? null });
        patch((s) => ({
          ...s,
          entries: [entry, ...s.entries.filter((e) => e.id !== tmp.id && e.id !== entry.id)],
          bottles: source === "nfc" && bottle && !bottle.tagLinkedAt
            ? s.bottles.map((b) => (b.id === bottle.id ? { ...b, tagLinkedAt: entry.timestamp } : b))
            : s.bottles,
        }));
        const rewards = await claim();
        return { entry, rewards };
      } catch (e) {
        patch((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== tmp.id) }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, claim, patch, poke],
  );

  const deleteEntry = useCallback<Ctx["deleteEntry"]>(
    async (id) => {
      const prev = dataRef.current?.entries;
      patch((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
      try {
        await backend.deleteEntry(id);
      } catch (e) {
        if (prev) patch((s) => ({ ...s, entries: prev }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch],
  );

  const updateProfile = useCallback<Ctx["updateProfile"]>(
    async (p) => {
      const prev = dataRef.current?.profile;
      patch((s) => ({ ...s, profile: { ...s.profile, ...p } as Profile }));
      try {
        await backend.updateProfile(p);
        if (p.goalMl !== undefined || p.trainingExtraMl !== undefined || p.onboarded || p.timezone) {
          if (p.timezone) setTodayKey(todayIn(p.timezone));
          await claim();
          const summary = await backend.summary();
          // La meta nueva vale desde hoy; los días anteriores conservan la suya
          patch((s) => ({ ...s, summary, dayGoals: { ...s.dayGoals, [summary.today]: summary.todayGoalMl } }));
        }
      } catch (e) {
        if (prev) patch((s) => ({ ...s, profile: prev }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, claim, patch],
  );

  const addBottle = useCallback<Ctx["addBottle"]>(
    async (input) => {
      const d = dataRef.current!;
      const active = d.bottles.filter((b) => !b.deletedAt);
      const color = BOTTLE_COLORS[active.length % BOTTLE_COLORS.length];
      let lastErr: unknown;
      for (let i = 0; i < 3; i++) {
        try {
          const b = await backend.addBottle(newBottleCode(new Set(d.bottles.map((x) => x.id))), { ...input, color });
          patch((s) => ({ ...s, bottles: [...s.bottles, b] }));
          if (!d.profile.selectedBottleId || !active.some((x) => x.id === d.profile.selectedBottleId)) {
            await backend.updateProfile({ selectedBottleId: b.id });
            patch((s) => ({ ...s, profile: { ...s.profile, selectedBottleId: b.id } }));
          }
          return b;
        } catch (e) {
          lastErr = e;
          if (!/duplicate key|bottles_pkey/.test(String((e as Error).message))) break; // solo reintentar si chocó el código
        }
      }
      throw new Error(friendlyError(lastErr));
    },
    [backend, patch],
  );

  const updateBottle = useCallback<Ctx["updateBottle"]>(
    async (id, input) => {
      try {
        const b = await backend.updateBottle(id, input);
        patch((s) => ({ ...s, bottles: s.bottles.map((x) => (x.id === id ? b : x)) }));
        return b;
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch],
  );

  const deleteBottle = useCallback<Ctx["deleteBottle"]>(
    async (id) => {
      const d = dataRef.current!;
      try {
        if (d.profile.selectedBottleId === id) {
          const next = d.bottles.find((b) => !b.deletedAt && b.id !== id)?.id ?? null;
          await backend.updateProfile({ selectedBottleId: next });
          patch((s) => ({ ...s, profile: { ...s.profile, selectedBottleId: next } }));
        }
        await backend.deleteBottle(id);
        patch((s) => ({ ...s, bottles: s.bottles.map((b) => (b.id === id ? { ...b, deletedAt: new Date().toISOString() } : b)) }));
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch],
  );

  const selectBottle = useCallback<Ctx["selectBottle"]>((id) => updateProfile({ selectedBottleId: id }), [updateProfile]);

  const savePet = useCallback<Ctx["savePet"]>(
    async (pet) => {
      const prev = dataRef.current?.pet ?? null;
      patch((s) => ({ ...s, pet }));
      try {
        await backend.savePet(pet);
        poke("reward");
      } catch (e) {
        patch((s) => ({ ...s, pet: prev }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch, poke],
  );

  const equip = useCallback<Ctx["equip"]>(
    async (slot, itemId) => {
      const prev = dataRef.current?.equipment ?? {};
      patch((s) => {
        const eq = { ...s.equipment };
        if (itemId) eq[slot] = itemId;
        else delete eq[slot];
        return { ...s, equipment: eq };
      });
      try {
        await backend.equip(slot, itemId);
        if (itemId) poke("reward");
      } catch (e) {
        patch((s) => ({ ...s, equipment: prev }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch, poke],
  );

  const buy = useCallback<Ctx["buy"]>(
    async (itemId, requestId) => {
      try {
        await backend.buy(itemId, requestId);
        const [snap] = await Promise.all([backend.load()]);
        setData(snap);
        poke("reward");
        await claim(); // logro "primer accesorio"
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [backend, claim, poke],
  );

  const importLocal = useCallback<Ctx["importLocal"]>(
    async (payload) => {
      try {
        const r = await backend.importLocal(payload);
        await refresh();
        return r;
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [backend, refresh],
  );

  /** Hoy entreno / hoy descanso: solo cambia la meta de HOY */
  const setTrainingToday = useCallback<Ctx["setTrainingToday"]>(
    async (training) => {
      const prev = dataRef.current?.summary;
      patch((d) => ({
        ...d,
        summary: { ...d.summary, trainingToday: training, todayGoalMl: d.summary.baseGoalMl + (training ? d.summary.trainingExtraMl : 0) },
      }));
      try {
        await backend.setTrainingToday(training);
        const summary = await backend.summary();
        patch((d) => ({ ...d, summary, dayGoals: { ...d.dayGoals, [summary.today]: summary.todayGoalMl } }));
        await claim();
      } catch (e) {
        if (prev) patch((d) => ({ ...d, summary: prev }));
        throw new Error(friendlyError(e));
      }
    },
    [backend, claim, patch],
  );

  const saveHydration = useCallback<Ctx["saveHydration"]>(
    async (h) => {
      try {
        await backend.saveHydration(h);
        patch((d) => ({ ...d, hydration: h ? { ...h, updatedAt: new Date().toISOString() } : null }));
      } catch (e) {
        throw new Error(friendlyError(e));
      }
    },
    [backend, patch],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setData(null);
    setStatus("signed-out");
  }, [backend]);

  const value = useMemo<Ctx>(
    () => ({
      status, error, online, data, todayKey, petEvent, celebration,
      dismissCelebration: () => setCelebration([]),
      poke, refresh, addEntry, deleteEntry, updateProfile, addBottle, updateBottle, deleteBottle, selectBottle,
      savePet, equip, buy, importLocal, claim, signOut, setTrainingToday, saveHydration,
    }),
    [status, error, online, data, todayKey, petEvent, celebration, poke, refresh, addEntry, deleteEntry, updateProfile,
      addBottle, updateBottle, deleteBottle, selectBottle, savePet, equip, buy, importLocal, claim, signOut, setTrainingToday, saveHydration],
  );

  return <H2OContext.Provider value={value}>{children}</H2OContext.Provider>;
}

export function useH2O() {
  const ctx = useContext(H2OContext);
  if (!ctx) throw new Error("useH2O debe usarse dentro de <H2OProvider>");
  return ctx;
}
