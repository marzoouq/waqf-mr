/**
 * هوكات التقرير السنوي — CRUD لعناصر التقرير + حالة النشر + مقارنة الدخل
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
        .select('*')
        .eq('fiscal_year_id', fiscalYearId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as AnnualReportItem[];
    },
    enabled: !!fiscalYearId,
    staleTime: 60_000,
  });
};

export const useCreateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<AnnualReportItem, 'id' | 'created_at' | 'updated_at'> & { property_id?: string | null }) => {
      const { data, error } = await supabase
        .from('annual_report_items')
        .insert(item as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_items', v.fiscal_year_id] });
      toast.success('تمت إضافة العنصر بنجاح');
    },
    onError: (e) => {
      logger.error('خطأ في إضافة عنصر التقرير:', e);
      toast.error('فشل في إضافة العنصر');
    },
  });
};

export const useUpdateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AnnualReportItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('annual_report_items')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, _v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_items'], exact: false });
      toast.success('تم تحديث العنصر');
    },
    onError: () => toast.error('فشل في تحديث العنصر'),
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
      toast.success('تم حذف العنصر');
    },
    onError: () => toast.error('فشل في حذف العنصر'),
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
        .select('*')
        .eq('fiscal_year_id', fiscalYearId)
        .maybeSingle();
      if (error) throw error;
      return data as AnnualReportStatus | null;
    },
    enabled: !!fiscalYearId,
    staleTime: 60_000,
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
          { fiscal_year_id: fiscalYearId, status: newStatus, published_at: publishedAt } as never,
          { onConflict: 'fiscal_year_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_status', v.fiscalYearId] });
      toast.success(v.publish ? 'تم نشر التقرير السنوي' : 'تم إرجاع التقرير إلى مسودة');
    },
    onError: () => toast.error('فشل في تحديث حالة النشر'),
  });
};

// ---------------------------------------------------------------------------
// مقارنة الدخل عبر السنوات المالية
// ---------------------------------------------------------------------------
export interface IncomeComparison {
  label: string;
  total: number;
}

export const useIncomeComparison = () => {
  return useQuery({
    queryKey: ['income_comparison'],
    queryFn: async () => {
      // جلب آخر 4 سنوات مالية
      const { data: years, error: fyErr } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .order('start_date', { ascending: false })
        .limit(4);
      if (fyErr) throw fyErr;
      if (!years?.length) return [];

      // جلب كل الدخل لهذه السنوات في استعلام واحد (بدلاً من N+1)
      const yearIds = years.map(y => y.id);
      const { data: allIncome, error: incErr } = await supabase
        .from('income')
        .select('fiscal_year_id, amount')
        .in('fiscal_year_id', yearIds);
      if (incErr) throw incErr;

      // تجميع الدخل حسب السنة المالية
      const totalsMap = new Map<string, number>();
      for (const row of allIncome || []) {
        const current = totalsMap.get(row.fiscal_year_id!) || 0;
        totalsMap.set(row.fiscal_year_id!, current + Number(row.amount));
      }

      const results: IncomeComparison[] = years.map(fy => ({
        label: fy.label,
        total: totalsMap.get(fy.id) || 0,
      }));

      return results.reverse(); // الأقدم أولاً
    },
    staleTime: 5 * 60_000,
  });
};
