/**
 * useUpdateBeneficiarySelf — طبقة data لتحديث بيانات المستفيد لنفسه
 * (#B4) يستدعي RPC `update_beneficiary_self` (SECURITY DEFINER).
 *
 * طبقة data نقية: لا toast، لا state، فقط mutation.
 * إشعارات المستخدم في wrapper hooks/page/.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';

export interface UpdateBeneficiarySelfInput {
  bankAccount: string | null;
  phone: string | null;
}

export const useUpdateBeneficiarySelf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bankAccount, phone }: UpdateBeneficiarySelfInput) => {
      return await rpc('update_beneficiary_self', {
        p_bank_account: bankAccount,
        p_phone: phone,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
  });
};
