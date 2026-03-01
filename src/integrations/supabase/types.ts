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
          sort_order: number | null
          title: string
          url: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          sort_order?: number | null
          title: string
          url: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          sort_order?: number | null
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
          timeline_id: string | null
          title: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_public?: boolean
          timeline_id?: string | null
          title: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_public?: boolean
          timeline_id?: string | null
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
          {
            foreignKeyName: "artist_milestones_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "artist_timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_performance_snapshots: {
        Row: {
          artist_id: string
          created_at: string
          daily_streams: number | null
          est_monthly_revenue: number | null
          feat_streams_total: number | null
          id: string
          lead_streams_total: number | null
          monthly_listeners_all: number | null
          monthly_streams: number | null
          raw_markdown: string | null
          scraped_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          daily_streams?: number | null
          est_monthly_revenue?: number | null
          feat_streams_total?: number | null
          id?: string
          lead_streams_total?: number | null
          monthly_listeners_all?: number | null
          monthly_streams?: number | null
          raw_markdown?: string | null
          scraped_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          daily_streams?: number | null
          est_monthly_revenue?: number | null
          feat_streams_total?: number | null
          id?: string
          lead_streams_total?: number | null
          monthly_listeners_all?: number | null
          monthly_streams?: number | null
          raw_markdown?: string | null
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_performance_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
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
      artist_timelines: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_timelines_artist_id_fkey"
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
          agenda_is_public: boolean
          agenda_public_token: string | null
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          folder_id: string | null
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
          agenda_is_public?: boolean
          agenda_public_token?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          folder_id?: string | null
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
          agenda_is_public?: boolean
          agenda_public_token?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          folder_id?: string | null
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
            foreignKeyName: "artists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "roster_folders"
            referencedColumns: ["id"]
          },
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
      company_budget_categories: {
        Row: {
          annual_budget: number
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          annual_budget?: number
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          annual_budget?: number
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_budget_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          recurrence_period: string | null
          team_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          recurrence_period?: string | null
          team_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          recurrence_period?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "company_budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_expenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_entities: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          is_custom: boolean
          name: string
          source: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          is_custom?: boolean
          name: string
          source?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          is_custom?: boolean
          name?: string
          source?: string
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
          is_archived: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
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
          add_to_staff: boolean
          artist_permissions: Json | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          staff_employment_type: string | null
          team_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          add_to_staff?: boolean
          artist_permissions?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_employment_type?: string | null
          team_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          add_to_staff?: boolean
          artist_permissions?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_employment_type?: string | null
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
      milestone_folders: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          milestone_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          milestone_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_folders_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "artist_link_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_folders_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "artist_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_links: {
        Row: {
          created_at: string
          id: string
          link_id: string
          milestone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
          milestone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
          milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_links_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "artist_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_links_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "artist_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_listener_history: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          monthly_listeners: number | null
          recorded_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          monthly_listeners?: number | null
          recorded_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          monthly_listeners?: number | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_listener_history_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "user_notes"
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
      prospect_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          prospect_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          prospect_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          prospect_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_deals: {
        Row: {
          accounting_frequency: string | null
          advance: number | null
          created_at: string
          deal_status: Database["public"]["Enums"]["deal_status"]
          deal_type: Database["public"]["Enums"]["deal_type"] | null
          exclusivity: string | null
          id: string
          notes: string | null
          prospect_id: string
          term_length: string | null
          territory: string | null
          type_specific_terms: Json | null
          updated_at: string
        }
        Insert: {
          accounting_frequency?: string | null
          advance?: number | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          deal_type?: Database["public"]["Enums"]["deal_type"] | null
          exclusivity?: string | null
          id?: string
          notes?: string | null
          prospect_id: string
          term_length?: string | null
          territory?: string | null
          type_specific_terms?: Json | null
          updated_at?: string
        }
        Update: {
          accounting_frequency?: string | null
          advance?: number | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          deal_type?: Database["public"]["Enums"]["deal_type"] | null
          exclusivity?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string
          term_length?: string | null
          territory?: string | null
          type_specific_terms?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_deals_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_engagements: {
        Row: {
          created_at: string
          engagement_date: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id: string
          next_step: string | null
          outcome: string | null
          owner_id: string | null
          prospect_id: string
        }
        Insert: {
          created_at?: string
          engagement_date?: string
          engagement_type: Database["public"]["Enums"]["engagement_type"]
          id?: string
          next_step?: string | null
          outcome?: string | null
          owner_id?: string | null
          prospect_id: string
        }
        Update: {
          created_at?: string
          engagement_date?: string
          engagement_type?: Database["public"]["Enums"]["engagement_type"]
          id?: string
          next_step?: string | null
          outcome?: string | null
          owner_id?: string | null
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_engagements_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          artist_name: string
          avatar_url: string | null
          city: string | null
          created_at: string
          id: string
          instagram: string | null
          key_songs: string[] | null
          monthly_listeners: number | null
          next_follow_up: string | null
          notes: string | null
          owner_id: string | null
          primary_genre: string | null
          priority: Database["public"]["Enums"]["prospect_priority"]
          spotify_uri: string | null
          stage: Database["public"]["Enums"]["prospect_stage"]
          team_id: string
          tiktok: string | null
          updated_at: string
          youtube: string | null
        }
        Insert: {
          artist_name: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          key_songs?: string[] | null
          monthly_listeners?: number | null
          next_follow_up?: string | null
          notes?: string | null
          owner_id?: string | null
          primary_genre?: string | null
          priority?: Database["public"]["Enums"]["prospect_priority"]
          spotify_uri?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          team_id: string
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Update: {
          artist_name?: string
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          key_songs?: string[] | null
          monthly_listeners?: number | null
          next_follow_up?: string | null
          notes?: string | null
          owner_id?: string | null
          primary_genre?: string | null
          priority?: Database["public"]["Enums"]["prospect_priority"]
          spotify_uri?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          team_id?: string
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_folders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_employment: {
        Row: {
          annual_salary: number | null
          created_at: string
          employee_state: string | null
          employment_type: string
          id: string
          job_title: string | null
          monthly_retainer: number | null
          payment_schedule: string | null
          start_date: string | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_salary?: number | null
          created_at?: string
          employee_state?: string | null
          employment_type?: string
          id?: string
          job_title?: string | null
          monthly_retainer?: number | null
          payment_schedule?: string | null
          start_date?: string | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_salary?: number | null
          created_at?: string
          employee_state?: string | null
          employment_type?: string
          id?: string
          job_title?: string | null
          monthly_retainer?: number | null
          payment_schedule?: string | null
          start_date?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_employment_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          annual_budget: number | null
          avatar_url: string | null
          company_type: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          annual_budget?: number | null
          avatar_url?: string | null
          company_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          annual_budget?: number | null
          avatar_url?: string | null
          company_type?: string | null
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
          category_id: string | null
          created_at: string
          description: string
          id: string
          initiative_id: string | null
          status: string
          task_id: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount?: number
          artist_id: string
          budget_id?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          initiative_id?: string | null
          status?: string
          task_id?: string | null
          transaction_date?: string
          type?: string
        }
        Update: {
          amount?: number
          artist_id?: string
          budget_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          initiative_id?: string | null
          status?: string
          task_id?: string | null
          transaction_date?: string
          type?: string
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
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          team_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      get_milestone_artist_id: {
        Args: { p_milestone_id: string }
        Returns: string
      }
      get_prospect_team_id: { Args: { p_prospect_id: string }; Returns: string }
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
      deal_status:
        | "not_discussed"
        | "discussing"
        | "offer_sent"
        | "under_negotiation"
        | "signed"
        | "passed"
      deal_type:
        | "distribution"
        | "frontline_record"
        | "partnership"
        | "publishing"
        | "management"
      engagement_type:
        | "call"
        | "email"
        | "dm"
        | "meeting"
        | "show"
        | "intro"
        | "deal_sent"
      permission_level: "no_access" | "view_access" | "full_access"
      prospect_priority: "low" | "medium" | "high"
      prospect_stage:
        | "discovered"
        | "contacted"
        | "in_conversation"
        | "materials_requested"
        | "internal_review"
        | "offer_sent"
        | "negotiating"
        | "signed"
        | "passed"
        | "on_hold"
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
      deal_status: [
        "not_discussed",
        "discussing",
        "offer_sent",
        "under_negotiation",
        "signed",
        "passed",
      ],
      deal_type: [
        "distribution",
        "frontline_record",
        "partnership",
        "publishing",
        "management",
      ],
      engagement_type: [
        "call",
        "email",
        "dm",
        "meeting",
        "show",
        "intro",
        "deal_sent",
      ],
      permission_level: ["no_access", "view_access", "full_access"],
      prospect_priority: ["low", "medium", "high"],
      prospect_stage: [
        "discovered",
        "contacted",
        "in_conversation",
        "materials_requested",
        "internal_review",
        "offer_sent",
        "negotiating",
        "signed",
        "passed",
        "on_hold",
      ],
    },
  },
} as const
