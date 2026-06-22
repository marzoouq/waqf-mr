/**
 * @deprecated F19 (Forensic 2026-06-22): لا مستهلكين خارج هذا الملف.
 * مرشّح للحذف بعد فترة مراقبة. لا تستخدمه في كود جديد.
 */
/**
 * useContractsForPdf — جلب lazy للعقود لأغراض تصدير PDF فقط.
 *
 * مستخرج من `useMySharePage` للالتزام بـ v7 (لا يجوز استيراد supabase داخل page hooks).
 * يُعيد دالة async تأخذ `fiscalYearId` وتُرجع قائمة العقود المختصرة.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContractForPdf {
  contract_number: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
}

export function useContractsForPdf() {
  return useCallback(async (fiscalYearId?: string | null): Promise<ContractForPdf[]> => {
    // R3 (W3-001 defense): استخدام contracts_safe بدلاً من contracts الخام
    // يضمن إخفاء tenant_name تلقائياً عن غير الناظر/المحاسب عبر طبقة العرض الآمن
    let query = supabase
      .from('contracts_safe')
      .select('contract_number, tenant_name, rent_amount, status')
      .order('created_at', { ascending: false });
    if (fiscalYearId && fiscalYearId !== 'all') {
      query = query.eq('fiscal_year_id', fiscalYearId);
    }
    const { data } = await query;
    return (data ?? []) as ContractForPdf[];
  }, []);
}
