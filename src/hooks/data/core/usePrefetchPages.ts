/**
 * هوك تحميل مسبق للصفحات الأكثر زيارة عند تمرير الماوس على روابط Sidebar
 * يُحمّل البيانات الأساسية لكل صفحة مسبقاً لتسريع التنقل
 *
 * يعيد استخدام queryOptions من CRUD hooks لتجنب تكرار select/order/limit
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { prefetchComponent } from '@/lib/componentPrefetch';
import { propertiesQueryOptions } from '@/hooks/data/properties/useProperties';
import { contractsQueryOptions } from '@/hooks/data/contracts/useContracts';
import { accountsQueryOptions } from '@/hooks/data/financial/useAccounts';
import { unitsQueryOptions } from '@/hooks/data/properties/useUnits';

const PREFETCH_STALE = 2 * 60_000; // دقيقتان — لتجنب إعادة التحميل المتكررة عند hover

export function usePrefetchPages() {
  const queryClient = useQueryClient();

  /** تحميل مسبق: العقارات — من CRUD factory */
  const prefetchProperties = useCallback(() => {
    const opts = propertiesQueryOptions(0);
    queryClient.prefetchQuery({ ...opts, staleTime: PREFETCH_STALE });
  }, [queryClient]);

  /** تحميل مسبق: العقود — من CRUD factory */
  const prefetchContracts = useCallback(() => {
    const opts = contractsQueryOptions(0);
    queryClient.prefetchQuery({ ...opts, staleTime: PREFETCH_STALE });
  }, [queryClient]);

  /** تحميل مسبق: الحسابات + المستفيدين */
  const prefetchAccounts = useCallback(() => {
    const opts = accountsQueryOptions(0);
    queryClient.prefetchQuery({ ...opts, staleTime: PREFETCH_STALE });

    // المستفيدين — من view آمنة (لا CRUD factory)
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

  /** تحميل مسبق: السنوات المالية (لا CRUD factory — استعلام خاص) */
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

  /** تحميل مسبق: الوحدات — من CRUD factory */
  const prefetchUnits = useCallback(() => {
    const opts = unitsQueryOptions(0);
    queryClient.prefetchQuery({ ...opts, staleTime: PREFETCH_STALE });
  }, [queryClient]);

  /** تحميل مسبق: فواتير الدفعات (لا CRUD factory — استعلام مخصص) */
  const prefetchPaymentInvoices = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['payment_invoices', 'all'],
      staleTime: PREFETCH_STALE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payment_invoices')
          .select('id, contract_id, fiscal_year_id, payment_number, due_date, amount, paid_date, paid_amount, status, invoice_number, vat_rate, vat_amount, notes, created_at, updated_at')
          .order('due_date', { ascending: false })
          .limit(1000);
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  /** تحميل مسبق: التقارير */
  const prefetchReports = useCallback(() => {
    prefetchProperties();
    prefetchFiscalYears();
    prefetchAccounts();
    prefetchUnits();
    prefetchPaymentInvoices();
  }, [prefetchProperties, prefetchFiscalYears, prefetchAccounts, prefetchUnits, prefetchPaymentInvoices]);

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

  // throttle لمنع طلبات متزامنة عند التمرير السريع على القائمة
  const lastPrefetchRef = useRef<number>(0);
  const THROTTLE_MS = 300;

  const getPrefetchHandler = useCallback((path: string): (() => void) | undefined => {
    const handler = (): void => {
      const now = Date.now();
      if (now - lastPrefetchRef.current < THROTTLE_MS) return;
      lastPrefetchRef.current = now;
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
