import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

const mockGeneratePaymentInvoicePDF = vi.fn().mockResolvedValue('https://storage.example.com/invoice.pdf');

vi.mock('./paymentInvoice', () => ({
  generatePaymentInvoicePDF: (...args: unknown[]) => mockGeneratePaymentInvoicePDF(...args),
}));

vi.mock('@/utils/safeNumber', () => ({
  safeNumber: (n: unknown) => Number(n) || 0,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { generateInvoiceClientPDF } from './invoice';
import type { Invoice } from '@/hooks/data/useInvoices';

describe('generateInvoiceClientPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseInvoice: Invoice = {
    id: 'inv-001',
    invoice_type: 'إيجار',
    invoice_number: 'INV-2024-001',
    amount: 11500,
    vat_amount: 1500,
    vat_rate: 15,
    date: '2024-06-01',
    status: 'pending',
    description: 'إيجار شهر يونيو',
    created_at: '2024-06-01',
    updated_at: '2024-06-01',
    file_path: null,
    file_name: null,
    fiscal_year_id: 'fy-1',
    property_id: 'prop-1',
    contract_id: 'con-1',
    expense_id: null,
    zatca_status: 'none',
    zatca_uuid: null,
    amount_excluding_vat: 10000,
  };

  const baseContract = {
    contract_number: 'W-001',
    tenant_name: 'أحمد محمد',
    tenant_tax_number: '300000000000003',
    tenant_street: 'شارع الملك فهد',
    tenant_district: 'حي العليا',
    tenant_city: 'الرياض',
    payment_count: 4,
  };

  it('يولّد PDF ويُرجع URL', async () => {
    const url = await generateInvoiceClientPDF({
      invoice: baseInvoice,
      contract: baseContract,
      propertyNumber: 'P-001',
    });
    expect(url).toBe('https://storage.example.com/invoice.pdf');
    expect(mockGeneratePaymentInvoicePDF).toHaveBeenCalledTimes(1);
  });

  it('يُمرّر بيانات PaymentInvoicePdfData صحيحة', async () => {
    await generateInvoiceClientPDF({
      invoice: baseInvoice,
      contract: baseContract,
      propertyNumber: 'P-001',
    });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    expect(pdfData.invoiceNumber).toBe('INV-2024-001');
    expect(pdfData.contractNumber).toBe('W-001');
    expect(pdfData.tenantName).toBe('أحمد محمد');
    expect(pdfData.propertyNumber).toBe('P-001');
    expect(pdfData.amount).toBe(11500);
    expect(pdfData.vatAmount).toBe(1500);
    expect(pdfData.vatRate).toBe(15);
  });

  it('يحسب amountExVat صحيحاً مع وجود vatAmount', async () => {
    await generateInvoiceClientPDF({ invoice: baseInvoice, contract: baseContract });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    // unitPrice = amount - vatAmount = 11500 - 1500 = 10000
    expect(pdfData.lineItems[0].unitPrice).toBe(10000);
  });

  it('يحسب amountExVat عبر vatRate عند عدم وجود vatAmount', async () => {
    const inv = { ...baseInvoice, vat_amount: 0, vat_rate: 15 };
    await generateInvoiceClientPDF({ invoice: inv, contract: baseContract });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    // unitPrice = 11500 / 1.15 = 10000
    expect(pdfData.lineItems[0].unitPrice).toBe(10000);
  });

  it('يستخدم القالب المبسّط عند التحديد', async () => {
    await generateInvoiceClientPDF({
      invoice: baseInvoice,
      contract: baseContract,
      template: 'simplified',
    });
    // القالب الداخلي = 'compact'
    const template = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[2];
    expect(template).toBe('compact');
  });

  it('يستخدم القالب الاحترافي افتراضياً', async () => {
    await generateInvoiceClientPDF({
      invoice: baseInvoice,
      contract: baseContract,
    });
    const template = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[2];
    expect(template).toBe('tax_professional');
  });

  it('يبني عنوان المستأجر من أجزاء العقد', async () => {
    await generateInvoiceClientPDF({ invoice: baseInvoice, contract: baseContract });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    expect(pdfData.tenantAddress).toBe('شارع الملك فهد، حي العليا، الرياض');
  });

  it('يعالج عقد بدون عنوان', async () => {
    await generateInvoiceClientPDF({
      invoice: baseInvoice,
      contract: { ...baseContract, tenant_street: null, tenant_district: null, tenant_city: null },
    });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    expect(pdfData.tenantAddress).toBeUndefined();
  });

  it('يعالج فاتورة بدون عقد', async () => {
    const inv = { ...baseInvoice, contract: undefined };
    await generateInvoiceClientPDF({ invoice: inv, contract: null });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    expect(pdfData.contractNumber).toBe('-');
    expect(pdfData.tenantName).toBe('-');
  });

  it('يُحدّث file_path في جدول invoices بعد النجاح', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await generateInvoiceClientPDF({ invoice: baseInvoice, contract: baseContract });
    expect(supabase.from).toHaveBeenCalledWith('invoices');
  });

  it('يعرض toast نجاح', async () => {
    const { toast } = await import('sonner');
    await generateInvoiceClientPDF({ invoice: baseInvoice, contract: baseContract });
    expect(toast.success).toHaveBeenCalledWith('تم توليد ملف PDF بنجاح');
  });

  it('يُرجع null عند حدوث خطأ ويعرض toast خطأ', async () => {
    mockGeneratePaymentInvoicePDF.mockRejectedValueOnce(new Error('fail'));
    const { toast } = await import('sonner');
    const result = await generateInvoiceClientPDF({ invoice: baseInvoice, contract: baseContract });
    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('حدث خطأ أثناء توليد ملف PDF');
  });

  it('يولّد invoiceNumber من id عند غياب invoice_number', async () => {
    const inv = { ...baseInvoice, invoice_number: null };
    await generateInvoiceClientPDF({ invoice: inv, contract: baseContract });
    const pdfData = mockGeneratePaymentInvoicePDF.mock.calls[0]?.[0];
    expect(pdfData.invoiceNumber).toBe(`INV-${baseInvoice.id.slice(0, 6)}`);
  });
});
