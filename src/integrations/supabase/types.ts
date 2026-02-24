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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artist_clothing: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          member_name: string | null
          notes: string | null
          pant_size: string | null
          shirt_size: string | null
          shoe_size: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          member_name?: string | null
          notes?: string | null
          pant_size?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          member_name?: string | null
          notes?: string | null
          pant_size?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_clothing_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_contacts: {
        Row: {
          artist_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_contacts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_link_folders: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_public: boolean
          name: string
          public_token: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          public_token?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          public_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_link_folders_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_links: {
        Row: {
          artist_id: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          title: string
          url: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          title: string
          url: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_links_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "artist_link_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_milestones: {
        Row: {
          artist_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          is_public: boolean
          title: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_public?: boolean
          title: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_milestones_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_permissions: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["permission_level"]
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_level"]
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_level"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_permissions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_travel_info: {
        Row: {
          artist_id: string
          created_at: string
          date_of_birth: string | null
          dietary_restrictions: string | null
          distributor: string | null
          dress_size: string | null
          drivers_license: string | null
          favorite_brands: string | null
          first_name: string | null
          hat_size: string | null
          id: string
          ipi_number: string | null
          is_public: boolean
          isni: string | null
          ktn_number: string | null
          last_name: string | null
          member_name: string | null
          notes: string | null
          pant_size: string | null
          passport_name: string | null
          preferred_airline: string | null
          preferred_seat: string | null
          pro_name: string | null
          public_token: string | null
          publisher_name: string | null
          publisher_pro: string | null
          publishing_admin: string | null
          record_label: string | null
          shirt_size: string | null
          shoe_size: string | null
          spotify_uri: string | null
          tsa_precheck_number: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          distributor?: string | null
          dress_size?: string | null
          drivers_license?: string | null
          favorite_brands?: string | null
          first_name?: string | null
          hat_size?: string | null
          id?: string
          ipi_number?: string | null
          is_public?: boolean
          isni?: string | null
          ktn_number?: string | null
          last_name?: string | null
          member_name?: string | null
          notes?: string | null
          pant_size?: string | null
          passport_name?: string | null
          preferred_airline?: string | null
          preferred_seat?: string | null
          pro_name?: string | null
          public_token?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          publishing_admin?: string | null
          record_label?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          spotify_uri?: string | null
          tsa_precheck_number?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          distributor?: string | null
          dress_size?: string | null
          drivers_license?: string | null
          favorite_brands?: string | null
          first_name?: string | null
          hat_size?: string | null
          id?: string
          ipi_number?: string | null
          is_public?: boolean
          isni?: string | null
          ktn_number?: string | null
          last_name?: string | null
          member_name?: string | null
          notes?: string | null
          pant_size?: string | null
          passport_name?: string | null
          preferred_airline?: string | null
          preferred_seat?: string | null
          pro_name?: string | null
          public_token?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          publishing_admin?: string | null
          record_label?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          spotify_uri?: string | null
          tsa_precheck_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_travel_info_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          genres: string[] | null
          id: string
          monthly_listeners: number | null
          name: string
          primary_focus: string | null
          primary_goal: string | null
          primary_metric: string | null
          secondary_focus: string | null
          secondary_goal: string | null
          secondary_metric: string | null
          spotify_id: string | null
          team_id: string
          timeline_is_public: boolean
          timeline_public_token: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name: string
          primary_focus?: string | null
          primary_goal?: string | null
          primary_metric?: string | null
          secondary_focus?: string | null
          secondary_goal?: string | null
          secondary_metric?: string | null
          spotify_id?: string | null
          team_id: string
          timeline_is_public?: boolean
          timeline_public_token?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name?: string
          primary_focus?: string | null
          primary_goal?: string | null
          primary_metric?: string | null
          secondary_focus?: string | null
          secondary_goal?: string | null
          secondary_metric?: string | null
          spotify_id?: string | null
          team_id?: string
          timeline_is_public?: boolean
          timeline_public_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          amount?: number
          artist_id: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      clothing_brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          artist_permissions: Json | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          artist_permissions?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          artist_permissions?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          milestone_email: boolean
          milestone_sms: boolean
          task_assigned_email: boolean
          task_assigned_sms: boolean
          task_due_soon_email: boolean
          task_due_soon_sms: boolean
          task_overdue_email: boolean
          task_overdue_sms: boolean
          user_id: string
          weekly_summary_email: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_email?: boolean
          milestone_sms?: boolean
          task_assigned_email?: boolean
          task_assigned_sms?: boolean
          task_due_soon_email?: boolean
          task_due_soon_sms?: boolean
          task_overdue_email?: boolean
          task_overdue_sms?: boolean
          user_id: string
          weekly_summary_email?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          milestone_email?: boolean
          milestone_sms?: boolean
          task_assigned_email?: boolean
          task_assigned_sms?: boolean
          task_due_soon_email?: boolean
          task_due_soon_sms?: boolean
          task_overdue_email?: boolean
          task_overdue_sms?: boolean
          user_id?: string
          weekly_summary_email?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          job_role: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_role?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_role?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          artist_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          expense_amount: number | null
          id: string
          initiative_id: string | null
          is_completed: boolean
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          expense_amount?: number | null
          id?: string
          initiative_id?: string | null
          is_completed?: boolean
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          expense_amount?: number | null
          id?: string
          initiative_id?: string | null
          is_completed?: boolean
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          artist_id: string
          budget_id: string | null
          created_at: string
          description: string
          id: string
          transaction_date: string
        }
        Insert: {
          amount?: number
          artist_id: string
          budget_id?: string | null
          created_at?: string
          description: string
          id?: string
          transaction_date?: string
        }
        Update: {
          amount?: number
          artist_id?: string
          budget_id?: string | null
          created_at?: string
          description?: string
          id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_artist_team_id: { Args: { p_artist_id: string }; Returns: string }
      get_link_folder_artist_id: {
        Args: { p_folder_id: string }
        Returns: string
      }
      has_artist_access: {
        Args: {
          p_artist_id: string
          p_min_level: Database["public"]["Enums"]["permission_level"]
        }
        Returns: boolean
      }
      is_link_folder_public: { Args: { p_folder_id: string }; Returns: boolean }
      is_member_info_public: { Args: { p_member_id: string }; Returns: boolean }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      is_team_owner_or_manager: {
        Args: { p_team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "team_owner" | "manager" | "artist"
      permission_level: "no_access" | "view_access" | "full_access"
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
    Enums: {
      app_role: ["team_owner", "manager", "artist"],
      permission_level: ["no_access", "view_access", "full_access"],
    },
  },
} as const
