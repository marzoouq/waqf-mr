/**
 * بطاقة 8 — فحوصات مالية (5)
 * تكتشف تناقضات بين الفواتير والتوزيعات والعقود.
 */
import { supabase } from '@/integrations/supabase/client';
import { todayLocalISO } from '@/utils/date/dateOnly';
import type { CheckResult } from '../types';

/** F1: payment_invoices status=partially_paid لكن paid=0 أو ≥ amount */
export async function checkPartiallyPaidConsistency(): Promise<CheckResult> {
  const id = 'fin_partial_paid';
  const label = 'اتساق الفواتير الجزئية';
  try {
    const { data, error } = await supabase
      .from('payment_invoices')
      .select('id, amount, paid_amount, status')
      .eq('status', 'partially_paid')
      .limit(1000);
    if (error) return { id, label, status: 'warn', detail: error.message };
    const bad = (data ?? []).filter(r => {
      const t = Number(r.amount) || 0;
      const p = Number(r.paid_amount) || 0;
      return p <= 0 || p >= t;
    });
    if (bad.length === 0) return { id, label, status: 'pass', detail: 'لا تناقضات' };
    return { id, label, status: 'fail', detail: `${bad.length} فاتورة غير متسقة` };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** F2: مجموع التوزيعات في السنة النشطة */
export async function checkDistributionsVsAvailable(): Promise<CheckResult> {
  const id = 'fin_dist_vs_available';
  const label = 'التوزيعات مقابل المتاح';
  try {
    const { data: fy, error: fyErr } = await supabase
      .from('fiscal_years')
      .select('id, status')
      .eq('status', 'active')
      .maybeSingle();
    if (fyErr || !fy) return { id, label, status: 'info', detail: 'لا توجد سنة نشطة' };
    const { data: dist, error: dErr } = await supabase
      .from('distributions')
      .select('amount')
      .eq('fiscal_year_id', fy.id);
    if (dErr) return { id, label, status: 'warn', detail: dErr.message };
    const total = (dist ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    if (total <= 0) return { id, label, status: 'pass', detail: 'لا توزيعات بعد' };
    return { id, label, status: 'info', detail: `إجمالي التوزيعات: ${total.toFixed(2)}` };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** F3: مستفيدون بنسبة > 0 بدون حساب بنكي */
export async function checkBeneficiariesWithoutAccount(): Promise<CheckResult> {
  const id = 'fin_no_account';
  const label = 'مستفيدون بلا حساب بنكي';
  try {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('id, name, bank_account, share_percentage')
      .gt('share_percentage', 0)
      .limit(1000);
    if (error) return { id, label, status: 'warn', detail: error.message };
    const missing = (data ?? []).filter(b => !b.bank_account || String(b.bank_account).trim() === '');
    if (missing.length === 0) return { id, label, status: 'pass', detail: 'كل المستفيدين لديهم حساب' };
    return { id, label, status: 'warn', detail: `${missing.length} مستفيد بدون حساب بنكي` };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** F4: عقود نشطة بإيجار > 0 لكن بدون contract_fiscal_allocations */
export async function checkContractsWithoutAllocations(): Promise<CheckResult> {
  const id = 'fin_contracts_no_alloc';
  const label = 'عقود نشطة بلا توزيع';
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, contract_number, rent_amount, status')
      .eq('status', 'active')
      .gt('rent_amount', 0)
      .limit(1000);
    if (error) return { id, label, status: 'warn', detail: error.message };
    const contracts = data ?? [];
    if (contracts.length === 0) return { id, label, status: 'pass', detail: 'لا عقود نشطة' };
    const ids = contracts.map(c => c.id);
    const { data: allocs } = await supabase
      .from('contract_fiscal_allocations')
      .select('contract_id')
      .in('contract_id', ids);
    const allocSet = new Set((allocs ?? []).map(a => a.contract_id));
    const missing = contracts.filter(c => !allocSet.has(c.id));
    if (missing.length === 0) return { id, label, status: 'pass', detail: 'جميع العقود موزّعة' };
    return { id, label, status: 'warn', detail: `${missing.length} عقد بلا توزيع` };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** F5: payment_invoices partially_paid متأخرة (due_date < اليوم) */
export async function checkOverduePartiallyPaid(): Promise<CheckResult> {
  const id = 'fin_overdue_partial';
  const label = 'فواتير جزئية متأخرة';
  try {
    const today = todayLocalISO();
    const { data, error } = await supabase
      .from('payment_invoices')
      .select('id, due_date, status')
      .eq('status', 'partially_paid')
      .lt('due_date', today)
      .limit(1000);
    if (error) return { id, label, status: 'warn', detail: error.message };
    const count = (data ?? []).length;
    if (count === 0) return { id, label, status: 'pass', detail: 'لا توجد متأخرات جزئية' };
    return { id, label, status: 'warn', detail: `${count} فاتورة جزئية متأخرة` };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}
