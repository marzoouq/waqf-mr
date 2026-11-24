/** Waqf bank account section (رقبة الوقف في الحساب البنكي). */
export type BankBalanceSource = 'manual' | 'corpus_carryforward';

export interface WaqfBankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string | null;
  iban: string | null;
  recorded_balance: number;
  balance_as_of: string | null;
  balance_source: BankBalanceSource;
  source_fiscal_year_id: string | null;
  source_fiscal_year_label: string | null;
  notes: string | null;
  visible_to_beneficiaries: boolean;
  statement_visible_to_beneficiaries: boolean;
  updated_at: string;
}

export interface WaqfBankStatement {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  statement_date: string | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface WaqfBankBalanceLogEntry {
  id: string;
  previous_balance: number | null;
  new_balance: number;
  source: string;
  note: string | null;
  created_at: string;
}

export interface WaqfBankAccountInput {
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string;
  recorded_balance: number;
  balance_as_of: string;
  notes: string;
  visible_to_beneficiaries: boolean;
  statement_visible_to_beneficiaries: boolean;
}
