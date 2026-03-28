/**
 * هوك تحميل مسبق للصفحات الأكثر زيارة عند تمرير الماوس على روابط Sidebar
 * يُحمّل البيانات الأساسية لكل صفحة مسبقاً لتسريع التنقل
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { prefetchComponent } from '@/lib/componentPrefetch';

const PREFETCH_STALE = 2 * 60_000; // دقيقتان — لتجنب إعادة التحميل المتكررة عند hover

export function usePrefetchPages() {
  const queryClient = useQueryClient();

  /** تحميل مسبق: العقارات */
  const prefetchProperties = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['properties'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('properties')
          .select('id, property_number, property_type, location, area, vat_exempt, description, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /** تحميل مسبق: العقود (كل السنوات) */
  const prefetchContracts = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['contracts', 'fiscal_year', 'all'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, notes, tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, created_at, updated_at, property:properties(id, property_number, property_type, location), unit:units(id, unit_number, unit_type, floor, status)')
          .order('start_date', { ascending: false })
          .limit(1000);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /** تحميل مسبق: الحسابات + المستفيدين */
  const prefetchAccounts = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['accounts'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('accounts')
          .select('id, fiscal_year, fiscal_year_id, total_income, total_expenses, net_after_expenses, vat_amount, net_after_vat, zakat_amount, admin_share, waqif_share, waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount, created_at, updated_at')
          .order('fiscal_year', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data;
      },
    });
    queryClient.prefetchQuery({
      queryKey: ['beneficiaries'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('beneficiaries_safe')
          .select('id, name, share_percentage, user_id, created_at, updated_at')
          .order('name');
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /** تحميل مسبق: السنوات المالية */
  const prefetchFiscalYears = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['fiscal_years'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('fiscal_years')
          .select('id, label, start_date, end_date, status, published, created_at')
          .order('start_date', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /**
   * يعيد دالة prefetch المناسبة بناءً على مسار الصفحة
   * يُحمّل المكوّن (JS chunk) + البيانات معاً عند hover
   */
  /** تحميل مسبق: التقارير */
  const prefetchReports = useCallback(() => {
    prefetchProperties();
    prefetchFiscalYears();
    prefetchAccounts();
  }, [prefetchProperties, prefetchFiscalYears, prefetchAccounts]);

  /** تحميل مسبق: سجل المراجعة */
  const prefetchAuditLog = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['audit_log', { page: 1 }],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('audit_log')
          .select('id, table_name, operation, record_id, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /** تحميل مسبق: الرسائل */
  const prefetchMessages = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['conversations'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, subject, type, status, created_by, participant_id, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /**
   * يعيد دالة prefetch المناسبة بناءً على مسار الصفحة
   * يُحمّل المكوّن (JS chunk) + البيانات معاً عند hover
   */
  const getPrefetchHandler = useCallback((path: string): (() => void) | undefined => {
    const handler = (): void => {
      prefetchComponent(path);

      if (path.includes('/properties')) prefetchProperties();
      else if (path.includes('/contracts')) prefetchContracts();
      else if (path.includes('/accounts')) prefetchAccounts();
      else if (path.includes('/income') || path.includes('/expenses')) {
        prefetchProperties();
        prefetchFiscalYears();
      } else if (path.includes('/invoices')) {
        prefetchProperties();
        prefetchContracts();
      } else if (path.includes('/reports') || path.includes('/annual-report') || path.includes('/comparison')) {
        prefetchReports();
      } else if (path.includes('/audit-log')) {
        prefetchAuditLog();
      } else if (path.includes('/messages')) {
        prefetchMessages();
      }
    };

    return handler;
  }, [prefetchProperties, prefetchContracts, prefetchAccounts, prefetchFiscalYears, prefetchReports, prefetchAuditLog, prefetchMessages]);

  return { getPrefetchHandler, prefetchAccounts };
}

