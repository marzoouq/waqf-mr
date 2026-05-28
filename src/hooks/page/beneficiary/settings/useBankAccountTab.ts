/**
 * useBankAccountTab — page hook لتبويب الحساب البنكي للمستفيد
 * يجمع state محلية + toast + استدعاء data hook النقي.
 */
import { useState } from 'react';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { useUpdateBeneficiarySelf } from '@/hooks/data/beneficiaries/useUpdateBeneficiarySelf';

interface UseBankAccountTabArgs {
  bankAccount: string | null;
  phone: string | null;
}

export const useBankAccountTab = ({ bankAccount, phone }: UseBankAccountTabArgs) => {
  const [bank, setBank] = useState(bankAccount ?? '');
  const [phoneVal, setPhoneVal] = useState(phone ?? '');
  const mutation = useUpdateBeneficiarySelf();

  const noChange =
    bank.trim() === (bankAccount ?? '').trim() &&
    phoneVal.trim() === (phone ?? '').trim();

  const handleSave = () => {
    mutation.mutate(
      { bankAccount: bank.trim() || null, phone: phoneVal.trim() || null },
      {
        onSuccess: () => uiNotify.success('تم حفظ بياناتك بنجاح'),
        onError: (err: unknown) => {
          logger.error('update_beneficiary_self failed', err);
          const msg = err instanceof Error ? err.message : 'تعذّر حفظ التعديلات';
          uiNotify.error(msg);
        },
      }
    );
  };

  return {
    bank,
    setBank,
    phoneVal,
    setPhoneVal,
    isSaving: mutation.isPending,
    noChange,
    handleSave,
  };
};
