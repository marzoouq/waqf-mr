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
          fiscal_year: string
          id: string
          total_expenses: number
          total_income: number
          updated_at: string
          waqf_revenue: number
          waqif_share: number
        }
        Insert: {
          admin_share?: number
          created_at?: string
          fiscal_year: string
          id?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
          waqf_revenue?: number
          waqif_share?: number
        }
        Update: {
          admin_share?: number
          created_at?: string
          fiscal_year?: string
          id?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
          waqf_revenue?: number
          waqif_share?: number
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
          id: string
          notes: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status: string
          tenant_name: string
          updated_at: string
        }
        Insert: {
          contract_number: string
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status?: string
          tenant_name: string
          updated_at?: string
        }
        Update: {
          contract_number?: string
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number
          start_date?: string
          status?: string
          tenant_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
          property_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          expense_type: string
          id?: string
          property_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          expense_type?: string
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          date: string
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
            foreignKeyName: "income_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
