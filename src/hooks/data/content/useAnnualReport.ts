/**
 * هوكات التقرير السنوي — CRUD لعناصر التقرير + حالة النشر
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL, STALE_STATIC } from '@/lib/queryStaleTime';

// إعادة تصدير للتوافق مع الاستيرادات القائمة
export { useIncomeComparison, type IncomeComparison } from '../financial/useIncomeComparison';

// ---------------------------------------------------------------------------
// أنواع البيانات
// ---------------------------------------------------------------------------
export type SectionType = 'achievement' | 'challenge' | 'future_plan' | 'property_status';

export interface AnnualReportItem {
  id: string;
  fiscal_year_id: string;
  section_type: string;
  title: string;
  content: string;
  property_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AnnualReportStatus {
  id: string;
  fiscal_year_id: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// عناصر التقرير
// ---------------------------------------------------------------------------
export const useAnnualReportItems = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['annual_report_items', fiscalYearId],
    queryFn: async () => {
      if (!fiscalYearId) return [];
      const { data, error } = await supabase
        .from('annual_report_items')
        .select('id, fiscal_year_id, section_type, title, content, property_id, sort_order, created_at, updated_at')
        .eq('fiscal_year_id', fiscalYearId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as AnnualReportItem[];
    },
    enabled: !!fiscalYearId,
    staleTime: STALE_FINANCIAL,
  });
};

export const useCreateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<AnnualReportItem, 'id' | 'created_at' | 'updated_at'> & { property_id?: string | null }) => {
      const { data, error } = await supabase
        .from('annual_report_items')
        .insert(item as Database['public']['Tables']['annual_report_items']['Insert'])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_items', v.fiscal_year_id] });
      defaultNotify.success('تمت إضافة العنصر بنجاح');
    },
    onError: (e) => {
      logger.error('خطأ في إضافة عنصر التقرير:', e);
      defaultNotify.error('فشل في إضافة العنصر');
    },
  });
};

export const useUpdateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AnnualReportItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('annual_report_items')
        .update({ ...updates, updated_at: new Date().toISOString() } as Database['public']['Tables']['annual_report_items']['Update'])
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, _v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_items'], exact: false });
      defaultNotify.success('تم تحديث العنصر');
    },
    onError: () => defaultNotify.error('فشل في تحديث العنصر'),
  });
};

export const useDeleteReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('annual_report_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annual_report_items'] });
      defaultNotify.success('تم حذف العنصر');
    },
    onError: () => defaultNotify.error('فشل في حذف العنصر'),
  });
};

// ---------------------------------------------------------------------------
// حالة النشر
// ---------------------------------------------------------------------------
export const useReportStatus = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['annual_report_status', fiscalYearId],
    queryFn: async () => {
      if (!fiscalYearId) return null;
      const { data, error } = await supabase
        .from('annual_report_status')
        .select('id, fiscal_year_id, status, published_at, created_at')
        .eq('fiscal_year_id', fiscalYearId)
        .maybeSingle();
      if (error) throw error;
      return data as AnnualReportStatus | null;
    },
    enabled: !!fiscalYearId,
    staleTime: STALE_STATIC,
  });
};

export const useToggleReportPublish = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fiscalYearId, publish }: { fiscalYearId: string; publish: boolean }) => {
      const newStatus = publish ? 'published' : 'draft';
      const publishedAt = publish ? new Date().toISOString() : null;
      const { data, error } = await supabase
        .from('annual_report_status')
        .upsert(
          { fiscal_year_id: fiscalYearId, status: newStatus, published_at: publishedAt } as Database['public']['Tables']['annual_report_status']['Insert'],
          { onConflict: 'fiscal_year_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_status', v.fiscalYearId] });
      defaultNotify.success(v.publish ? 'تم نشر التقرير السنوي' : 'تم إرجاع التقرير إلى مسودة');
    },
    onError: () => defaultNotify.error('فشل في تحديث حالة النشر'),
  });
};
