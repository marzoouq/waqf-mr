/**
 * حارس انحدار: سداد الدفعات من نافذة العقد وبطاقة العقد + اتساع نافذة الإضافة
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyFormData } from '@/types/forms/contract';

const read = (p: string) => readFileSync(p, 'utf8');

describe('سداد الدفعات في العقود', () => {
  it('خيار سداد الدفعة الأولى مطفأ افتراضياً', () => {
    expect(emptyFormData.pay_first_now).toBe(false);
  });

  it('الإنشاء يسدّد الدفعة الأولى عبر المسار الموحّد فقط عند تفعيل الخيار', () => {
    const src = read('src/hooks/page/admin/contracts/useContractFormSubmit.ts');
    expect(src).toMatch(/formData\.pay_first_now\) await payFirstInvoice\(newIdSingle\)/);
    expect(src).toMatch(/newIdMulti && formData\.pay_first_now\) await payFirstInvoice/);
    expect(src).toMatch(/markPaid\.mutateAsync\(\{ invoiceId \}\)/);
  });

  it('بطاقة العقد تمرّر زر التسديد وإلغاءه', () => {
    const src = read('src/components/contracts/ContractsTabContent.tsx');
    expect(src).toContain('onPayInvoice={pay.openPayDialog}');
    expect(src).toContain('onUnpayInvoice={pay.markUnpaid.mutate}');
    expect(src).toContain('<PayInvoiceDialog');
  });

  it('نافذة الإضافة عريضة وموزّعة على عمودين', () => {
    const src = read('src/components/contracts/ContractFormDialog.tsx');
    expect(src).toContain('max-w-3xl');
    expect(src).not.toContain('max-w-lg');
    expect(src).toContain('md:grid-cols-2');
  });
});
