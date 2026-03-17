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
          fiscal_year_id: string | null
          id: string
          net_after_expenses: number
          net_after_vat: number
          total_expenses: number
          total_income: number
          updated_at: string
          vat_amount: number
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
          fiscal_year_id?: string | null
          id?: string
          net_after_expenses?: number
          net_after_vat?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          vat_amount?: number
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
          fiscal_year_id?: string | null
          id?: string
          net_after_expenses?: number
          net_after_vat?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          vat_amount?: number
          waqf_corpus_manual?: number
          waqf_corpus_previous?: number
          waqf_revenue?: number
          waqif_share?: number
          zakat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
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
      annual_report_items: {
        Row: {
          content: string
          created_at: string
          fiscal_year_id: string
          id: string
          property_id: string | null
          section_type: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          fiscal_year_id: string
          id?: string
          property_id?: string | null
          section_type?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          fiscal_year_id?: string
          id?: string
          property_id?: string | null
          section_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_items_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_report_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_report_status: {
        Row: {
          created_at: string
          fiscal_year_id: string
          id: string
          published_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          fiscal_year_id: string
          id?: string
          published_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          fiscal_year_id?: string
          id?: string
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_report_status_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: true
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
      contract_fiscal_allocations: {
        Row: {
          allocated_amount: number
          allocated_payments: number
          contract_id: string
          created_at: string
          fiscal_year_id: string
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          allocated_amount?: number
          allocated_payments?: number
          contract_id: string
          created_at?: string
          fiscal_year_id: string
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          allocated_amount?: number
          allocated_payments?: number
          contract_id?: string
          created_at?: string
          fiscal_year_id?: string
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_fiscal_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_fiscal_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_fiscal_allocations_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_building: string | null
          tenant_city: string | null
          tenant_crn: string | null
          tenant_district: string | null
          tenant_id_number: string | null
          tenant_id_type: string | null
          tenant_name: string
          tenant_postal_code: string | null
          tenant_street: string | null
          tenant_tax_number: string | null
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
          tenant_building?: string | null
          tenant_city?: string | null
          tenant_crn?: string | null
          tenant_district?: string | null
          tenant_id_number?: string | null
          tenant_id_type?: string | null
          tenant_name: string
          tenant_postal_code?: string | null
          tenant_street?: string | null
          tenant_tax_number?: string | null
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
          tenant_building?: string | null
          tenant_city?: string | null
          tenant_crn?: string | null
          tenant_district?: string | null
          tenant_id_number?: string | null
          tenant_id_type?: string | null
          tenant_name?: string
          tenant_postal_code?: string | null
          tenant_street?: string | null
          tenant_tax_number?: string | null
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
      expense_budgets: {
        Row: {
          budget_amount: number
          created_at: string
          expense_type: string
          fiscal_year_id: string
          id: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          created_at?: string
          expense_type: string
          fiscal_year_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          created_at?: string
          expense_type?: string
          fiscal_year_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_budgets_fiscal_year_id_fkey"
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
            foreignKeyName: "income_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_safe"
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
      invoice_chain: {
        Row: {
          created_at: string | null
          icv: number
          id: string
          invoice_hash: string
          invoice_id: string
          previous_hash: string
          source_table: string
        }
        Insert: {
          created_at?: string | null
          icv: number
          id?: string
          invoice_hash: string
          invoice_id: string
          previous_hash?: string
          source_table?: string
        }
        Update: {
          created_at?: string | null
          icv?: number
          id?: string
          invoice_hash?: string
          invoice_id?: string
          previous_hash?: string
          source_table?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          invoice_source: string
          item_name: string
          line_total: number
          quantity: number
          sort_order: number
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          invoice_source?: string
          item_name: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          invoice_source?: string
          item_name?: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          amount_excluding_vat: number | null
          contract_id: string | null
          created_at: string
          date: string
          description: string | null
          expense_id: string | null
          file_name: string | null
          file_path: string | null
          fiscal_year_id: string | null
          icv: number | null
          id: string
          invoice_hash: string | null
          invoice_number: string | null
          invoice_type: string
          property_id: string | null
          status: string
          updated_at: string
          vat_amount: number
          vat_rate: number
          zatca_status: string | null
          zatca_uuid: string | null
          zatca_xml: string | null
        }
        Insert: {
          amount?: number
          amount_excluding_vat?: number | null
          contract_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          expense_id?: string | null
          file_name?: string | null
          file_path?: string | null
          fiscal_year_id?: string | null
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string | null
          invoice_type: string
          property_id?: string | null
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          zatca_status?: string | null
          zatca_uuid?: string | null
          zatca_xml?: string | null
        }
        Update: {
          amount?: number
          amount_excluding_vat?: number | null
          contract_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          expense_id?: string | null
          file_name?: string | null
          file_path?: string | null
          fiscal_year_id?: string | null
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string | null
          invoice_type?: string
          property_id?: string | null
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          zatca_status?: string | null
          zatca_uuid?: string | null
          zatca_xml?: string | null
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
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_safe"
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
      payment_invoices: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          due_date: string
          file_path: string | null
          fiscal_year_id: string | null
          icv: number | null
          id: string
          invoice_hash: string | null
          invoice_number: string
          invoice_type: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_number: number
          status: string
          updated_at: string
          vat_amount: number
          vat_rate: number
          zatca_status: string | null
          zatca_uuid: string | null
          zatca_xml: string | null
        }
        Insert: {
          amount?: number
          contract_id: string
          created_at?: string
          due_date: string
          file_path?: string | null
          fiscal_year_id?: string | null
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number: string
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number?: number
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          zatca_status?: string | null
          zatca_uuid?: string | null
          zatca_xml?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          due_date?: string
          file_path?: string | null
          fiscal_year_id?: string | null
          icv?: number | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_number?: number
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          zatca_status?: string | null
          zatca_uuid?: string | null
          zatca_xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_invoices_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
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
          vat_exempt: boolean
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
          vat_exempt?: boolean
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
          vat_exempt?: boolean
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      support_ticket_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          rating: number | null
          rating_comment: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          priority?: string
          rating?: number | null
          rating_comment?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          rating?: number | null
          rating_comment?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title?: string
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
          {
            foreignKeyName: "tenant_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts_safe"
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
      zatca_certificates: {
        Row: {
          certificate: string
          certificate_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          private_key: string
          request_id: string | null
          zatca_secret: string | null
        }
        Insert: {
          certificate: string
          certificate_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          private_key: string
          request_id?: string | null
          zatca_secret?: string | null
        }
        Update: {
          certificate?: string
          certificate_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          private_key?: string
          request_id?: string | null
          zatca_secret?: string | null
        }
        Relationships: []
      }
      zatca_operation_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string | null
          operation_type: string
          request_summary: Json | null
          response_summary: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          operation_type: string
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          operation_type?: string
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string
          user_id?: string | null
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
          notes?: never
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
          notes?: never
          phone?: never
          share_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contracts_safe: {
        Row: {
          contract_number: string | null
          created_at: string | null
          end_date: string | null
          fiscal_year_id: string | null
          id: string | null
          notes: string | null
          payment_amount: number | null
          payment_count: number | null
          payment_type: string | null
          property_id: string | null
          rent_amount: number | null
          start_date: string | null
          status: string | null
          tenant_building: string | null
          tenant_city: string | null
          tenant_crn: string | null
          tenant_district: string | null
          tenant_id_number: string | null
          tenant_id_type: string | null
          tenant_name: string | null
          tenant_postal_code: string | null
          tenant_street: string | null
          tenant_tax_number: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          contract_number?: string | null
          created_at?: string | null
          end_date?: string | null
          fiscal_year_id?: string | null
          id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_count?: number | null
          payment_type?: string | null
          property_id?: string | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          tenant_building?: never
          tenant_city?: never
          tenant_crn?: never
          tenant_district?: never
          tenant_id_number?: never
          tenant_id_type?: never
          tenant_name?: string | null
          tenant_postal_code?: never
          tenant_street?: never
          tenant_tax_number?: never
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_number?: string | null
          created_at?: string | null
          end_date?: string | null
          fiscal_year_id?: string | null
          id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_count?: number | null
          payment_type?: string | null
          property_id?: string | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          tenant_building?: never
          tenant_city?: never
          tenant_crn?: never
          tenant_district?: never
          tenant_id_number?: never
          tenant_id_type?: never
          tenant_name?: string | null
          tenant_postal_code?: never
          tenant_street?: never
          tenant_tax_number?: never
          unit_id?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      allocate_icv_and_chain:
        | {
            Args: { p_invoice_hash: string; p_invoice_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_invoice_hash: string
              p_invoice_id: string
              p_source_table?: string
            }
            Returns: Json
          }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      close_fiscal_year: {
        Args: {
          p_account_data: Json
          p_fiscal_year_id: string
          p_waqf_corpus_manual?: number
        }
        Returns: Json
      }
      cron_archive_old_access_logs: { Args: never; Returns: undefined }
      cron_auto_expire_contracts: { Args: never; Returns: undefined }
      cron_check_contract_expiry: { Args: never; Returns: undefined }
      cron_check_late_payments: { Args: never; Returns: undefined }
      cron_cleanup_old_notifications: { Args: never; Returns: undefined }
      cron_update_overdue_invoices: { Args: never; Returns: undefined }
      decrypt_pii: { Args: { p_encrypted: string }; Returns: string }
      encrypt_pii: { Args: { p_value: string }; Returns: string }
      execute_distribution: {
        Args: {
          p_account_id: string
          p_distributions?: Json
          p_fiscal_year_id?: string
          p_total_distributed?: number
        }
        Returns: Json
      }
      generate_all_active_invoices: { Args: never; Returns: number }
      generate_contract_invoices: {
        Args: { p_contract_id: string }
        Returns: number
      }
      get_active_zatca_certificate: { Args: never; Returns: Json }
      get_beneficiary_decrypted: {
        Args: { p_beneficiary_id: string }
        Returns: {
          bank_account: string
          email: string
          id: string
          name: string
          national_id: string
          notes: string
          phone: string
          share_percentage: number
          user_id: string
        }[]
      }
      get_max_advance_amount: {
        Args: { p_beneficiary_id: string; p_fiscal_year_id: string }
        Returns: Json
      }
      get_next_icv: { Args: never; Returns: number }
      get_pii_key: { Args: never; Returns: string }
      get_public_stats: { Args: never; Returns: Json }
      get_total_beneficiary_percentage: { Args: never; Returns: number }
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
      lookup_by_national_id: {
        Args: { p_national_id: string }
        Returns: {
          email: string
        }[]
      }
      mask_audit_fields: { Args: { p_data: Json }; Returns: Json }
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
      pay_invoice_and_record_collection: {
        Args: { p_invoice_id: string; p_paid_amount?: number }
        Returns: Json
      }
      reopen_fiscal_year: {
        Args: { p_fiscal_year_id: string; p_reason: string }
        Returns: Json
      }
      reorder_bylaws: { Args: { items: Json }; Returns: undefined }
      unpay_invoice_and_revert_collection: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      upsert_contract_allocations: {
        Args: { p_allocations: Json; p_contract_id: string }
        Returns: undefined
      }
      upsert_tenant_payment:
        | {
            Args: {
              p_contract_id: string
              p_fiscal_year_id?: string
              p_notes?: string
              p_paid_months: number
              p_payment_amount?: number
              p_property_id?: string
              p_tenant_name?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_contract_id: string
              p_fiscal_year_id?: string
              p_notes?: string
              p_paid_months: number
              p_payment_amount?: number
              p_payment_date?: string
              p_property_id?: string
              p_tenant_name?: string
            }
            Returns: Json
          }
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
