import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createCrudFactory } from '@/hooks/useCrudFactory';
import type { Tables } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// النوع العام — يُصدَّر للاستخدام في الصفحات
// ---------------------------------------------------------------------------
export type BylawEntry = Tables<'waqf_bylaws'>;

// ---------------------------------------------------------------------------
// Factory — CRUD أساسي عبر النمط الموحّد
// ---------------------------------------------------------------------------
const bylawsFactory = createCrudFactory<'waqf_bylaws', BylawEntry>({
  table: 'waqf_bylaws',
  queryKey: 'waqf_bylaws',
  orderBy: 'sort_order',
  ascending: true,
  limit: 500,
  label: 'البند',
  staleTime: 5 * 60_000,
});

// ---------------------------------------------------------------------------
// تصدير منفصل — يتبع النمط الموحّد للمشروع
// ---------------------------------------------------------------------------
export const useBylawsList = bylawsFactory.useList;
export const useCreateBylaw = bylawsFactory.useCreate;
export const useUpdateBylaw = bylawsFactory.useUpdate;
export const useDeleteBylaw = bylawsFactory.useDelete;

// ---------------------------------------------------------------------------
// هوك مخصص — إعادة ترتيب البنود عبر RPC
// ---------------------------------------------------------------------------
export const useReorderBylaws = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const { error } = await supabase.rpc('reorder_bylaws', {
        items: JSON.stringify(items),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waqf_bylaws'] });
      toast.success('تم حفظ الترتيب الجديد');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الترتيب');
    },
  });
};

// ---------------------------------------------------------------------------
// هوك مُجمَّع — للتوافق مع الصفحات الحالية (BylawsViewPage)
// يُعيد بيانات الاستعلام فقط (data, isLoading, isError, …)
// ---------------------------------------------------------------------------
export const useBylaws = bylawsFactory.useList;
