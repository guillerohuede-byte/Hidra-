"use client";

// ─────────────────────────────────────────────────────────────
// Backend de PRUEBA (NEXT_PUBLIC_H2O_MOCK=1). Imita a Supabase en el
// navegador para pruebas automáticas y capturas sin internet.
// Nunca se usa en producción (ver lib/supabase/config.ts).
// ─────────────────────────────────────────────────────────────

import { CATALOG, ITEMS_BY_ID, MAX_SHIELDS } from "@/lib/game/catalog";
import { levelForXp, pendingRewards, streakStats, todayIn, xpForLevel } from "@/lib/game/rules";
import type { Bottle, IntakeEntry } from "@/lib/types";
import type { Backend, BottleInput, ImportPayload, Pet, Profile, Reward, Snapshot } from "./types";

const KEY = "h2o:mock:db";
type DB = {
  session: boolean;
  profile: Profile;
  pet: Pet | null;
  bottles: Bottle[];
  entries: (IntakeEntry & { clientKey: string })[];
  inventory: { itemId: string; source: "compra" | "premio" }[];
  equipment: Record<string, string>;
  rewards: Reward[];
  freezes: string[];
};

const fresh = (): DB => ({
  session: false,
  profile: {
    id: "mock-user",
    email: "prueba@h2o.test",
    displayName: null,
    timezone: "America/Santiago",
    goalMl: 2000,
    onboarded: false,
    reduceMotion: false,
    selectedBottleId: null,
    localImportDoneAt: null,
  },
  pet: null,
  bottles: [],
  entries: [],
  inventory: [],
  equipment: {},
  rewards: [],
  freezes: [],
});

/** Reloj controlable desde las pruebas: window.__H2O_NOW = "2026-11-25T12:00:00Z" */
const now = () => {
  const w = typeof window !== "undefined" ? (window as unknown as { __H2O_NOW?: string }).__H2O_NOW : undefined;
  return w ? new Date(w) : new Date();
};

const delay = () => new Promise((r) => setTimeout(r, 40));

export class MockBackend implements Backend {
  readonly kind = "mock" as const;

  private read(): DB {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
    } catch {
      return fresh();
    }
  }
  private write(db: DB) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }
  private mutate<T>(fn: (db: DB) => T): T {
    const db = this.read();
    const out = fn(db);
    this.write(db);
    return out;
  }
  private today(db: DB) {
    return todayIn(db.profile.timezone, now());
  }

  async currentUser() {
    const db = this.read();
    return db.session ? { id: db.profile.id, email: db.profile.email } : null;
  }
  async signIn(email: string, password: string) {
    await delay();
    if (password.length < 8) throw new Error("Invalid login credentials");
    this.mutate((db) => {
      db.session = true;
      db.profile.email = email;
    });
  }
  async signUp(email: string, _password: string, displayName: string) {
    await delay();
    this.mutate((db) => {
      db.profile.email = email;
      db.profile.displayName = displayName || null;
    });
    return { needsConfirmation: true };
  }
  async resetPassword() {
    await delay();
  }
  async updatePassword() {
    await delay();
  }
  async signOut() {
    this.mutate((db) => {
      db.session = false;
    });
  }

  private summaryOf(db: DB) {
    const today = this.today(db);
    const xp = db.rewards.reduce((a, r) => a + r.xp, 0);
    const level = levelForXp(xp);
    const s = streakStats([...db.entries.map((e) => e.date), ...db.freezes], today);
    return {
      today,
      xp,
      level,
      levelXpStart: xpForLevel(level),
      levelXpNext: xpForLevel(level + 1),
      gotitas: db.rewards.reduce((a, r) => a + r.gotitas, 0),
      shields: db.rewards.reduce((a, r) => a + r.shields, 0),
      currentStreak: s.current,
      bestStreak: s.best,
      activeToday: s.activeToday,
      freezes: [...db.freezes],
    };
  }

  async load(): Promise<Snapshot> {
    await delay();
    const db = this.read();
    if (!db.session) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    return {
      profile: db.profile,
      pet: db.pet,
      bottles: db.bottles,
      entries: [...db.entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      inventory: db.inventory,
      equipment: db.equipment,
      rewards: [...db.rewards].reverse().slice(0, 60),
      rewardKeys: db.rewards.map((r) => r.key),
      summary: this.summaryOf(db),
      shop: CATALOG.map((i) => ({ id: i.id, price: i.price, purchasable: i.purchasable })),
    };
  }
  async summary() {
    return this.summaryOf(this.read());
  }
  async updateProfile(patch: Parameters<Backend["updateProfile"]>[0]) {
    await delay();
    this.mutate((db) => {
      if (patch.goalMl !== undefined && (patch.goalMl < 1000 || patch.goalMl > 6000)) throw new Error("Meta fuera de rango");
      Object.assign(db.profile, patch);
    });
  }
  async savePet(pet: Pet) {
    await delay();
    this.mutate((db) => {
      db.pet = pet;
    });
  }
  async addBottle(id: string, input: BottleInput) {
    await delay();
    return this.mutate((db) => {
      if (db.bottles.some((b) => b.id === id)) throw new Error("duplicate key");
      if (db.bottles.some((b) => !b.deletedAt && b.name.trim().toLowerCase() === input.name.trim().toLowerCase()))
        throw new Error("bottles_user_name_uniq");
      const b: Bottle = { id, name: input.name.trim(), capacityMl: input.capacityMl, defaultAmountMl: input.defaultAmountMl, color: input.color ?? "#1f78ee", createdAt: now().toISOString() };
      db.bottles.push(b);
      return b;
    });
  }
  async updateBottle(id: string, input: BottleInput) {
    await delay();
    return this.mutate((db) => {
      const b = db.bottles.find((x) => x.id === id && !x.deletedAt);
      if (!b) throw new Error("La botella ya no existe");
      Object.assign(b, { name: input.name.trim(), capacityMl: input.capacityMl, defaultAmountMl: input.defaultAmountMl });
      return { ...b };
    });
  }
  async deleteBottle(id: string) {
    await delay();
    this.mutate((db) => {
      const b = db.bottles.find((x) => x.id === id);
      if (b) b.deletedAt = now().toISOString();
      if (db.profile.selectedBottleId === id) db.profile.selectedBottleId = null;
    });
  }
  async addEntry(e: { clientKey: string; amountMl: number; source: "manual" | "nfc"; bottleId: string | null }) {
    await delay();
    return this.mutate((db) => {
      const existing = db.entries.find((x) => x.clientKey === e.clientKey);
      if (existing) return existing;
      const bottle = e.bottleId ? db.bottles.find((b) => b.id === e.bottleId && !b.deletedAt) : undefined;
      if (e.bottleId && !bottle) throw new Error("La botella no pertenece a este usuario");
      if (bottle && e.source === "nfc" && !bottle.tagLinkedAt) bottle.tagLinkedAt = now().toISOString();
      const t = now();
      const entry = {
        id: crypto.randomUUID(),
        clientKey: e.clientKey,
        amountMl: e.amountMl,
        timestamp: t.toISOString(),
        date: this.today(db),
        time: new Intl.DateTimeFormat("es-CL", { timeZone: db.profile.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(t),
        source: e.source,
        bottleId: bottle?.id ?? null,
        bottleName: bottle?.name ?? null,
      };
      db.entries.push(entry);
      return entry;
    });
  }
  async deleteEntry(id: string) {
    await delay();
    this.mutate((db) => {
      db.entries = db.entries.filter((e) => e.id !== id);
    });
  }
  async claimRewards() {
    await delay();
    return this.mutate((db) => {
      const s = this.summaryOf(db);
      const { grants, freeze } = pendingRewards({
        today: s.today,
        goalMl: db.profile.goalMl,
        onboarded: db.profile.onboarded,
        entries: db.entries.map((e) => ({ localDate: e.date, amountMl: e.amountMl, source: e.source, imported: e.imported })),
        freezes: db.freezes,
        ownedPurchased: db.inventory.filter((i) => i.source === "compra").length,
        keys: new Set(db.rewards.map((r) => r.key)),
        shields: s.shields,
        xp: s.xp,
        goalsMet: db.rewards.filter((r) => r.kind === "meta").length,
      });
      if (freeze) db.freezes.push(freeze);
      let id = db.rewards.reduce((a, r) => Math.max(a, r.id), 0);
      const out = grants.map((g) => {
        if (g.item && !db.inventory.some((i) => i.itemId === g.item)) db.inventory.push({ itemId: g.item, source: "premio" });
        return { id: ++id, key: g.key, kind: g.kind, label: g.label, gotitas: g.gotitas, xp: g.xp, shields: g.shields ?? 0, createdAt: now().toISOString() };
      });
      db.rewards.push(...out);
      return out;
    });
  }
  async buy(itemId: string, requestId: string) {
    await delay();
    this.mutate((db) => {
      const item = ITEMS_BY_ID[itemId];
      if (!item) throw new Error("Ese artículo no existe");
      if (!item.purchasable) throw new Error("Este artículo solo se consigue como premio");
      const key = `buy:${itemId}:${requestId}`;
      if (db.rewards.some((r) => r.key === key)) return;
      const s = this.summaryOf(db);
      if (s.gotitas < item.price) throw new Error(`Te faltan ${item.price - s.gotitas} Gotitas`);
      if (item.slot === "consumable") {
        if (s.shields >= MAX_SHIELDS) throw new Error("Ya tienes el máximo de 3 escudos");
      } else {
        if (db.inventory.some((i) => i.itemId === itemId)) throw new Error("Ya tienes este artículo");
        db.inventory.push({ itemId, source: "compra" });
      }
      const id = db.rewards.reduce((a, r) => Math.max(a, r.id), 0) + 1;
      db.rewards.push({ id, key, kind: "compra", label: `Compra: ${item.name}`, gotitas: -item.price, xp: 0, shields: item.slot === "consumable" ? 1 : 0, createdAt: now().toISOString() });
    });
  }
  async equip(slot: string, itemId: string | null) {
    await delay();
    this.mutate((db) => {
      if (itemId) {
        if (!db.inventory.some((i) => i.itemId === itemId) || ITEMS_BY_ID[itemId]?.slot !== slot) throw new Error("No puedes equipar eso");
        db.equipment[slot] = itemId;
      } else delete db.equipment[slot];
    });
  }
  async importLocal(payload: ImportPayload) {
    await delay();
    return this.mutate((db) => {
      let bi = 0, ba = 0, ei = 0, es = 0;
      for (const b of payload.bottles) {
        if (db.bottles.some((x) => x.id === b.id)) { ba++; continue; }
        let name = b.name;
        for (let n = 2; db.bottles.some((x) => !x.deletedAt && x.name.toLowerCase() === name.toLowerCase()); n++) name = `${b.name} (${n})`;
        db.bottles.push({ ...b, name, deletedAt: null });
        bi++;
      }
      for (const e of payload.entries) {
        const clientKey = `local:${e.id}`;
        if (db.entries.some((x) => x.clientKey === clientKey)) { es++; continue; }
        db.entries.push({ ...e, clientKey, imported: true, bottleId: db.bottles.some((b) => b.id === e.bottleId) ? e.bottleId : null });
        ei++;
      }
      if (payload.goalMl && payload.goalMl >= 1000 && payload.goalMl <= 6000) db.profile.goalMl = payload.goalMl;
      db.profile.localImportDoneAt = now().toISOString();
      return { bottles_imported: bi, bottles_already: ba, bottles_conflict: [], entries_imported: ei, entries_skipped: es };
    });
  }
}
