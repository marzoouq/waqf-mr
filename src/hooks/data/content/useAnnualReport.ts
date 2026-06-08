/**
 * هوكات التقرير السنوي — CRUD لعناصر التقرير + حالة النشر
 *
 * طبقة بيانات نقية: لا توست هنا — تُضاف من طبقة الصفحة عبر
 * `mutate(vars, { onSuccess, onError })` أو الـ wrapper المخصص.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL, STALE_STATIC } from '@/lib/queryStaleTime';
import { annualReportService } from '@/lib/services/annualReportService';

// ملاحظة: useIncomeComparison في طبقة domain — استورده مباشرة من
// '@/hooks/domain/financial/useIncomeComparison' (طبقة data لا تعتمد على domain).

// ---------------------------------------------------------------------------
// أنواع البيانات — تُعرَّف في @/types/annualReport (اتجاه اعتماد صحيح)
// ---------------------------------------------------------------------------
export type { SectionType, AnnualReportItem, AnnualReportStatus } from '@/types/annualReport';

// ---------------------------------------------------------------------------
// عناصر التقرير
// ---------------------------------------------------------------------------
export const useAnnualReportItems = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['annual_report_items', fiscalYearId],
    queryFn: () => (fiscalYearId ? annualReportService.listItems(fiscalYearId) : Promise.resolve([])),
    enabled: !!fiscalYearId,
    staleTime: STALE_FINANCIAL,
  });
};

export const useCreateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Omit<AnnualReportItem, 'id' | 'created_at' | 'updated_at'> & { property_id?: string | null }) =>
      annualReportService.createItem(item),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_items', v.fiscal_year_id] });
    },
    onError: (e) => {
      logger.error('خطأ في إضافة عنصر التقرير:', e);
    },
  });
};

export const useUpdateReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<AnnualReportItem> & { id: string }) =>
      annualReportService.updateItem(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annual_report_items'], exact: false });
    },
  });
};

export const useDeleteReportItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => annualReportService.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annual_report_items'] });
    },
  });
};

// ---------------------------------------------------------------------------
// حالة النشر
// ---------------------------------------------------------------------------
export const useReportStatus = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['annual_report_status', fiscalYearId],
    queryFn: () => (fiscalYearId ? annualReportService.getStatus(fiscalYearId) : Promise.resolve(null)),
    enabled: !!fiscalYearId,
    staleTime: STALE_STATIC,
  });
};

export const useToggleReportPublish = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fiscalYearId, publish }: { fiscalYearId: string; publish: boolean }) =>
      annualReportService.setPublishStatus(fiscalYearId, publish),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['annual_report_status', v.fiscalYearId] });
    },
  });
};
