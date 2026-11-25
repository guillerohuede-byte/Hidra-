"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Bottle, IntakeEntry } from "@/lib/types";
import type { Backend, BottleInput, HydrationProfile, ImportPayload, ImportResult, Pet, Profile, Reward, Snapshot, Summary } from "./types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

const HISTORY_DAYS = 120;

/** Falla si hubo error; el dato puede venir vacío */
function ok<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data;
}
/** Falla si hubo error o si no llegó el dato */
function check<T>(res: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  const d = ok(res);
  if (d === null || d === undefined) throw new Error("No se encontraron datos.");
  return d as NonNullable<T>;
}

const timeIn = (iso: string, tz: string) => {
  try {
    return new Intl.DateTimeFormat("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
};

export const toBottle = (r: Row<"bottles">): Bottle => ({
  id: r.id,
  name: r.name,
  capacityMl: r.capacity_ml,
  defaultAmountMl: r.default_amount_ml,
  color: r.color,
  createdAt: r.created_at,
  tagLinkedAt: r.tag_linked_at,
  deletedAt: r.deleted_at,
});

export const toEntry = (r: Row<"intake_entries">, tz: string): IntakeEntry => ({
  id: r.id,
  amountMl: r.amount_ml,
  timestamp: r.logged_at,
  date: r.local_date,
  time: timeIn(r.logged_at, tz),
  source: r.source === "nfc" ? "nfc" : "manual",
  imported: r.imported,
  bottleId: r.bottle_id,
  bottleName: r.bottle_name,
});

const toReward = (r: Row<"reward_events">): Reward => ({
  id: r.id,
  key: r.key,
  kind: r.kind,
  label: r.label.replace(/\bH2O\b/g, "Hidra"), // premios antiguos guardados con la marca anterior (no se modifica la base)
  gotitas: r.gotitas,
  xp: r.xp,
  shields: r.shields,
  createdAt: r.created_at,
});

type SummaryJson = {
  today: string; xp: number; level: number; level_xp_start: number; level_xp_next: number; gotitas: number;
  shields: number; current_streak: number; best_streak: number; active_today: boolean; freezes: string[];
  today_goal_ml?: number; base_goal_ml?: number; training_extra_ml?: number; training_today?: boolean;
};
const toSummary = (j: SummaryJson): Summary => ({
  today: j.today,
  xp: j.xp,
  level: j.level,
  levelXpStart: j.level_xp_start,
  levelXpNext: j.level_xp_next,
  gotitas: j.gotitas,
  shields: j.shields,
  currentStreak: j.current_streak,
  bestStreak: j.best_streak,
  activeToday: j.active_today,
  freezes: j.freezes ?? [],
  todayGoalMl: j.today_goal_ml ?? j.base_goal_ml ?? 2000,
  baseGoalMl: j.base_goal_ml ?? 2000,
  trainingExtraMl: j.training_extra_ml ?? 0,
  trainingToday: !!j.training_today,
});

export class SupabaseBackend implements Backend {
  readonly kind = "supabase" as const;
  private sb = supabaseBrowser();
  private tz = "America/Santiago";

  private async uid() {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    return data.user.id;
  }

  async currentUser() {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(email: string, password: string, displayName: string, redirectTo: string) {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo, data: { display_name: displayName } },
    });
    if (error) throw error;
    // Supabase no avisa si el correo ya existe (protección contra enumeración): sin identidades = ya registrado
    if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
    return { needsConfirmation: !data.session };
  }

  async resetPassword(email: string, redirectTo: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string) {
    const { error } = await this.sb.auth.updateUser({ password });
    if (error) throw error;
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async load(): Promise<Snapshot> {
    const user = await this.currentUser();
    if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString().slice(0, 10);

    const [p, pet, bottles, entries, inv, eq, rewards, keys, summary, shop, hyd, goals] = await Promise.all([
      this.sb.from("profiles").select("*").eq("id", user.id).single(),
      this.sb.from("pets").select("*").maybeSingle(),
      this.sb.from("bottles").select("*").order("created_at"),
      this.sb.from("intake_entries").select("*").gte("local_date", since).order("logged_at", { ascending: false }).limit(5000),
      this.sb.from("inventory").select("item_id, source"),
      this.sb.from("pet_equipment").select("slot, item_id"),
      this.sb.from("reward_events").select("*").order("id", { ascending: false }).limit(60),
      this.sb.from("reward_events").select("key").limit(10000),
      this.sb.rpc("game_summary"),
      this.sb.from("shop_items").select("id, price, purchasable"),
      this.sb.from("hydration_profiles").select("*").maybeSingle(),
      this.sb.from("daily_goals").select("day, base_ml, extra_ml, training").gte("day", since),
    ]);
    const pr = check(p);
    this.tz = pr.timezone;
    const profile: Profile = {
      id: pr.id,
      email: user.email,
      displayName: pr.display_name,
      timezone: pr.timezone,
      goalMl: pr.goal_ml,
      onboarded: pr.onboarded,
      reduceMotion: pr.reduce_motion,
      selectedBottleId: pr.selected_bottle_id,
      localImportDoneAt: pr.local_import_done_at,
      trainingExtraMl: pr.training_extra_ml ?? 0,
      goalSource: pr.goal_source === "calculada" ? "calculada" : "manual",
    };
    const h = ok(hyd);
    const petRow = ok(pet);
    return {
      profile,
      pet: petRow ? { species: petRow.species, name: petRow.name, color: petRow.color } : null,
      bottles: check(bottles).map(toBottle),
      entries: check(entries).map((r) => toEntry(r, pr.timezone)),
      inventory: check(inv).map((r) => ({ itemId: r.item_id, source: r.source === "compra" ? "compra" : "premio" })),
      equipment: Object.fromEntries(check(eq).map((r) => [r.slot, r.item_id])),
      rewards: check(rewards).map(toReward),
      rewardKeys: check(keys).map((r) => r.key),
      summary: toSummary(check(summary) as unknown as SummaryJson),
      shop: check(shop),
      hydration: h
        ? {
            ageRange: h.age_range as HydrationProfile["ageRange"],
            weightKg: Number(h.weight_kg),
            exerciseMinutes: h.exercise_minutes as HydrationProfile["exerciseMinutes"],
            intensity: (h.exercise_intensity as HydrationProfile["intensity"]) ?? null,
            heat: h.heat as HydrationProfile["heat"],
            methodVersion: h.method_version,
            recommendedBaseMl: h.recommended_base_ml,
            recommendedExtraMl: h.recommended_extra_ml,
            updatedAt: h.updated_at,
          }
        : null,
      dayGoals: Object.fromEntries((ok(goals) ?? []).map((g) => [g.day, g.base_ml + (g.training ? g.extra_ml : 0)])),
    };
  }

  async summary() {
    return toSummary(check(await this.sb.rpc("game_summary")) as unknown as SummaryJson);
  }

  async updateProfile(patch: Parameters<Backend["updateProfile"]>[0]) {
    const id = await this.uid();
    const row: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.timezone !== undefined) row.timezone = patch.timezone;
    if (patch.goalMl !== undefined) row.goal_ml = patch.goalMl;
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    if (patch.reduceMotion !== undefined) row.reduce_motion = patch.reduceMotion;
    if (patch.selectedBottleId !== undefined) row.selected_bottle_id = patch.selectedBottleId;
    if (patch.trainingExtraMl !== undefined) row.training_extra_ml = patch.trainingExtraMl;
    if (patch.goalSource !== undefined) row.goal_source = patch.goalSource;
    ok(await this.sb.from("profiles").update(row).eq("id", id));
    if (patch.timezone) this.tz = patch.timezone;
  }

  async setTrainingToday(training: boolean) {
    ok(await this.sb.rpc("set_training_today", { p_training: training }));
  }

  async saveHydration(h: Omit<HydrationProfile, "updatedAt"> | null) {
    const id = await this.uid();
    if (!h) {
      ok(await this.sb.from("hydration_profiles").delete().eq("user_id", id));
      return;
    }
    ok(
      await this.sb.from("hydration_profiles").upsert({
        user_id: id,
        age_range: h.ageRange,
        weight_kg: h.weightKg,
        exercise_minutes: h.exerciseMinutes,
        exercise_intensity: h.exerciseMinutes ? h.intensity : null,
        heat: h.heat,
        method_version: h.methodVersion,
        recommended_base_ml: h.recommendedBaseMl,
        recommended_extra_ml: h.recommendedExtraMl,
      }),
    );
  }

  async savePet(pet: Pet) {
    const id = await this.uid();
    ok(await this.sb.from("pets").upsert({ user_id: id, species: pet.species, name: pet.name, color: pet.color }));
  }

  async addBottle(id: string, input: BottleInput) {
    const row = check(
      await this.sb
        .from("bottles")
        .insert({ id, name: input.name.trim(), capacity_ml: input.capacityMl, default_amount_ml: input.defaultAmountMl, color: input.color })
        .select()
        .single(),
    );
    return toBottle(row);
  }

  async updateBottle(id: string, input: BottleInput) {
    const row = check(
      await this.sb
        .from("bottles")
        .update({ name: input.name.trim(), capacity_ml: input.capacityMl, default_amount_ml: input.defaultAmountMl })
        .eq("id", id)
        .select()
        .single(),
    );
    return toBottle(row);
  }

  async deleteBottle(id: string) {
    ok(await this.sb.from("bottles").update({ deleted_at: new Date().toISOString() }).eq("id", id));
  }

  async addEntry(e: { clientKey: string; amountMl: number; source: "manual" | "nfc"; bottleId: string | null }) {
    const res = await this.sb
      .from("intake_entries")
      .insert({ client_key: e.clientKey, amount_ml: e.amountMl, source: e.source, bottle_id: e.bottleId })
      .select()
      .single();
    if (res.error?.code === "23505") {
      // Reintento del mismo registro (doble toque / red lenta): devolver el que ya existe
      const again = check(await this.sb.from("intake_entries").select("*").eq("client_key", e.clientKey).single());
      return toEntry(again, this.tz);
    }
    return toEntry(check(res), this.tz);
  }

  async deleteEntry(id: string) {
    ok(await this.sb.from("intake_entries").delete().eq("id", id));
  }

  async claimRewards() {
    const data = ok(await this.sb.rpc("claim_rewards"));
    return (data ?? []).map(toReward);
  }

  async buy(itemId: string, requestId: string) {
    ok(await this.sb.rpc("buy_item", { p_item_id: itemId, p_request_id: requestId }));
  }

  async equip(slot: string, itemId: string | null) {
    const id = await this.uid();
    if (itemId) ok(await this.sb.from("pet_equipment").upsert({ user_id: id, slot, item_id: itemId }));
    else ok(await this.sb.from("pet_equipment").delete().eq("slot", slot));
  }

  async importLocal(payload: ImportPayload) {
    const data = check(await this.sb.rpc("import_local", { p_payload: payload as unknown as Database["public"]["Functions"]["import_local"]["Args"]["p_payload"] }));
    return data as unknown as ImportResult;
  }
}
