/**
 * annualReportService — عناصر التقرير السنوي + حالة النشر.
 * مستخرج من useAnnualReport.ts ضمن M2.6.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { AnnualReportItem, AnnualReportStatus } from '@/types/annualReport';

const ITEM_FIELDS =
  'id, fiscal_year_id, section_type, title, content, property_id, sort_order, created_at, updated_at';
const STATUS_FIELDS = 'id, fiscal_year_id, status, published_at, created_at';

export const annualReportService = {
  // ── العناصر ──
  async listItems(fiscalYearId: string): Promise<AnnualReportItem[]> {
    const { data, error } = await supabase
      .from('annual_report_items')
      .select(ITEM_FIELDS)
      .eq('fiscal_year_id', fiscalYearId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as AnnualReportItem[];
  },

  async createItem(
    item: Omit<AnnualReportItem, 'id' | 'created_at' | 'updated_at'> & { property_id?: string | null },
  ): Promise<AnnualReportItem> {
    const { data, error } = await supabase
      .from('annual_report_items')
      .insert(item as Database['public']['Tables']['annual_report_items']['Insert'])
      .select()
      .single();
    if (error) throw error;
    return data as AnnualReportItem;
  },

  async updateItem(id: string, updates: Partial<AnnualReportItem>): Promise<AnnualReportItem> {
    const { data, error } = await supabase
      .from('annual_report_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['annual_report_items']['Update'])
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnnualReportItem;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('annual_report_items').delete().eq('id', id);
    if (error) throw error;
  },

  // ── حالة النشر ──
  async getStatus(fiscalYearId: string): Promise<AnnualReportStatus | null> {
    const { data, error } = await supabase
      .from('annual_report_status')
      .select(STATUS_FIELDS)
      .eq('fiscal_year_id', fiscalYearId)
      .maybeSingle();
    if (error) throw error;
    return data as AnnualReportStatus | null;
  },

  async setPublishStatus(fiscalYearId: string, publish: boolean) {
    const newStatus = publish ? 'published' : 'draft';
    const publishedAt = publish ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('annual_report_status')
      .upsert(
        {
          fiscal_year_id: fiscalYearId,
          status: newStatus,
          published_at: publishedAt,
        } as Database['public']['Tables']['annual_report_status']['Insert'],
        { onConflict: 'fiscal_year_id' },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── بيانات التقرير السنوي المُجمَّع ──
  /** قراءة آخر 500 توزيع مدفوع لسنة مالية محددة (مصدر تفاصيل التقرير المُجمَّع). */
  async listAggregatedDistributions(fiscalYearId: string): Promise<AggregatedDistributionRow[]> {
    const { data, error } = await supabase
      .from('distributions')
      .select('date, amount, status, beneficiary:beneficiaries(name)')
      .eq('fiscal_year_id', fiscalYearId)
      .eq('status', 'paid')
      .order('date', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as unknown as AggregatedDistributionRow[];
  },
};

export interface AggregatedDistributionRow {
  date: string;
  amount: number;
  status: string;
  beneficiary: { name: string } | null;
}
