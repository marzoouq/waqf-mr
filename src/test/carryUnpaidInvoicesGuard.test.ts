/**
 * حارس ترحيل الفواتير غير المسددة عند إقفال السنة.
 * - كل فاتورة غير مسددة تنتقل للسنة التالية (بلا استثناء ZATCA)
 * - المتأخرة تحفظ سنتها الأصلية وإشعار للناظر
 * - تحصيل المتأخرة المرحّلة يُسجَّل بتاريخ التحصيل في السنة الجديدة
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildClosureChecklist } from '@/utils/accounts/closeYearChecklist';

const sql = readFileSync('drizzle/migrations/0023_carry_unpaid_invoices_on_close.sql', 'utf8');
const closeFn = sql.slice(sql.indexOf('FUNCTION public.close_fiscal_year'), sql.indexOf('FUNCTION public.pay_invoice_and_record_collection'));
const payFn = sql.slice(sql.indexOf('FUNCTION public.pay_invoice_and_record_collection'));

describe('ترحيل الفواتير غير المسددة عند الإقفال', () => {
  it('ينقل كل فاتورة pending/overdue للسنة التالية دون شرط ZATCA', () => {
    expect(closeFn).toMatch(/fiscal_year_id = v_existing_next_id/);
    expect(closeFn).toMatch(/status IN \('pending', 'overdue'\)/);
    expect(closeFn).not.toMatch(/zatca_status IS NULL OR zatca_status = 'not_submitted'/);
  });
  it('يحفظ السنة الأصلية للمتأخرة فقط (استحقاقها داخل السنة المقفلة)', () => {
    expect(closeFn).toMatch(/origin_fiscal_year_id = COALESCE\(origin_fiscal_year_id, CASE WHEN due_date <= v_fy\.end_date THEN p_fiscal_year_id END\)/);
  });
  it('يشعر الناظر بالمتأخرات المرحّلة', () => {
    expect(closeFn).toMatch(/notify_admins/);
  });
  it('تحصيل المتأخرة المرحّلة يُؤرَّخ بتاريخ التحصيل في سنة الفاتورة الحالية', () => {
    expect(payFn).toMatch(/WHEN v_invoice\.origin_fiscal_year_id IS NOT NULL THEN CURRENT_DATE ELSE v_invoice\.due_date END/);
    expect(payFn).toMatch(/v_fiscal_year_id := v_invoice\.fiscal_year_id/);
  });
  it('نافذة الإقفال تقول "ترحيل" لا "أرشفة"', () => {
    const items = buildClosureChecklist({
      totalIncome: 1, beneficiaryPercentage: 100, unpaidInvoices: 18, pendingAdvances: 0,
      availableAmount: 0, distributionsAmount: 0,
    } as Parameters<typeof buildClosureChecklist>[0]);
    const inv = items.find(i => i.label.includes('فاتورة'));
    expect(inv?.detail).toContain('ترحيل');
    expect(inv?.detail).not.toContain('أرشفتها');
  });
});
