/**
 * Data hooks for the waqf bank account section. RLS decides visibility:
 * المستفيد لا يستلم أي صف ما لم يفعّل الناظر الإظهار.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaqfBankAccount, WaqfBankAccountInput, WaqfBankStatement, WaqfBankBalanceLogEntry } from '@/types';

export const BANK_STATEMENTS_BUCKET = 'waqf-bank-statements';
const KEY = ['waqf_bank'] as const;

export const useWaqfBankAccount = () =>
  useQuery({
    queryKey: [...KEY, 'account'],
    staleTime: 60_000,
    queryFn: async (): Promise<WaqfBankAccount | null> => {
      const { data, error } = await supabase.from('waqf_bank_account')
        .select('id,bank_name,account_holder,account_number,iban,recorded_balance,balance_as_of,balance_source,source_fiscal_year_id,notes,visible_to_beneficiaries,statement_visible_to_beneficiaries,updated_at,fiscal_years(label)')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { fiscal_years: fy, ...row } = data as typeof data & { fiscal_years: { label: string } | null };
      return {
        ...row,
        recorded_balance: Number(row.recorded_balance),
        balance_source: row.balance_source === 'corpus_carryforward' ? 'corpus_carryforward' : 'manual',
        source_fiscal_year_label: fy?.label ?? null,
      };
    },
  });

/** Current statement only (beneficiaries never receive older ones). */
export const useCurrentBankStatement = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'statement'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<WaqfBankStatement | null> => {
      const { data, error } = await supabase.from('waqf_bank_statements')
        .select('id,storage_path,file_name,mime_type,file_size_bytes,statement_date,notes,is_current,created_at')
        .eq('is_current', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useBankBalanceLog = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'log'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<WaqfBankBalanceLogEntry[]> => {
      const { data, error } = await supabase.from('waqf_bank_balance_log')
        .select('id,previous_balance,new_balance,source,note,created_at')
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        new_balance: Number(r.new_balance),
        previous_balance: r.previous_balance === null ? null : Number(r.previous_balance),
      }));
    },
  });

/** Admin edit — a manual balance change is logged server-side. */
export const useUpdateWaqfBankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input, balanceChanged }: { id: string; input: WaqfBankAccountInput; balanceChanged: boolean }) => {
      const { error } = await supabase.from('waqf_bank_account').update({
        bank_name: input.bank_name.trim(),
        account_holder: input.account_holder.trim(),
        account_number: input.account_number.trim() || null,
        iban: input.iban.replace(/\s+/g, '').toUpperCase() || null,
        recorded_balance: input.recorded_balance,
        balance_as_of: input.balance_as_of || null,
        notes: input.notes.trim() || null,
        visible_to_beneficiaries: input.visible_to_beneficiaries,
        statement_visible_to_beneficiaries: input.statement_visible_to_beneficiaries,
        ...(balanceChanged ? { balance_source: 'manual', source_fiscal_year_id: null } : {}),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); },
  });
};

/** Upload a new statement; the previous one is kept but no longer current. */
export const useUploadBankStatement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, statementDate }: { file: File; statementDate: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('غير مسجل الدخول');
      const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `statements/${Date.now()}.${ext}`;
      const up = await supabase.storage.from(BANK_STATEMENTS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const arch = await supabase.from('waqf_bank_statements').update({ is_current: false }).eq('is_current', true);
      if (arch.error) throw arch.error;
      const ins = await supabase.from('waqf_bank_statements').insert({
        storage_path: path, file_name: file.name, mime_type: file.type, file_size_bytes: file.size,
        statement_date: statementDate || null, uploaded_by: uid,
      });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); },
  });
};

export const getBankStatementUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(BANK_STATEMENTS_BUCKET).createSignedUrl(path, 120);
  if (error || !data) throw error ?? new Error('تعذّر إنشاء الرابط');
  return data.signedUrl;
};
