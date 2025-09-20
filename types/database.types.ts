WARN: no SMS provider is enabled. Disabling phone login
Initialising login role...
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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      api_key_rate_limits: {
        Row: {
          api_key_id: string
          created_at: string | null
          current_day_count: number
          current_day_reset: string | null
          current_hour_count: number
          current_hour_reset: string | null
          current_month_count: number
          current_month_reset: string | null
          id: string
          requests_per_day: number
          requests_per_hour: number
          requests_per_month: number
          updated_at: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          current_day_count?: number
          current_day_reset?: string | null
          current_hour_count?: number
          current_hour_reset?: string | null
          current_month_count?: number
          current_month_reset?: string | null
          id?: string
          requests_per_day?: number
          requests_per_hour?: number
          requests_per_month?: number
          updated_at?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          current_day_count?: number
          current_day_reset?: string | null
          current_hour_count?: number
          current_hour_reset?: string | null
          current_month_count?: number
          current_month_reset?: string | null
          id?: string
          requests_per_day?: number
          requests_per_hour?: number
          requests_per_month?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          environment: string | null
          expires_at: string | null
          failed_requests: number | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string | null
          key_suffix: string | null
          last_used_at: string | null
          masked_key: string | null
          metadata: Json | null
          name: string
          permissions: Json | null
          public_id: string | null
          rate_limit_per_day: number | null
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          salt: string | null
          status: string | null
          successful_requests: number | null
          tier: string | null
          total_requests: number | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          expires_at?: string | null
          failed_requests?: number | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix?: string | null
          key_suffix?: string | null
          last_used_at?: string | null
          masked_key?: string | null
          metadata?: Json | null
          name?: string
          permissions?: Json | null
          public_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          salt?: string | null
          status?: string | null
          successful_requests?: number | null
          tier?: string | null
          total_requests?: number | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string | null
          expires_at?: string | null
          failed_requests?: number | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string | null
          key_suffix?: string | null
          last_used_at?: string | null
          masked_key?: string | null
          metadata?: Json | null
          name?: string
          permissions?: Json | null
          public_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          salt?: string | null
          status?: string | null
          successful_requests?: number | null
          tier?: string | null
          total_requests?: number | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      api_rate_limit: {
        Row: {
          bucket: string
          count: number
          created_at: string | null
          key_id: string
        }
        Insert: {
          bucket: string
          count?: number
          created_at?: string | null
          key_id: string
        }
        Update: {
          bucket?: string
          count?: number
          created_at?: string | null
          key_id?: string
        }
        Relationships: []
      }
      api_storage_access_logs: {
        Row: {
          accessed_at: string | null
          api_key_id: string | null
          error_message: string | null
          id: string
          storage_path: string
          success: boolean | null
        }
        Insert: {
          accessed_at?: string | null
          api_key_id?: string | null
          error_message?: string | null
          id?: string
          storage_path: string
          success?: boolean | null
        }
        Update: {
          accessed_at?: string | null
          api_key_id?: string | null
          error_message?: string | null
          id?: string
          storage_path?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "api_storage_access_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_key_id: string | null
          cost: number | null
          endpoint: string | null
          id: string
          latency_ms: number | null
          status: number | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          cost?: number | null
          endpoint?: string | null
          id?: string
          latency_ms?: number | null
          status?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          cost?: number | null
          endpoint?: string | null
          id?: string
          latency_ms?: number | null
          status?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_log: {
        Row: {
          country_code: string | null
          endpoint: string
          error_message: string | null
          id: number
          ip_address: unknown | null
          key_id: string | null
          latency_ms: number | null
          metadata: Json | null
          method: string | null
          occurred_at: string | null
          referer: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          endpoint: string
          error_message?: string | null
          id?: number
          ip_address?: unknown | null
          key_id?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          method?: string | null
          occurred_at?: string | null
          referer?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          endpoint?: string
          error_message?: string | null
          id?: number
          ip_address?: unknown | null
          key_id?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          method?: string | null
          occurred_at?: string | null
          referer?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          accessed_at: string | null
          api_key_id: string | null
          endpoint: string | null
          id: string
          metadata: Json | null
          method: string | null
          response_time_ms: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          api_key_id?: string | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          api_key_id?: string | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          changed_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      backup_indexes_20250115: {
        Row: {
          backup_date: string | null
          indexdef: string | null
          indexname: unknown | null
          schemaname: unknown | null
          tablename: unknown | null
        }
        Insert: {
          backup_date?: string | null
          indexdef?: string | null
          indexname?: unknown | null
          schemaname?: unknown | null
          tablename?: unknown | null
        }
        Update: {
          backup_date?: string | null
          indexdef?: string | null
          indexname?: unknown | null
          schemaname?: unknown | null
          tablename?: unknown | null
        }
        Relationships: []
      }
      backup_table_stats_20250115: {
        Row: {
          backup_date: string | null
          last_analyze: string | null
          last_autoanalyze: string | null
          last_autovacuum: string | null
          last_vacuum: string | null
          n_dead_tup: number | null
          n_live_tup: number | null
          n_tup_del: number | null
          n_tup_ins: number | null
          n_tup_upd: number | null
          schemaname: unknown | null
          tablename: unknown | null
        }
        Insert: {
          backup_date?: string | null
          last_analyze?: string | null
          last_autoanalyze?: string | null
          last_autovacuum?: string | null
          last_vacuum?: string | null
          n_dead_tup?: number | null
          n_live_tup?: number | null
          n_tup_del?: number | null
          n_tup_ins?: number | null
          n_tup_upd?: number | null
          schemaname?: unknown | null
          tablename?: unknown | null
        }
        Update: {
          backup_date?: string | null
          last_analyze?: string | null
          last_autoanalyze?: string | null
          last_autovacuum?: string | null
          last_vacuum?: string | null
          n_dead_tup?: number | null
          n_live_tup?: number | null
          n_tup_del?: number | null
          n_tup_ins?: number | null
          n_tup_upd?: number | null
          schemaname?: unknown | null
          tablename?: unknown | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_name: string
          created_at: string | null
          directory_name: string | null
          id: string
          sector: string | null
          ticker_code: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          directory_name?: string | null
          id: string
          sector?: string | null
          ticker_code?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          directory_name?: string | null
          id?: string
          sector?: string | null
          ticker_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_directory_mapping: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string | null
          fiscal_year: string
          hashed_directory: string
          id: number
          original_directory: string
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string | null
          fiscal_year: string
          hashed_directory: string
          id?: number
          original_directory: string
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string | null
          fiscal_year?: string
          hashed_directory?: string
          id?: number
          original_directory?: string
        }
        Relationships: []
      }
      company_master: {
        Row: {
          company_name: string
          created_at: string | null
          doc_id: string
          document_name: string | null
          fiscal_period: string | null
          fiscal_year: string | null
          id: number
          submit_date: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          doc_id: string
          document_name?: string | null
          fiscal_period?: string | null
          fiscal_year?: string | null
          id?: number
          submit_date?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          doc_id?: string
          document_name?: string | null
          fiscal_period?: string | null
          fiscal_year?: string | null
          id?: number
          submit_date?: string | null
        }
        Relationships: []
      }
      markdown_files_metadata: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          fiscal_year: string | null
          id: string
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          fiscal_year?: string | null
          id?: string
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          fiscal_year?: string | null
          id?: string
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_config: {
        Row: {
          k: string
          v: Json | null
        }
        Insert: {
          k: string
          v?: Json | null
        }
        Update: {
          k?: string
          v?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          api_quota_per_day: number | null
          api_quota_per_month: number | null
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          plan: string | null
          subscription_plan: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_quota_per_day?: number | null
          api_quota_per_month?: number | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          plan?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_quota_per_day?: number | null
          api_quota_per_month?: number | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_entries: {
        Row: {
          count: number
          created_at: string | null
          id: string
          key: string
          tier: string
          window_end: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          key: string
          tier?: string
          window_end: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          key?: string
          tier?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          price_yearly: number | null
          requests_per_day: number | null
          requests_per_hour: number | null
          requests_per_month: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_month?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_month?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          expires_at: string | null
          id: string
          plan_type: string
          started_at: string | null
          status: string
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          plan_type: string
          started_at?: string | null
          status: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_documents_summary: {
        Row: {
          company_id: string | null
          company_name: string | null
          document_types: string[] | null
          fiscal_year: string | null
          total_documents: number | null
        }
        Relationships: []
      }
      v_complete_financial_data: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          document_name: string | null
          file_name: string | null
          file_type: string | null
          fiscal_period: string | null
          fiscal_year: string | null
          hashed_directory: string | null
          id: string | null
          original_directory: string | null
          public_url: string | null
          storage_path: string | null
          submit_date: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      airtable_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      airtable_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      airtable_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      api_key_is_valid: {
        Args: { public_id: string }
        Returns: boolean
      }
      auth0_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      auth0_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      auth0_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      big_query_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      big_query_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      big_query_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      bump_and_check_rate_limit: {
        Args: {
          p_key_id: string
          p_limit_day?: number
          p_limit_hour?: number
          p_limit_min?: number
        }
        Returns: Json
      }
      cleanup_api_usage: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_api_logs: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_rate_limit_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      click_house_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      click_house_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      click_house_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      cognito_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      cognito_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      cognito_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      create_api_key: {
        Args: { p_environment?: string; p_name: string; p_user_id?: string }
        Returns: string
      }
      create_api_key_bcrypt: {
        Args: {
          p_description?: string
          p_name?: string
          p_tier?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_api_key_complete: {
        Args: {
          p_description?: string
          p_name?: string
          p_tier?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_api_key_complete_v2: {
        Args: {
          p_description?: string
          p_name?: string
          p_tier?: string
          p_user_id: string
        }
        Returns: Json
      }
      detect_suspicious_activity: {
        Args: { p_hours_back?: number }
        Returns: Json
      }
      duckdb_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      duckdb_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      duckdb_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      extract_file_info: {
        Args: { file_path: string }
        Returns: Json
      }
      extract_file_order: {
        Args: { file_name: string }
        Returns: number
      }
      extract_file_type: {
        Args: { file_name: string }
        Returns: string
      }
      firebase_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      firebase_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      firebase_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      generate_api_key: {
        Args:
          | {
              p_description?: string
              p_expires_at?: string
              p_prefix?: string
              p_rate_limit_per_day?: number
              p_rate_limit_per_hour?: number
              p_rate_limit_per_minute?: number
              p_user_id: string
            }
          | { p_environment?: string; p_name: string; p_user_id?: string }
          | {
              p_expires_at?: string
              p_name: string
              p_rate_limit_per_day?: number
              p_rate_limit_per_hour?: number
              p_rate_limit_per_minute?: number
            }
        Returns: {
          api_key: string
          expires_at: string
          key_id: string
        }[]
      }
      generate_key_hash: {
        Args: { plain_key: string }
        Returns: string
      }
      generate_simple_api_key: {
        Args: { p_name: string; p_user_id?: string } | { p_user_id: string }
        Returns: string
      }
      generate_test_api_key: {
        Args: { p_name: string; p_user_id?: string }
        Returns: string
      }
      get_api_key_by_prefix: {
        Args: { p_prefix: string }
        Returns: {
          expires_at: string
          id: number
          key_hash: string
          revoked: boolean
        }[]
      }
      get_api_key_meta: {
        Args: { p_prefix: string }
        Returns: {
          expires_at: string
          id: number
          key_hash: string
          metadata: Json
          revoked: boolean
        }[]
      }
      get_api_usage_stats: {
        Args: { p_hours_back?: number; p_key_id?: string; p_user_id?: string }
        Returns: Json
      }
      get_companies_list_paginated: {
        Args: {
          p_cursor?: string
          p_fiscal_year?: string
          p_limit?: number
          p_name_filter?: string
        }
        Returns: Json
      }
      get_companies_paginated: {
        Args: {
          p_company_name_filter?: string
          p_cursor?: string
          p_file_type?: string
          p_fiscal_year?: string
          p_limit?: number
        }
        Returns: Json
      }
      get_current_api_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_api_key_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_plan_tier: {
        Args: { user_id: string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hello_world_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      hello_world_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      hello_world_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      iceberg_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      iceberg_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      iceberg_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      incr_usage_and_get: {
        Args: { p_key_id: string } | { p_key_id: string }
        Returns: {
          day_count: number
          hour_count: number
          minute_count: number
        }[]
      }
      log_api_usage: {
        Args: {
          p_country_code?: string
          p_endpoint: string
          p_error_message?: string
          p_ip_address?: unknown
          p_key_id: string
          p_latency_ms?: number
          p_metadata?: Json
          p_method?: string
          p_referer?: string
          p_request_size_bytes?: number
          p_response_size_bytes?: number
          p_status_code?: number
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_api_usage_compat: {
        Args:
          | {
              p_api_key_id: string
              p_bytes_out: number
              p_error_code?: string
              p_error_message?: string
              p_ip: string
              p_latency_ms: number
              p_method: string
              p_path: string
              p_query: Json
              p_status: number
              p_tenant_id: string
            }
          | {
              p_api_key_id: string
              p_bytes_out: number
              p_ip: string
              p_latency_ms: number
              p_method: string
              p_path: string
              p_query: Json
              p_status: number
              p_tenant_id: string
            }
          | {
              p_api_key_id: string
              p_bytes_out: number
              p_ip: string
              p_latency_ms: number
              p_method: string
              p_path: string
              p_query: Json
              p_status: number
              p_tenant_id: string
            }
        Returns: undefined
      }
      logflare_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      logflare_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      logflare_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      mssql_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      mssql_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      mssql_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      parse_markdown_file_path: {
        Args: { file_path: string }
        Returns: Json
      }
      redis_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      redis_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      redis_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      s3_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      s3_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      s3_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      search_companies_with_description: {
        Args: { search_term: string; similarity_threshold?: number }
        Returns: {
          description: string
          description_similarity: number
          id: string
          name: string
          name_similarity: number
          ticker: string
          total_relevance: number
        }[]
      }
      search_japanese_companies: {
        Args: { search_term: string; similarity_threshold?: number }
        Returns: {
          id: string
          name: string
          similarity: number
          ticker: string
        }[]
      }
      search_markdown_by_company: {
        Args: { p_query: string }
        Returns: {
          company_name: string
          created_at: string
          file_name: string
          file_type: string
          fiscal_year: string
          id: string
          storage_path: string
          updated_at: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      stripe_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      stripe_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      stripe_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      track_api_usage: {
        Args: { p_key_id: string }
        Returns: {
          day_count: number
          hour_count: number
          minute_count: number
        }[]
      }
      validate_api_key_by_prefix: {
        Args: { p_prefix: string }
        Returns: {
          expires_at: string
          id: string
          is_active: boolean
          key_hash: string
          rate_limit_per_minute: number
          status: string
          tier: string
          user_id: string
        }[]
      }
      verify_api_key: {
        Args: { api_key_input: string }
        Returns: Json
      }
      verify_api_key_bcrypt: {
        Args: { p_api_key: string }
        Returns: Json
      }
      verify_api_key_complete: {
        Args: { p_api_key: string }
        Returns: Json
      }
      verify_api_key_complete_v2: {
        Args: { p_api_key: string }
        Returns: Json
      }
      verify_api_key_for_storage: {
        Args: { api_key_input: string }
        Returns: boolean
      }
      verify_api_key_hash: {
        Args: { input_api_key: string }
        Returns: string
      }
      verify_api_key_with_secret: {
        Args: { api_key: string }
        Returns: Json
      }
      wasm_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      wasm_fdw_meta: {
        Args: Record<PropertyKey, never>
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      wasm_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const
