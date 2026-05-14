export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_scores: {
        Row: {
          created_at: string
          daily_date: string
          id: string
          score: number
          seed: string
          time_seconds: number
          user_id: string
          won: boolean
        }
        Insert: {
          created_at?: string
          daily_date: string
          id?: string
          score?: number
          seed: string
          time_seconds?: number
          user_id: string
          won?: boolean
        }
        Update: {
          created_at?: string
          daily_date?: string
          id?: string
          score?: number
          seed?: string
          time_seconds?: number
          user_id?: string
          won?: boolean
        }
        Relationships: []
      }
      game_history: {
        Row: {
          created_at: string
          difficulty: string
          hints_used: number
          id: string
          layout: string
          moves: number
          province: number
          score: number
          seed: string | null
          theme: string | null
          time_seconds: number
          user_id: string
          won: boolean
        }
        Insert: {
          created_at?: string
          difficulty: string
          hints_used?: number
          id?: string
          layout: string
          moves?: number
          province?: number
          score?: number
          seed?: string | null
          theme?: string | null
          time_seconds?: number
          user_id: string
          won?: boolean
        }
        Update: {
          created_at?: string
          difficulty?: string
          hints_used?: number
          id?: string
          layout?: string
          moves?: number
          province?: number
          score?: number
          seed?: string | null
          theme?: string | null
          time_seconds?: number
          user_id?: string
          won?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          best_daily_streak: number
          best_streak: number
          city: string | null
          created_at: string
          current_streak: number
          daily_streak: number
          display_name: string | null
          id: string
          is_pro: boolean
          last_difficulty: string | null
          last_layout: string | null
          last_played_date: string | null
          last_province: number | null
          last_theme: string | null
          province: number
          rank: string
          total_games: number
          total_wins: number
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          best_daily_streak?: number
          best_streak?: number
          city?: string | null
          created_at?: string
          current_streak?: number
          daily_streak?: number
          display_name?: string | null
          id: string
          is_pro?: boolean
          last_difficulty?: string | null
          last_layout?: string | null
          last_played_date?: string | null
          last_province?: number | null
          last_theme?: string | null
          province?: number
          rank?: string
          total_games?: number
          total_wins?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          best_daily_streak?: number
          best_streak?: number
          city?: string | null
          created_at?: string
          current_streak?: number
          daily_streak?: number
          display_name?: string | null
          id?: string
          is_pro?: boolean
          last_difficulty?: string | null
          last_layout?: string | null
          last_played_date?: string | null
          last_province?: number | null
          last_theme?: string | null
          province?: number
          rank?: string
          total_games?: number
          total_wins?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      user_unlocks: {
        Row: {
          id: string
          item_id: string
          item_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          item_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
