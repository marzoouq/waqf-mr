import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/utils/format/format';

/** Load only the historical summary; never infer it from live invoice balances. */
export async function fetchClosureDisclosure(fiscalYearId?: string): Promise<string | undefined> {
  if (!fiscalYearId || fiscalYearId === 'all') return undefined;
  const { data: year, error: yearError } = await supabase.from('fiscal_years').select('status').eq('id', fiscalYearId).maybeSingle();
  if (yearError) throw yearError;
  if (year?.status !== 'closed') return undefined;
  const { data, error } = await supabase.from('fiscal_closure_summaries')
    .select('overdue_count, overdue_amount, upcoming_count, upcoming_amount')
    .eq('fiscal_year_id', fiscalYearId).order('closed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return 'ملخص الإقفال غير متاح — لا تُستنتج الذمم التاريخية من الأرصدة الحالية.';
  return `ذمم مستأجرين غير محصلة عند الإقفال: ${fmt(Number(data.overdue_amount))} ريال — ${data.overdue_count} فاتورة. فواتير قادمة: ${data.upcoming_count} بمبلغ ${fmt(Number(data.upcoming_amount))} ريال. للعلم فقط ولا تدخل في الدخل أو التوزيعات.`;
}