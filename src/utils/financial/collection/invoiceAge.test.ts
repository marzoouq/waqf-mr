import { describe, expect, it } from 'vitest';
import { invoiceAgeDays, invoiceRemaining } from '@/utils/financial/collection/invoiceAge';

describe('عمر الفاتورة والرصيد المتبقي', () => {
  it('يحسب اليوم بتوقيت الرياض عند حدود منتصف الليل', () => {
    expect(invoiceAgeDays('2026-11-03', 'pending', new Date('2026-11-03T21:01:00Z'))).toBe(1);
  });
  it('لا تأخير في يوم الاستحقاق أو قبله', () => {
    expect(invoiceAgeDays('2026-11-04', 'pending', new Date('2026-11-04T10:00:00Z'))).toBe(0);
    expect(invoiceAgeDays('2026-11-05', 'pending', new Date('2026-11-04T10:00:00Z'))).toBe(0);
  });
  it('المسددة ليست متأخرة', () => {
    expect(invoiceAgeDays('2026-10-01', 'paid', new Date('2026-11-04T10:00:00Z'))).toBe(0);
  });
  it('سداد 1000 من 2000 يترك 1000 ولا رصيد سالب', () => {
    expect(invoiceRemaining(2000, 1000, 'partially_paid')).toBe(1000);
    expect(invoiceRemaining(2000, 2500, 'partially_paid')).toBe(0);
    expect(invoiceRemaining(2000, 0, 'paid')).toBe(0);
  });
});