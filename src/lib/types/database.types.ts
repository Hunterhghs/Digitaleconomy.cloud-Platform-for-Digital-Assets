/**
 * Hand-written Supabase Database type that mirrors `supabase/migrations/*.sql`.
 * Regenerate with `supabase gen types typescript --project-id <ref> > src/lib/types/database.types.ts`
 * once you have a Supabase project linked.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AssetStatus = "draft" | "published" | "removed";
export type AssetLicense = "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "ARR";
export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";
export type AppRole = "user" | "moderator" | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          links: Json | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          links?: Json | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          description: string | null;
          category_id: string | null;
          license: AssetLicense;
          status: AssetStatus;
          file_path: string;
          mime_type: string;
          size_bytes: number;
          thumbnail_path: string | null;
          download_count: number;
          view_count: number;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          slug: string;
          description?: string | null;
          category_id?: string | null;
          license?: AssetLicense;
          status?: AssetStatus;
          file_path: string;
          mime_type: string;
          size_bytes: number;
          thumbnail_path?: string | null;
          download_count?: number;
          view_count?: number;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "assets_owner_id_fkey"; columns: ["owner_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "assets_category_id_fkey"; columns: ["category_id"]; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      asset_tags: {
        Row: { asset_id: string; tag_id: string };
        Insert: { asset_id: string; tag_id: string };
        Update: Partial<{ asset_id: string; tag_id: string }>;
        Relationships: [];
      };
      likes: {
        Row: { user_id: string; asset_id: string; created_at: string };
        Insert: { user_id: string; asset_id: string; created_at?: string };
        Update: Partial<{ user_id: string; asset_id: string; created_at: string }>;
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      collection_items: {
        Row: { collection_id: string; asset_id: string; position: number; added_at: string };
        Insert: { collection_id: string; asset_id: string; position?: number; added_at?: string };
        Update: Partial<{ collection_id: string; asset_id: string; position: number }>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          asset_id: string;
          reporter_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          resolution_note: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          asset_id: string;
          reporter_id?: string | null;
          reason: string;
          details?: string | null;
          status?: ReportStatus;
          resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      asset_downloads: {
        Row: { id: number; asset_id: string; user_id: string | null; created_at: string };
        Insert: { id?: number; asset_id: string; user_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["asset_downloads"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_download_count: { Args: { p_asset_id: string }; Returns: number };
      toggle_like: { Args: { p_asset_id: string }; Returns: boolean };
    };
    Enums: {
      asset_status: AssetStatus;
      asset_license: AssetLicense;
      report_status: ReportStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Asset = Tables<"assets">;
export type Category = Tables<"categories">;
export type Tag = Tables<"tags">;
export type Report = Tables<"reports">;
export type Collection = Tables<"collections">;
