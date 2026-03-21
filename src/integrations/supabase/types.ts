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
      access_requests: {
        Row: {
          created_at: string | null
          detail: Json
          id: string
          request_type: string
          requester_id: string
          reviewed_by: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: Json
          id?: string
          request_type: string
          requester_id: string
          reviewed_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: Json
          id?: string
          request_type?: string
          requester_id?: string
          reviewed_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
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
          folder_sort_order: number | null
          genres: string[] | null
          id: string
          monthly_listeners: number | null
          name: string
          objective_1_target: number | null
          objective_1_type: string | null
          objective_2_target: number | null
          objective_2_type: string | null
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
          folder_sort_order?: number | null
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name: string
          objective_1_target?: number | null
          objective_1_type?: string | null
          objective_2_target?: number | null
          objective_2_type?: string | null
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
          folder_sort_order?: number | null
          genres?: string[] | null
          id?: string
          monthly_listeners?: number | null
          name?: string
          objective_1_target?: number | null
          objective_1_type?: string | null
          objective_2_target?: number | null
          objective_2_type?: string | null
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
      brand_alert_artist_matches: {
        Row: {
          alert_id: string
          artist_id: string
          artist_name: string
          created_at: string
          id: string
        }
        Insert: {
          alert_id: string
          artist_id: string
          artist_name: string
          created_at?: string
          id?: string
        }
        Update: {
          alert_id?: string
          artist_id?: string
          artist_name?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_alert_artist_matches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "brand_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_alert_artist_matches_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_alerts: {
        Row: {
          brand_name: string
          created_at: string
          detected_at: string
          drop_type: string
          headline: string
          id: string
          image_url: string | null
          is_read: boolean
          team_id: string
          url: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          detected_at?: string
          drop_type?: string
          headline: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          team_id: string
          url?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          detected_at?: string
          drop_type?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          team_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_alerts_team_id_fkey"
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
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          team_id: string | null
          team_size: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          team_id?: string | null
          team_size?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          team_id?: string | null
          team_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_intelligence: {
        Row: {
          artist_affinity: string[] | null
          audience_type: string | null
          average_views: number | null
          category: string | null
          confidence_label: string
          confidence_score: number
          contact_info: string | null
          content_style: string | null
          created_at: string
          engagement_rate: number | null
          follower_count: number | null
          genre_fit: string[] | null
          handle: string
          historical_campaigns: Json | null
          id: string
          last_verified_date: string | null
          median_views: number | null
          notes: string | null
          platform: string
          posting_frequency: string | null
          rate: string | null
          search_vector: unknown
          source: string
          subcategory: string | null
          team_id: string | null
          url: string | null
        }
        Insert: {
          artist_affinity?: string[] | null
          audience_type?: string | null
          average_views?: number | null
          category?: string | null
          confidence_label?: string
          confidence_score?: number
          contact_info?: string | null
          content_style?: string | null
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          genre_fit?: string[] | null
          handle: string
          historical_campaigns?: Json | null
          id?: string
          last_verified_date?: string | null
          median_views?: number | null
          notes?: string | null
          platform: string
          posting_frequency?: string | null
          rate?: string | null
          search_vector?: unknown
          source?: string
          subcategory?: string | null
          team_id?: string | null
          url?: string | null
        }
        Update: {
          artist_affinity?: string[] | null
          audience_type?: string | null
          average_views?: number | null
          category?: string | null
          confidence_label?: string
          confidence_score?: number
          contact_info?: string | null
          content_style?: string | null
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          genre_fit?: string[] | null
          handle?: string
          historical_campaigns?: Json | null
          id?: string
          last_verified_date?: string | null
          median_views?: number | null
          notes?: string | null
          platform?: string
          posting_frequency?: string | null
          rate?: string | null
          search_vector?: unknown
          source?: string
          subcategory?: string | null
          team_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_intelligence_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      education_content: {
        Row: {
          concept_key: string
          created_at: string | null
          detailed_explanation: string | null
          example: string | null
          id: string
          related_concepts: string[] | null
          simple_explanation: string
          title: string
        }
        Insert: {
          concept_key: string
          created_at?: string | null
          detailed_explanation?: string | null
          example?: string | null
          id?: string
          related_concepts?: string[] | null
          simple_explanation: string
          title: string
        }
        Update: {
          concept_key?: string
          created_at?: string | null
          detailed_explanation?: string | null
          example?: string | null
          id?: string
          related_concepts?: string[] | null
          simple_explanation?: string
          title?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          ai_category: string | null
          ai_priority: string | null
          ai_summary: string | null
          created_at: string
          id: string
          message: string
          page_url: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          team_id: string
          type: Database["public"]["Enums"]["feedback_type"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_category?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          team_id: string
          type?: Database["public"]["Enums"]["feedback_type"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_category?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          team_id?: string
          type?: Database["public"]["Enums"]["feedback_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_team_id_fkey"
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
          assists_user_id: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invitee_email: string | null
          invitee_job_title: string | null
          invitee_name: string | null
          invitee_phone: string | null
          perm_distribution: boolean | null
          perm_edit_artists: boolean
          perm_manage_finance: boolean
          perm_view_ar: boolean
          perm_view_billing: boolean
          perm_view_finance: boolean
          perm_view_roster: boolean
          perm_view_staff_salaries: boolean
          role: Database["public"]["Enums"]["app_role"]
          staff_employment_type: string | null
          staff_salary: number | null
          team_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          add_to_staff?: boolean
          artist_permissions?: Json | null
          assists_user_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invitee_email?: string | null
          invitee_job_title?: string | null
          invitee_name?: string | null
          invitee_phone?: string | null
          perm_distribution?: boolean | null
          perm_edit_artists?: boolean
          perm_manage_finance?: boolean
          perm_view_ar?: boolean
          perm_view_billing?: boolean
          perm_view_finance?: boolean
          perm_view_roster?: boolean
          perm_view_staff_salaries?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          staff_employment_type?: string | null
          staff_salary?: number | null
          team_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          add_to_staff?: boolean
          artist_permissions?: Json | null
          assists_user_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string | null
          invitee_job_title?: string | null
          invitee_name?: string | null
          invitee_phone?: string | null
          perm_distribution?: boolean | null
          perm_edit_artists?: boolean
          perm_manage_finance?: boolean
          perm_view_ar?: boolean
          perm_view_billing?: boolean
          perm_view_finance?: boolean
          perm_view_roster?: boolean
          perm_view_staff_salaries?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          staff_employment_type?: string | null
          staff_salary?: number | null
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
      invoice_line_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          artist_id: string | null
          created_at: string
          due_date: string | null
          footer_notes: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          recipient_email: string | null
          recipient_name: string
          status: string
          subtotal: number
          tax_rate: number
          team_id: string
          total: number
          vendor_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          due_date?: string | null
          footer_notes?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name: string
          status?: string
          subtotal?: number
          tax_rate?: number
          team_id: string
          total?: number
          vendor_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          due_date?: string | null
          footer_notes?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          recipient_email?: string | null
          recipient_name?: string
          status?: string
          subtotal?: number
          tax_rate?: number
          team_id?: string
          total?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string
          extracted_tasks: Json | null
          id: string
          raw_text: string
          source: string
          status: string
          team_id: string
          title: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by: string
          extracted_tasks?: Json | null
          id?: string
          raw_text: string
          source?: string
          status?: string
          team_id: string
          title?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string
          extracted_tasks?: Json | null
          id?: string
          raw_text?: string
          source?: string
          status?: string
          team_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_team_id_fkey"
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
          brand_alert_frequency: string
          budget_alert_email: boolean
          created_at: string
          daily_checkin_email: boolean
          id: string
          milestone_email: boolean
          milestone_sms: boolean
          new_artist_email: boolean
          preferred_notification_time: string
          push_enabled: boolean
          task_assigned_email: boolean
          task_assigned_sms: boolean
          task_completed_email: boolean
          task_due_soon_email: boolean
          task_due_soon_sms: boolean
          task_overdue_email: boolean
          task_overdue_sms: boolean
          user_id: string
          weekly_summary_email: boolean
        }
        Insert: {
          brand_alert_frequency?: string
          budget_alert_email?: boolean
          created_at?: string
          daily_checkin_email?: boolean
          id?: string
          milestone_email?: boolean
          milestone_sms?: boolean
          new_artist_email?: boolean
          preferred_notification_time?: string
          push_enabled?: boolean
          task_assigned_email?: boolean
          task_assigned_sms?: boolean
          task_completed_email?: boolean
          task_due_soon_email?: boolean
          task_due_soon_sms?: boolean
          task_overdue_email?: boolean
          task_overdue_sms?: boolean
          user_id: string
          weekly_summary_email?: boolean
        }
        Update: {
          brand_alert_frequency?: string
          budget_alert_email?: boolean
          created_at?: string
          daily_checkin_email?: boolean
          id?: string
          milestone_email?: boolean
          milestone_sms?: boolean
          new_artist_email?: boolean
          preferred_notification_time?: string
          push_enabled?: boolean
          task_assigned_email?: boolean
          task_assigned_sms?: boolean
          task_completed_email?: boolean
          task_due_soon_email?: boolean
          task_due_soon_sms?: boolean
          task_overdue_email?: boolean
          task_overdue_sms?: boolean
          user_id?: string
          weekly_summary_email?: boolean
        }
        Relationships: []
      }
      objective_snapshots: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_baseline: boolean
          objective_type: string
          recorded_at: string
          recorded_value: number | null
          slot: number
          target_value: number | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_baseline?: boolean
          objective_type: string
          recorded_at?: string
          recorded_value?: number | null
          slot: number
          target_value?: number | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_baseline?: boolean
          objective_type?: string
          recorded_at?: string
          recorded_value?: number | null
          slot?: number
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_connections: {
        Row: {
          account_email: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          member_id: string | null
          source: string
          status: string
          team_id: string
        }
        Insert: {
          account_email?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          member_id?: string | null
          source: string
          status?: string
          team_id: string
        }
        Update: {
          account_email?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          member_id?: string | null
          source?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "artist_travel_info"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dietary_restrictions: string | null
          full_name: string | null
          id: string
          job_role: string | null
          ktn_number: string | null
          pant_size: string | null
          phone_number: string | null
          preferred_airline: string | null
          preferred_seat: string | null
          shirt_size: string | null
          shoe_size: string | null
          tsa_precheck_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          full_name?: string | null
          id: string
          job_role?: string | null
          ktn_number?: string | null
          pant_size?: string | null
          phone_number?: string | null
          preferred_airline?: string | null
          preferred_seat?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          tsa_precheck_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          full_name?: string | null
          id?: string
          job_role?: string | null
          ktn_number?: string | null
          pant_size?: string | null
          phone_number?: string | null
          preferred_airline?: string | null
          preferred_seat?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          tsa_precheck_number?: string | null
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
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      release_platforms: {
        Row: {
          enabled: boolean
          id: string
          platform: string
          release_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          platform: string
          release_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          platform?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_platforms_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_explicit: boolean
          isrc_code: string | null
          release_id: string
          song_id: string | null
          sort_order: number
          title: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_explicit?: boolean
          isrc_code?: string | null
          release_id: string
          song_id?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_explicit?: boolean
          isrc_code?: string | null
          release_id?: string
          song_id?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_tracks_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "split_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist_id: string
          artwork_url: string | null
          created_at: string
          genre: string | null
          id: string
          mlc_registration_status: string
          name: string
          pro_registration_status: string
          record_label: string | null
          release_date: string | null
          release_type: string
          secondary_genre: string | null
          split_project_id: string | null
          status: string
          team_id: string
          upc_code: string | null
        }
        Insert: {
          artist_id: string
          artwork_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          mlc_registration_status?: string
          name: string
          pro_registration_status?: string
          record_label?: string | null
          release_date?: string | null
          release_type?: string
          secondary_genre?: string | null
          split_project_id?: string | null
          status?: string
          team_id: string
          upc_code?: string | null
        }
        Update: {
          artist_id?: string
          artwork_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          mlc_registration_status?: string
          name?: string
          pro_registration_status?: string
          record_label?: string | null
          release_date?: string | null
          release_type?: string
          secondary_genre?: string | null
          split_project_id?: string | null
          status?: string
          team_id?: string
          upc_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_split_project_id_fkey"
            columns: ["split_project_id"]
            isOneToOne: false
            referencedRelation: "split_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rolly_conversations: {
        Row: {
          artist_id: string | null
          created_at: string | null
          id: string
          team_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          team_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          team_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolly_conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rolly_conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rolly_knowledge: {
        Row: {
          chapter: string | null
          content: string
          created_at: string | null
          id: string
          page_end: number | null
          page_start: number | null
          search_vector: unknown
          source: string
        }
        Insert: {
          chapter?: string | null
          content: string
          created_at?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
          search_vector?: unknown
          source?: string
        }
        Update: {
          chapter?: string | null
          content?: string
          created_at?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
          search_vector?: unknown
          source?: string
        }
        Relationships: []
      }
      rolly_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolly_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "rolly_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rolly_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          month: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          month: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          month?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolly_usage_team_id_fkey"
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
      split_contributors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ipi_number: string | null
          name: string
          phone: string | null
          pro_affiliation: string | null
          pub_ipi_number: string | null
          publisher_name: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ipi_number?: string | null
          name: string
          phone?: string | null
          pro_affiliation?: string | null
          pub_ipi_number?: string | null
          publisher_name?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ipi_number?: string | null
          name?: string
          phone?: string | null
          pro_affiliation?: string | null
          pub_ipi_number?: string | null
          publisher_name?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_contributors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      split_entries: {
        Row: {
          approval_status: string
          approval_token: string | null
          approved_at: string | null
          contributor_id: string
          created_at: string
          id: string
          master_pct: number | null
          producer_pct: number | null
          project_approval_token: string | null
          publisher_pct: number | null
          role: string
          song_id: string
          writer_pct: number | null
        }
        Insert: {
          approval_status?: string
          approval_token?: string | null
          approved_at?: string | null
          contributor_id: string
          created_at?: string
          id?: string
          master_pct?: number | null
          producer_pct?: number | null
          project_approval_token?: string | null
          publisher_pct?: number | null
          role?: string
          song_id: string
          writer_pct?: number | null
        }
        Update: {
          approval_status?: string
          approval_token?: string | null
          approved_at?: string | null
          contributor_id?: string
          created_at?: string
          id?: string
          master_pct?: number | null
          producer_pct?: number | null
          project_approval_token?: string | null
          publisher_pct?: number | null
          role?: string
          song_id?: string
          writer_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "split_entries_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "split_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_entries_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "split_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      split_projects: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          name: string
          project_type: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          name: string
          project_type?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          name?: string
          project_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_projects_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      split_songs: {
        Row: {
          created_at: string
          id: string
          project_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_songs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "split_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_employment: {
        Row: {
          annual_salary: number | null
          created_at: string
          display_name: string | null
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
          display_name?: string | null
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
          display_name?: string | null
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
      sub_budgets: {
        Row: {
          amount: number
          budget_id: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          amount?: number
          budget_id: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          amount?: number
          budget_id?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_budgets_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_access_requests: {
        Row: {
          admin_user_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          reason: string | null
          started_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          admin_user_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
          started_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          admin_user_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
          started_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_access_requests_team_id_fkey"
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
          priority: number | null
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
          priority?: number | null
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
          priority?: number | null
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
      team_applications: {
        Row: {
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          assists_user_id: string | null
          created_at: string
          id: string
          is_support_session: boolean
          perm_distribution: boolean | null
          perm_edit_artists: boolean
          perm_manage_finance: boolean
          perm_view_ar: boolean
          perm_view_billing: boolean
          perm_view_finance: boolean
          perm_view_roster: boolean
          perm_view_staff_salaries: boolean
          persona: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          assists_user_id?: string | null
          created_at?: string
          id?: string
          is_support_session?: boolean
          perm_distribution?: boolean | null
          perm_edit_artists?: boolean
          perm_manage_finance?: boolean
          perm_view_ar?: boolean
          perm_view_billing?: boolean
          perm_view_finance?: boolean
          perm_view_roster?: boolean
          perm_view_staff_salaries?: boolean
          persona?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          assists_user_id?: string | null
          created_at?: string
          id?: string
          is_support_session?: boolean
          perm_distribution?: boolean | null
          perm_edit_artists?: boolean
          perm_manage_finance?: boolean
          perm_view_ar?: boolean
          perm_view_billing?: boolean
          perm_view_finance?: boolean
          perm_view_roster?: boolean
          perm_view_staff_salaries?: boolean
          persona?: string | null
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
      team_ownership_transfers: {
        Row: {
          admin_acknowledged_at: string | null
          created_at: string
          from_user_id: string
          id: string
          owner_accepted_at: string | null
          policy_version: string
          status: string
          team_id: string
          to_user_id: string
          token: string
        }
        Insert: {
          admin_acknowledged_at?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          owner_accepted_at?: string | null
          policy_version?: string
          status?: string
          team_id: string
          to_user_id: string
          token?: string
        }
        Update: {
          admin_acknowledged_at?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          owner_accepted_at?: string | null
          policy_version?: string
          status?: string
          team_id?: string
          to_user_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_ownership_transfers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          is_grandfathered: boolean
          plan: string
          seat_limit: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_grandfathered?: boolean
          plan?: string
          seat_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_grandfathered?: boolean
          plan?: string
          seat_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          annual_budget: number | null
          artist_count: string | null
          avatar_url: string | null
          base_currency: string
          company_type: string | null
          created_at: string
          created_by: string | null
          id: string
          monthly_revenue: string | null
          name: string
          onboarding_completed: boolean | null
          region: string
          team_size: string | null
        }
        Insert: {
          annual_budget?: number | null
          artist_count?: string | null
          avatar_url?: string | null
          base_currency?: string
          company_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue?: string | null
          name: string
          onboarding_completed?: boolean | null
          region?: string
          team_size?: string | null
        }
        Update: {
          annual_budget?: number | null
          artist_count?: string | null
          avatar_url?: string | null
          base_currency?: string
          company_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_revenue?: string | null
          name?: string
          onboarding_completed?: boolean | null
          region?: string
          team_size?: string | null
        }
        Relationships: []
      }
      tour_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          tour_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          tour_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          artist_id: string
          budget_id: string | null
          category_id: string | null
          created_at: string
          description: string
          id: string
          initiative_id: string | null
          revenue_category: string | null
          revenue_source: string | null
          status: string
          sub_budget_id: string | null
          task_id: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          artist_id: string
          budget_id?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          initiative_id?: string | null
          revenue_category?: string | null
          revenue_source?: string | null
          status?: string
          sub_budget_id?: string | null
          task_id?: string | null
          transaction_date?: string
          type?: string
        }
        Update: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          artist_id?: string
          budget_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          initiative_id?: string | null
          revenue_category?: string | null
          revenue_source?: string | null
          status?: string
          sub_budget_id?: string | null
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
            foreignKeyName: "transactions_sub_budget_id_fkey"
            columns: ["sub_budget_id"]
            isOneToOne: false
            referencedRelation: "sub_budgets"
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
      vendor_invoices: {
        Row: {
          amount: number
          artist_id: string | null
          created_at: string
          description: string
          due_date: string | null
          file_url: string | null
          id: string
          invoice_date: string
          notes: string | null
          payment_terms: string
          po_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          payment_terms?: string
          po_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id: string
          vendor_id: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          payment_terms?: string
          po_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_w9_data: {
        Row: {
          address_line1: string
          address_line2: string | null
          bank_account_encrypted: string | null
          bank_routing_encrypted: string | null
          business_name: string | null
          city: string
          created_at: string
          exempt_payee_code: string | null
          fatca_exemption_code: string | null
          federal_tax_classification: string
          id: string
          legal_name: string
          llc_classification: string | null
          payment_method: string
          paypal_email: string | null
          signature_date: string
          signature_name: string
          state: string
          tin_encrypted: string
          tin_last_four: string
          tin_type: string
          vendor_id: string
          venmo_handle: string | null
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          bank_account_encrypted?: string | null
          bank_routing_encrypted?: string | null
          business_name?: string | null
          city: string
          created_at?: string
          exempt_payee_code?: string | null
          fatca_exemption_code?: string | null
          federal_tax_classification: string
          id?: string
          legal_name: string
          llc_classification?: string | null
          payment_method?: string
          paypal_email?: string | null
          signature_date: string
          signature_name: string
          state: string
          tin_encrypted: string
          tin_last_four: string
          tin_type: string
          vendor_id: string
          venmo_handle?: string | null
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          bank_account_encrypted?: string | null
          bank_routing_encrypted?: string | null
          business_name?: string | null
          city?: string
          created_at?: string
          exempt_payee_code?: string | null
          fatca_exemption_code?: string | null
          federal_tax_classification?: string
          id?: string
          legal_name?: string
          llc_classification?: string | null
          payment_method?: string
          paypal_email?: string | null
          signature_date?: string
          signature_name?: string
          state?: string
          tin_encrypted?: string
          tin_last_four?: string
          tin_type?: string
          vendor_id?: string
          venmo_handle?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_w9_data_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          invoice_artist_id: string | null
          invoice_payment_terms: string | null
          name: string
          notes: string | null
          phone: string | null
          team_id: string
          total_paid: number
          w9_completed_at: string | null
          w9_status: string
          w9_token: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          invoice_artist_id?: string | null
          invoice_payment_terms?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          team_id: string
          total_paid?: number
          w9_completed_at?: string | null
          w9_status?: string
          w9_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          invoice_artist_id?: string | null
          invoice_payment_terms?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          team_id?: string
          total_paid?: number
          w9_completed_at?: string | null
          w9_status?: string
          w9_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_invoice_artist_id_fkey"
            columns: ["invoice_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_team_id_fkey"
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
      expire_support_sessions: { Args: never; Returns: undefined }
      get_artist_team_id: { Args: { p_artist_id: string }; Returns: string }
      get_budget_team_id: { Args: { p_budget_id: string }; Returns: string }
      get_invoice_team_id: { Args: { p_invoice_id: string }; Returns: string }
      get_link_folder_artist_id: {
        Args: { p_folder_id: string }
        Returns: string
      }
      get_milestone_artist_id: {
        Args: { p_milestone_id: string }
        Returns: string
      }
      get_prospect_team_id: { Args: { p_prospect_id: string }; Returns: string }
      get_release_team_id: { Args: { p_release_id: string }; Returns: string }
      get_split_project_team_id: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_split_song_team_id: { Args: { p_song_id: string }; Returns: string }
      get_vendor_team_id: { Args: { p_vendor_id: string }; Returns: string }
      has_artist_access: {
        Args: {
          p_artist_id: string
          p_min_level: Database["public"]["Enums"]["permission_level"]
        }
        Returns: boolean
      }
      has_note_share: { Args: { p_note_id: string }; Returns: boolean }
      increment_rolly_usage: {
        Args: { p_month: string; p_team_id: string }
        Returns: undefined
      }
      is_link_folder_public: { Args: { p_folder_id: string }; Returns: boolean }
      is_member_info_public: { Args: { p_member_id: string }; Returns: boolean }
      is_note_owner: { Args: { p_note_id: string }; Returns: boolean }
      is_platform_admin: { Args: { p_user_id?: string }; Returns: boolean }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      is_team_owner_or_manager: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      next_invoice_number: { Args: { p_team_id: string }; Returns: string }
      next_po_number: { Args: { p_team_id: string }; Returns: string }
      search_creator_intelligence: {
        Args: {
          category_filter?: string
          genre_filter?: string
          match_limit?: number
          min_confidence?: number
          p_team_id?: string
          platform_filter?: string
          search_query?: string
        }
        Returns: {
          artist_affinity: string[]
          audience_type: string
          average_views: number
          category: string
          confidence_label: string
          confidence_score: number
          contact_info: string
          content_style: string
          engagement_rate: number
          follower_count: number
          genre_fit: string[]
          handle: string
          id: string
          last_verified_date: string
          median_views: number
          notes: string
          platform: string
          posting_frequency: string
          rate: string
          subcategory: string
          url: string
        }[]
      }
      search_rolly_knowledge: {
        Args: { match_limit?: number; search_query: string }
        Returns: {
          chapter: string
          content: string
          id: string
          rank: number
        }[]
      }
      shares_team_with: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "team_owner" | "manager" | "artist" | "guest"
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
      feedback_status: "new" | "reviewed" | "planned" | "done" | "wont_fix"
      feedback_type: "bug" | "feature"
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
      app_role: ["team_owner", "manager", "artist", "guest"],
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
      feedback_status: ["new", "reviewed", "planned", "done", "wont_fix"],
      feedback_type: ["bug", "feature"],
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
