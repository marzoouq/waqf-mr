/**
 * هوكات إدارة المستفيدين (CRUD)
 * يوفر: useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary
 * الجدول: beneficiaries | الترتيب: حسب الاسم (تصاعدي)
 * عند إضافة مستفيد: يتم إرسال إشعار للناظر
 *
 * useBeneficiariesSafe: هوك للقراءة فقط من العرض الآمن beneficiaries_safe
 * يُستخدم في واجهات المستفيدين لإخفاء البيانات الحساسة على مستوى الخادم
 *
 * useBeneficiariesDecrypted: هوك لفك تشفير البيانات الحساسة (ناظر/محاسب فقط)
 */
import { useQuery } from '@tanstack/react-query';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { createCrudFactory } from '../core/useCrudFactory';
import { Beneficiary } from '@/types';
import { notifyAdmins } from '@/lib/services';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

const beneficiariesCrud = createCrudFactory<'beneficiaries', Beneficiary>({
  table: 'beneficiaries',
  queryKey: 'beneficiaries',
  orderBy: 'name',
  ascending: true,
  label: 'المستفيد',
  onCreateSuccess: (data) => {
    notifyAdmins(
      'مستفيد جديد',
      `تم تسجيل مستفيد جديد: ${data.name}`,
      'info',
      '/dashboard/beneficiaries',
    );
  },
});

export const useBeneficiaries = beneficiariesCrud.useList;
export const useCreateBeneficiary = beneficiariesCrud.useCreate;
export const useUpdateBeneficiary = beneficiariesCrud.useUpdate;
export const useDeleteBeneficiary = beneficiariesCrud.useDelete;

/** هوك لفك تشفير البيانات الحساسة — متاح للناظر والمحاسب فقط */
export const useBeneficiariesDecrypted = () => {
  const { role } = useAuth();
  const isAuthorized = role === 'admin' || role === 'accountant';
  return useQuery({
    queryKey: ['beneficiaries-decrypted'],
    enabled: isAuthorized,
    staleTime: STALE_STATIC,
    queryFn: async () => {
      if (!isAuthorized) return [];
      try {
        const data = await rpc<Beneficiary[]>('get_beneficiary_decrypted', {
          // RPC يتوقع string لكن null يعني "جلب الكل" — cast ضروري
          p_beneficiary_id: null as unknown as string,
        });
        return (data || []) as Beneficiary[];
      } catch (e) {
        // fallback to regular query if RPC fails
        logger.warn('فك التشفير غير متاح، عرض البيانات المشفرة:', e instanceof Error ? e.message : e);
        const { data: fallback, error: fbError } = await supabase
          .from('beneficiaries_safe')
          .select('id, name, share_percentage, email, phone, notes, user_id, created_at, updated_at')
          .order('name', { ascending: true })
          .limit(500);
        if (fbError) throw fbError;
        return fallback as Beneficiary[];
      }
    },
  });
};

/** هوك للقراءة فقط من العرض الآمن — يُخفي البيانات الحساسة على مستوى الخادم */
export const useBeneficiariesSafe = () => {
  return useQuery({
    queryKey: ['beneficiaries-safe'],
    staleTime: STALE_STATIC,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, share_percentage, user_id, email, phone, national_id, bank_account, notes, created_at, updated_at')
        .order('name', { ascending: true })
        .limit(500);
      if (error) {
        if (error.code === '42501') {
          logger.warn('[useBeneficiariesSafe] RLS permission denied (42501) — returning empty', error.message);
          // ملاحظة: لا نستدعي toast هنا (قاعدة NoToastInDataHooks).
          // الطبقة المستهلكة (hooks/page) مسؤولة عن عرض رسالة المستخدم
          // عبر فحص isError/data من React Query.
          return [];
        }
        throw error;
      }
      return data;
    },
  });
};
