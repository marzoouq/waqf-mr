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
      access_log: {
        Row: {
          created_at: string
          device_info: string | null
          email: string | null
          event_type: string
          id: string
          metadata: Json | null
          target_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          email?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          target_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: string | null
          email?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          target_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      access_log_archive: {
        Row: {
          archived_at: string
          created_at: string
          device_info: string | null
          email: string | null
          event_type: string
          id: string
          metadata: Json | null
          target_path: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string
          created_at: string
          device_info?: string | null
          email?: string | null
          event_type: string
          id: string
          metadata?: Json | null
          target_path?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string
          created_at?: string
          device_info?: string | null
          email?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          target_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      accounts: {
        Row: {
          admin_share: number
          created_at: string
          distributions_amount: number
          fiscal_year: string
          id: string
          net_after_expenses: number
          net_after_vat: number
          total_expenses: number
          total_income: number
          updated_at: string
          vat_amount: number
          waqf_capital: number
          waqf_corpus_manual: number
          waqf_corpus_previous: number
          waqf_revenue: number
          waqif_share: number
          zakat_amount: number
        }
        Insert: {
          admin_share?: number
          created_at?: string
          distributions_amount?: number
          fiscal_year: string
          id?: string
          net_after_expenses?: number
          net_after_vat?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          vat_amount?: number
          waqf_capital?: number
          waqf_corpus_manual?: number
          waqf_corpus_previous?: number
          waqf_revenue?: number
          waqif_share?: number
          zakat_amount?: number
        }
        Update: {
          admin_share?: number
          created_at?: string
          distributions_amount?: number
          fiscal_year?: string
          id?: string
          net_after_expenses?: number
          net_after_vat?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          vat_amount?: number
          waqf_capital?: number
          waqf_corpus_manual?: number
          waqf_corpus_previous?: number
          waqf_revenue?: number
          waqif_share?: number
          zakat_amount?: number
        }
        Relationships: []
      }
      advance_carryforward: {
        Row: {
          amount: number
          beneficiary_id: string
          created_at: string
          from_fiscal_year_id: string
          id: string
          notes: string | null
          status: string
          to_fiscal_year_id: string | null
        }
        Insert: {
          amount?: number
          beneficiary_id: string
          created_at?: string
          from_fiscal_year_id: string
          id?: string
          notes?: string | null
          status?: string
          to_fiscal_year_id?: string | null
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          created_at?: string
          from_fiscal_year_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_fiscal_year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_carryforward_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_carryforward_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_carryforward_from_fiscal_year_id_fkey"
            columns: ["from_fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_carryforward_to_fiscal_year_id_fkey"
            columns: ["to_fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          beneficiary_id: string
          created_at: string
          fiscal_year_id: string | null
          id: string
          paid_at: string | null
          reason: string | null
          rejection_reason: string | null
          status: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_id: string
          created_at?: string
          fiscal_year_id?: string | null
          id?: string
          paid_at?: string | null
          reason?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_id?: string
          created_at?: string
          fiscal_year_id?: string | null
          id?: string
          paid_at?: string | null
          reason?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          bank_account: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          national_id: string | null
          notes: string | null
          phone: string | null
          share_percentage: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          share_percentage: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          share_percentage?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_number: string
          created_at: string
          end_date: string
          fiscal_year_id: string | null
          id: string
          notes: string | null
          payment_amount: number | null
          payment_count: number
          payment_type: string
          property_id: string
          rent_amount: number
          start_date: string
          status: string
          tenant_name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          contract_number: string
          created_at?: string
          end_date: string
          fiscal_year_id?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_count?: number
          payment_type?: string
          property_id: string
          rent_amount: number
          start_date: string
          status?: string
          tenant_name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          contract_number?: string
          created_at?: string
          end_date?: string
          fiscal_year_id?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_count?: number
          payment_type?: string
          property_id?: string
          rent_amount?: number
          start_date?: string
          status?: string
          tenant_name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          participant_id: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          participant_id?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          participant_id?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      distributions: {
        Row: {
          account_id: string
          amount: number
          beneficiary_id: string
          created_at: string
          date: string
          fiscal_year_id: string | null
          id: string
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          beneficiary_id: string
          created_at?: string
          date: string
          fiscal_year_id?: string | null
          id?: string
          status?: string
        }
        Update: {
          account_id?: string
          amount?: number
          beneficiary_id?: string
          created_at?: string
          date?: string
          fiscal_year_id?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          expense_type: string
          fiscal_year_id: string | null
          id: string
          property_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          expense_type: string
          fiscal_year_id?: string | null
          id?: string
          property_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          expense_type?: string
          fiscal_year_id?: string | null
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          label: string
          published: boolean
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          label: string
          published?: boolean
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          published?: boolean
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          date: string
          fiscal_year_id: string | null
          id: string
          notes: string | null
          property_id: string | null
          source: string
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          date: string
          fiscal_year_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          source: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          date?: string
          fiscal_year_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          date: string
          description: string | null
          expense_id: string | null
          file_name: string | null
          file_path: string | null
          fiscal_year_id: string | null
          id: string
          invoice_number: string | null
          invoice_type: string
          property_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          expense_id?: string | null
          file_name?: string | null
          file_path?: string | null
          fiscal_year_id?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type: string
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          expense_id?: string | null
          file_name?: string | null
          file_path?: string | null
          fiscal_year_id?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string
          property_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          area: number
          created_at: string
          description: string | null
          id: string
          location: string
          property_number: string
          property_type: string
          updated_at: string
        }
        Insert: {
          area: number
          created_at?: string
          description?: string | null
          id?: string
          location: string
          property_number: string
          property_type: string
          updated_at?: string
        }
        Update: {
          area?: number
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          property_number?: string
          property_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_payments: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          paid_months: number
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_months?: number
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area: number | null
          created_at: string
          floor: string | null
          id: string
          notes: string | null
          property_id: string
          status: string
          unit_number: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          area?: number | null
          created_at?: string
          floor?: string | null
          id?: string
          notes?: string | null
          property_id: string
          status?: string
          unit_number: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          area?: number | null
          created_at?: string
          floor?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          status?: string
          unit_number?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waqf_bylaws: {
        Row: {
          chapter_number: number | null
          chapter_title: string | null
          content: string
          created_at: string
          id: string
          is_visible: boolean
          part_number: number
          part_title: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          chapter_number?: number | null
          chapter_title?: string | null
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          part_number: number
          part_title: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chapter_number?: number | null
          chapter_title?: string | null
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          part_number?: number
          part_title?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      beneficiaries_safe: {
        Row: {
          bank_account: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          share_percentage: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bank_account?: never
          created_at?: string | null
          email?: never
          id?: string | null
          name?: string | null
          national_id?: never
          notes?: string | null
          phone?: never
          share_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bank_account?: never
          created_at?: string | null
          email?: never
          id?: string | null
          name?: string | null
          national_id?: never
          notes?: string | null
          phone?: never
          share_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      cron_archive_old_access_logs: { Args: never; Returns: undefined }
      cron_auto_expire_contracts: { Args: never; Returns: undefined }
      cron_check_contract_expiry: { Args: never; Returns: undefined }
      cron_cleanup_old_notifications: { Args: never; Returns: undefined }
      execute_distribution: {
        Args: {
          p_account_id: string
          p_distributions?: Json
          p_fiscal_year_id?: string
          p_total_distributed?: number
        }
        Returns: Json
      }
      get_public_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_fiscal_year_accessible: {
        Args: { p_fiscal_year_id: string }
        Returns: boolean
      }
      log_access_event: {
        Args: {
          p_device_info?: string
          p_email?: string
          p_event_type: string
          p_metadata?: Json
          p_target_path?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      notify_admins: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      notify_all_beneficiaries: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      reopen_fiscal_year: {
        Args: { p_fiscal_year_id: string; p_reason: string }
        Returns: Json
      }
      reorder_bylaws: { Args: { items: Json }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "beneficiary" | "waqif" | "accountant"
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
      app_role: ["admin", "beneficiary", "waqif", "accountant"],
    },
  },
} as const
