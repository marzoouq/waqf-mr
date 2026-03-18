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
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { createCrudFactory } from './useCrudFactory';
import { Beneficiary } from '@/types/database';
import { notifyAdmins } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

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
    queryFn: async () => {
      if (!isAuthorized) return [];
      const { data, error } = await supabase.rpc('get_beneficiary_decrypted', {
        p_beneficiary_id: null as unknown as string,
      });
      if (error) {
        // fallback to regular query if RPC fails
        logger.warn('فك التشفير غير متاح، عرض البيانات المشفرة:', error.message);
      const { data: fallback, error: fbError } = await supabase
          .from('beneficiaries_safe')
          .select('id, name, share_percentage, email, phone, notes, user_id, created_at, updated_at')
          .order('name', { ascending: true })
          .limit(500);
        if (fbError) throw fbError;
        return fallback as Beneficiary[];
      }
      return (data || []) as Beneficiary[];
    },
  });
};

/** هوك للقراءة فقط من العرض الآمن — يُخفي البيانات الحساسة على مستوى الخادم */
export const useBeneficiariesSafe = () => {
  return useQuery({
    queryKey: ['beneficiaries-safe'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('*')
        .order('name', { ascending: true })
        .limit(500);
      if (error) {
        if (error.code === '42501') {
          logger.warn('[useBeneficiariesSafe] RLS permission denied (42501) — returning empty', error.message);
          return [];
        }
        throw error;
      }
      return data;
    },
  });
};
