export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string
          awarded_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          awarded_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          awarded_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_classifications: {
        Row: {
          character: string
          classification_result: Json
          confidence: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          processing_time_ms: number | null
          recording_id: string | null
          session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          character: string
          classification_result: Json
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          processing_time_ms?: number | null
          recording_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          character?: string
          classification_result?: Json
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          processing_time_ms?: number | null
          recording_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_classifications_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_classifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_sessions: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          sessions: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          sessions: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          sessions?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          current_progress: number
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          current_progress?: number
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          current_progress?: number
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      character_mastery: {
        Row: {
          ai_evaluation_history: Json | null
          attempts: number | null
          character: string
          id: string
          is_mastered: boolean | null
          last_success_time: string | null
          mastery_count: number | null
          mastery_level: number | null
          stage: string | null
          successes: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          ai_evaluation_history?: Json | null
          attempts?: number | null
          character: string
          id?: string
          is_mastered?: boolean | null
          last_success_time?: string | null
          mastery_count?: number | null
          mastery_level?: number | null
          stage?: string | null
          successes?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          ai_evaluation_history?: Json | null
          attempts?: number | null
          character?: string
          id?: string
          is_mastered?: boolean | null
          last_success_time?: string | null
          mastery_count?: number | null
          mastery_level?: number | null
          stage?: string | null
          successes?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collected_mojitama: {
        Row: {
          character: string
          collected_at: string | null
          id: string
          power: number | null
          rarity: string | null
          user_id: string
        }
        Insert: {
          character: string
          collected_at?: string | null
          id?: string
          power?: number | null
          rarity?: string | null
          user_id: string
        }
        Update: {
          character?: string
          collected_at?: string | null
          id?: string
          power?: number | null
          rarity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          created_at: string | null
          description: string
          expires_at: string
          id: string
          reward: Json
          target: number
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          expires_at: string
          id: string
          reward: Json
          target: number
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          expires_at?: string
          id?: string
          reward?: Json
          target?: number
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      initial_test_results: {
        Row: {
          accuracy: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          level: string
          results: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          level: string
          results: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          level?: string
          results?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          accuracy_rate: number | null
          character_data: Json | null
          characters_practiced: number | null
          completed_at: string | null
          correct_attempts: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          session_data: Json | null
          session_date: string | null
          session_type: string | null
          stage: string | null
          total_attempts: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          character_data?: Json | null
          characters_practiced?: number | null
          completed_at?: string | null
          correct_attempts?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          session_data?: Json | null
          session_date?: string | null
          session_type?: string | null
          stage?: string | null
          total_attempts?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          character_data?: Json | null
          characters_practiced?: number | null
          completed_at?: string | null
          correct_attempts?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          session_data?: Json | null
          session_date?: string | null
          session_type?: string | null
          stage?: string | null
          total_attempts?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          login_date: string
          login_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          login_date?: string
          login_time?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          login_date?: string
          login_time?: string
          user_id?: string
        }
        Relationships: []
      }
      login_streak: {
        Row: {
          created_at: string | null
          current_streak: number
          last_login_date: string
          longest_streak: number
          total_logins: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          last_login_date?: string
          longest_streak?: number
          total_logins?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          last_login_date?: string
          longest_streak?: number
          total_logins?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          ai_result: Json | null
          character: string
          created_at: string | null
          id: string
          response_time_ms: number | null
          session_id: string | null
          stage: string
          storage_url: string
          user_id: string | null
        }
        Insert: {
          ai_result?: Json | null
          character: string
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          session_id?: string | null
          stage: string
          storage_url: string
          user_id?: string | null
        }
        Update: {
          ai_result?: Json | null
          character?: string
          created_at?: string | null
          id?: string
          response_time_ms?: number | null
          session_id?: string | null
          stage?: string
          storage_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      session_state: {
        Row: {
          stage_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          stage_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          stage_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_stats: {
        Row: {
          average_accuracy: number | null
          created_at: string | null
          experience: number | null
          last_training_date: string | null
          level: string | null
          longest_streak: number | null
          streak_count: number | null
          total_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_accuracy?: number | null
          created_at?: string | null
          experience?: number | null
          last_training_date?: string | null
          level?: string | null
          longest_streak?: number | null
          streak_count?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_accuracy?: number | null
          created_at?: string | null
          experience?: number | null
          last_training_date?: string | null
          level?: string | null
          longest_streak?: number | null
          streak_count?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          acquired_at: string | null
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acquired_at?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          character_exp: number | null
          character_level: string | null
          character_type: string | null
          coins: number
          created_at: string
          current_level: string | null
          display_name: string
          gender: string | null
          id: string
          is_anonymous: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          character_exp?: number | null
          character_level?: string | null
          character_type?: string | null
          coins?: number
          created_at?: string
          current_level?: string | null
          display_name: string
          gender?: string | null
          id?: string
          is_anonymous?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          character_exp?: number | null
          character_level?: string | null
          character_type?: string | null
          coins?: number
          created_at?: string
          current_level?: string | null
          display_name?: string
          gender?: string | null
          id?: string
          is_anonymous?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stage_progress: {
        Row: {
          created_at: string | null
          id: string
          progress: Json
          stage_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          progress: Json
          stage_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          progress?: Json
          stage_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_test_results: {
        Row: {
          average_time: number | null
          correct_rate: number | null
          created_at: string | null
          dakuon_avg: number | null
          determined_level: string | null
          id: string
          results: Json
          seion_avg: number | null
          updated_at: string | null
          user_id: string
          yoon_avg: number | null
        }
        Insert: {
          average_time?: number | null
          correct_rate?: number | null
          created_at?: string | null
          dakuon_avg?: number | null
          determined_level?: string | null
          id?: string
          results: Json
          seion_avg?: number | null
          updated_at?: string | null
          user_id: string
          yoon_avg?: number | null
        }
        Update: {
          average_time?: number | null
          correct_rate?: number | null
          created_at?: string | null
          dakuon_avg?: number | null
          determined_level?: string | null
          id?: string
          results?: Json
          seion_avg?: number | null
          updated_at?: string | null
          user_id?: string
          yoon_avg?: number | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const