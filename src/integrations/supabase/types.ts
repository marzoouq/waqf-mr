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
          id: string
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          beneficiary_id: string
          created_at?: string
          date: string
          id?: string
          status?: string
        }
        Update: {
          account_id?: string
          amount?: number
          beneficiary_id?: string
          created_at?: string
          date?: string
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
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          label: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          label?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    }
    Enums: {
      app_role: "admin" | "beneficiary" | "waqif"
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
      app_role: ["admin", "beneficiary", "waqif"],
    },
  },
} as const
