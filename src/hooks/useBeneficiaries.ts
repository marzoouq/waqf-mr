/**
 * هوكات إدارة المستفيدين (CRUD)
 * يوفر: useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary
 * الجدول: beneficiaries | الترتيب: حسب الاسم (تصاعدي)
 * عند إضافة مستفيد: يتم إرسال إشعار للناظر
 */
import { useCrudFactory } from './useCrudFactory';
import { Beneficiary } from '@/types/database';
import { notifyAdmins } from '@/utils/notifications';

const beneficiariesCrud = useCrudFactory<'beneficiaries', Beneficiary>({
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
