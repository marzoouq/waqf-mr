/**
 * هوكات إدارة المستفيدين (CRUD)
 * يوفر: useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary
 * الجدول: beneficiaries | الترتيب: حسب الاسم (تصاعدي)
 * عند إضافة مستفيد: يتم إرسال إشعار للناظر
 *
 * useBeneficiariesSafe: هوك للقراءة فقط من العرض الآمن beneficiaries_safe
 * يُستخدم في واجهات المستفيدين لإخفاء البيانات الحساسة على مستوى الخادم
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createCrudFactory } from './useCrudFactory';
import { Beneficiary } from '@/types/database';
import { notifyAdmins } from '@/utils/notifications';

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

/** هوك للقراءة فقط من العرض الآمن — يُخفي البيانات الحساسة على مستوى الخادم */
export const useBeneficiariesSafe = () => {
  return useQuery({
    queryKey: ['beneficiaries-safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('*')
        .order('name', { ascending: true })
        .limit(500);
      if (error) {
        if (error.code === '42501') {
          return [];
        }
        throw error;
      }
      return data;
    },
  });
};
