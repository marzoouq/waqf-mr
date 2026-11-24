import { describe, it, expect } from 'vitest';
import { buildSingleContractPdfData, singleContractFilename } from './singleContractPdfData';

const base = {
  contract_number: 'C-1', tenant_name: 'مؤسسة', start_date: '2025-01-01', end_date: '2025-12-31',
  rent_amount: 120000, status: 'active', payment_type: 'quarterly', payment_count: 4, payment_amount: 30000,
};

describe('ملف العقد الفردي', () => {
  it('العقد المنتهي تاريخه يُطبع منتهياً دون تعديل الحالة المحفوظة', () => {
    const src = { ...base };
    expect(buildSingleContractPdfData(src).statusLabel).toBe('منتهي');
    expect(src.status).toBe('active');
  });
  it('يعرض القيم المخزنة كما هي', () => {
    const d = buildSingleContractPdfData(base);
    expect(d.annualRent).toBe(120000);
    expect(d.paymentAmount).toBe(30000);
    expect(d.paymentTypeLabel).toBe('ربع سنوي');
  });
  it('لا يطبع بيانات هوية غير موجودة (مصدر المستفيد بلا بيانات شخصية)', () => {
    const d = buildSingleContractPdfData(base);
    expect(d.tenantRows).toEqual([['اسم المستأجر', 'مؤسسة']]);
  });
  it('الدفعات مرتبة برقمها', () => {
    const d = buildSingleContractPdfData(base, [
      { payment_number: 2, due_date: '2025-04-01', amount: 30000, status: 'paid' },
      { payment_number: 1, due_date: '2025-01-01', amount: 30000, status: 'overdue' },
    ]);
    expect(d.payments.map(p => p.number)).toEqual([1, 2]);
    expect(d.payments[0]?.statusLabel).toBe('متأخرة');
  });
  it('اسم الملف آمن', () => {
    expect(singleContractFilename('C 1/2')).toBe('lease-contract_C-1-2.pdf');
  });
});
