import { useCrudFactory } from './useCrudFactory';
import { Income } from '@/types/database';
import { notifyAllBeneficiaries } from '@/utils/notifications';

const incomeCrud = useCrudFactory<'income', Income>({
  table: 'income',
  queryKey: 'income',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'الدخل',
  onCreateSuccess: (data) => {
    notifyAllBeneficiaries(
      'دخل جديد',
      `تم تسجيل دخل جديد (${data.source}) بمبلغ ${Number(data.amount).toLocaleString('ar-SA')} ريال`,
      'payment',
      '/beneficiary/disclosure',
    );
  },
});

export const useIncome = incomeCrud.useList;
export const useCreateIncome = incomeCrud.useCreate;
export const useUpdateIncome = incomeCrud.useUpdate;
export const useDeleteIncome = incomeCrud.useDelete;
