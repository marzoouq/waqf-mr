/**
 * خدمة العمليات على السنوات المالية
 */
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';

export const createFiscalYear = async (data: { label: string; start_date: string; end_date: string }) => {
  const { error } = await supabase.from('fiscal_years').insert({
    label: data.label,
    start_date: data.start_date,
    end_date: data.end_date,
    status: 'active',
    published: false,
  });
  if (error) throw error;
};

export const reopenFiscalYear = async (fiscalYearId: string, reason: string) => {
  return await rpc<{ label: string }>('reopen_fiscal_year', {
    p_fiscal_year_id: fiscalYearId,
    p_reason: reason,
  });
};

export const toggleFiscalYearPublished = async (fiscalYearId: string, published: boolean) => {
  const { error } = await supabase.from('fiscal_years').update({ published }).eq('id', fiscalYearId);
  if (error) throw error;
};

export const deleteFiscalYear = async (fiscalYearId: string) => {
  const { error } = await supabase.from('fiscal_years').delete().eq('id', fiscalYearId);
  if (error) throw error;
};

/**
 * حذف شامل للسنة المالية وكل بياناتها المرتبطة (للناظر فقط).
 * يستدعي دالة قاعدة بيانات آمنة تتحقق من دور الأدمن قبل التنفيذ.
 */
export const deleteFiscalYearCascade = async (fiscalYearId: string) => {
  return await rpc<{ success: boolean; label: string; deleted: Record<string, number> }>(
    'delete_fiscal_year_cascade',
    { p_fiscal_year_id: fiscalYearId },
  );
};

export const fetchActiveFiscalYear = async () => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};
