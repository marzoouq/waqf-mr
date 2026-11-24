/**
 * Feature controller for the waqf bank section (all roles).
 * الناظر يعدّل ويرفع، المحاسب يطّلع، المستفيد بإذن الناظر فقط.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useAuthState } from '@/hooks/auth/session/useAuthContext';
import {
  useWaqfBankAccount, useCurrentBankStatement, useBankBalanceLog,
  useUpdateWaqfBankAccount, useUploadBankStatement, getBankStatementUrl,
} from '@/hooks/data/financial/bank/useWaqfBankAccount';
import { bankSectionView } from '@/utils/bank/bankSectionView';
import { validateOfficialFile } from '@/utils/files/officialFile';
import type { WaqfBankAccount, WaqfBankAccountInput } from '@/types';

const toInput = (a: WaqfBankAccount): WaqfBankAccountInput => ({
  bank_name: a.bank_name, account_holder: a.account_holder,
  account_number: a.account_number ?? '', iban: a.iban ?? '',
  recorded_balance: a.recorded_balance, balance_as_of: a.balance_as_of ?? '',
  notes: a.notes ?? '',
  visible_to_beneficiaries: a.visible_to_beneficiaries,
  statement_visible_to_beneficiaries: a.statement_visible_to_beneficiaries,
});

export const useWaqfBankSection = () => {
  const { role } = useAuthState();
  const account = useWaqfBankAccount();
  const statement = useCurrentBankStatement(!!account.data);
  const view = bankSectionView(role, account.data, statement.data);
  const log = useBankBalanceLog(view.showHistory && !!account.data);
  const update = useUpdateWaqfBankAccount();
  const upload = useUploadBankStatement();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<WaqfBankAccountInput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [statementDate, setStatementDate] = useState('');

  const openEdit = () => {
    if (!account.data) return;
    setForm(toInput(account.data));
    setFile(null); setStatementDate('');
    setEditOpen(true);
  };

  const patchForm = (patch: Partial<WaqfBankAccountInput>) => setForm(f => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!account.data || !form) return;
    if (!Number.isFinite(form.recorded_balance) || form.recorded_balance < 0) { toast.error('أدخل رصيداً صحيحاً'); return; }
    if (form.iban && !/^SA\d{22}$/.test(form.iban.replace(/\s+/g, '').toUpperCase())) {
      toast.error('صيغة الآيبان غير صحيحة (SA + 22 رقماً)'); return;
    }
    try {
      await update.mutateAsync({
        id: account.data.id, input: form,
        balanceChanged: form.recorded_balance !== account.data.recorded_balance,
      });
      toast.success('حُفظت بيانات الحساب البنكي');
      setEditOpen(false);
    } catch (e) {
      logger.error('[bank] update failed', e);
      toast.error('تعذّر حفظ بيانات الحساب البنكي');
    }
  };

  const uploadStatement = async () => {
    const err = validateOfficialFile(file, 'اختر ملف الكشف البنكي');
    if (err) { toast.error(err); return; }
    try {
      await upload.mutateAsync({ file: file as File, statementDate });
      toast.success('رُفع الكشف البنكي');
      setFile(null); setStatementDate('');
    } catch (e) {
      logger.error('[bank] statement upload failed', e);
      toast.error('تعذّر رفع الكشف البنكي');
    }
  };

  const downloadStatement = async () => {
    if (!statement.data) return;
    try { window.open(await getBankStatementUrl(statement.data.storage_path), '_blank', 'noopener'); }
    catch (e) { logger.error('[bank] statement download failed', e); toast.error('تعذّر تنزيل الكشف البنكي'); }
  };

  return {
    account: account.data ?? null, isLoading: account.isLoading,
    statement: statement.data ?? null, history: log.data ?? [], view,
    editOpen, setEditOpen, openEdit, form, patchForm, save, saving: update.isPending,
    file, setFile, statementDate, setStatementDate, uploadStatement, uploading: upload.isPending,
    downloadStatement,
  };
};

export type WaqfBankSectionController = ReturnType<typeof useWaqfBankSection>;
