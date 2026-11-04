import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { invoiceRemaining } from '@/utils/financial/collection/invoiceAge';

describe('حماية الإقفال والتحصيل', () => {
  it('توجد لقطة إقفال ثابتة وسجل انتقال ولا تحديث رجعي', () => {
    const sql = readFileSync('drizzle/migrations/0024_complete_invoice_lifecycle.sql', 'utf8');
    expect(sql).toContain('public.fiscal_closure_summaries');
    expect(sql).toContain('public.invoice_carry_events');
    expect(sql).toContain("collection_status <> 'uncollectible'");
    expect(sql).toContain("'partially_paid'");
    expect(sql).toContain('v_next_status');
    expect(sql).toContain("v_next_status = 'closed'");
  });
  it('بعد تحصيل 1000 من دين 2000 يتبقى 1000', () => {
    expect(invoiceRemaining(2000, 1000, 'partially_paid')).toBe(1000);
  });
  it('حظر التحصيل في سنة مقفلة وتصنيف التعذر للناظر بسبب', () => {
    const sql = readFileSync('drizzle/migrations/0024_complete_invoice_lifecycle.sql', 'utf8');
    expect(sql).toContain('غير قابلة للتحصيل');
    expect(sql).toContain('سبب تعذر التحصيل مطلوب');
    expect(sql).toContain('لا يمكن التحصيل أو التراجع في سنة مقفلة');
    expect(sql).toContain('public.set_invoice_collectibility');
  });
});