// Generado desde Supabase (proyecto H2O-HIDRA). No editar a mano:
// regenerar tras cada migración con el MCP de Supabase o `supabase gen types typescript`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      bottles: {
        Row: {
          capacity_ml: number;
          color: string;
          created_at: string;
          default_amount_ml: number;
          deleted_at: string | null;
          id: string;
          name: string;
          tag_linked_at: string | null;
          user_id: string;
        };
        Insert: {
          capacity_ml: number;
          color?: string;
          created_at?: string;
          default_amount_ml: number;
          deleted_at?: string | null;
          id: string;
          name: string;
          tag_linked_at?: string | null;
          user_id?: string;
        };
        Update: {
          capacity_ml?: number;
          color?: string;
          default_amount_ml?: number;
          deleted_at?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      intake_entries: {
        Row: {
          amount_ml: number;
          bottle_id: string | null;
          bottle_name: string | null;
          client_key: string;
          created_at: string;
          id: string;
          imported: boolean;
          local_date: string;
          logged_at: string;
          source: string;
          user_id: string;
        };
        Insert: {
          amount_ml: number;
          bottle_id?: string | null;
          client_key: string;
          local_date?: string;
          source: string;
        };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      inventory: {
        Row: { acquired_at: string; item_id: string; source: string; user_id: string };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      pet_equipment: {
        Row: { item_id: string; slot: string; user_id: string };
        Insert: { item_id: string; slot: string; user_id?: string };
        Update: { item_id?: string; slot?: string };
        Relationships: [];
      };
      pets: {
        Row: { color: string; created_at: string; name: string; species: string; user_id: string };
        Insert: { color?: string; name: string; species: string; user_id?: string };
        Update: { color?: string; name?: string; species?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          goal_ml: number;
          id: string;
          local_import_done_at: string | null;
          onboarded: boolean;
          reduce_motion: boolean;
          selected_bottle_id: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: { id: string };
        Update: {
          display_name?: string | null;
          goal_ml?: number;
          onboarded?: boolean;
          reduce_motion?: boolean;
          selected_bottle_id?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      reward_events: {
        Row: {
          created_at: string;
          gotitas: number;
          id: number;
          key: string;
          kind: string;
          label: string;
          shields: number;
          user_id: string;
          xp: number;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      shop_items: {
        Row: {
          active: boolean;
          brand: string;
          id: string;
          name: string;
          price: number;
          purchasable: boolean;
          rarity: string;
          slot: string;
          sort: number;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      streak_freezes: {
        Row: { created_at: string; day: string; user_id: string };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      buy_item: { Args: { p_item_id: string; p_request_id: string }; Returns: Json };
      claim_rewards: {
        Args: never;
        Returns: Database["public"]["Tables"]["reward_events"]["Row"][];
      };
      game_summary: { Args: never; Returns: Json };
      import_local: { Args: { p_payload: Json }; Returns: Json };
      level_for_xp: { Args: { p_xp: number }; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
