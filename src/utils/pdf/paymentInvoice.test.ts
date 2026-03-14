import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- hoisted mocks ---
const mockSave = vi.fn();
const mockOutput = vi.fn(() => new Blob(['pdf-content'], { type: 'application/pdf' }));
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockText = vi.fn();
const mockSetTextColor = vi.fn();
const mockAddImage = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockLine = vi.fn();

vi.mock('jspdf', () => {
  const JsPDFMock = function(this: Record<string, unknown>) {
    this.setFont = mockSetFont;
    this.setFontSize = mockSetFontSize;
    this.text = mockText;
    this.setTextColor = mockSetTextColor;
    this.addImage = mockAddImage;
    this.setDrawColor = mockSetDrawColor;
    this.setLineWidth = mockSetLineWidth;
    this.line = mockLine;
    this.save = mockSave;
    this.output = mockOutput;
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    this.getNumberOfPages = () => 1;
    this.setPage = vi.fn();
  };
  return { default: JsPDFMock };
});

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(true),
  addHeader: vi.fn().mockResolvedValue(30),
  addFooter: vi.fn(),
  loadLogoBase64: vi.fn().mockResolvedValue(null),
  TABLE_HEAD_GREEN: [0, 128, 0],
  baseTableStyles: () => ({}),
  headStyles: () => ({}),
}));

vi.mock('./pdfHelpers', () => ({
  getLastAutoTableY: vi.fn(() => 120),
}));

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ upload: mockUpload }) },
    from: () => ({ update: mockUpdate }),
  },
}));

vi.mock('@/utils/zatcaQr', () => ({
  generateZatcaQrTLV: vi.fn(() => 'base64-tlv-data'),
  generateQrDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
}));

import type { PaymentInvoicePdfData } from './paymentInvoice';

const makeInvoice = (overrides: Partial<PaymentInvoicePdfData> = {}): PaymentInvoicePdfData => ({
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  contractNumber: 'W-001',
  tenantName: 'أحمد',
  propertyNumber: 'P-001',
  paymentNumber: 1,
  totalPayments: 12,
  amount: 10000,
  dueDate: '2024-06-01',
  status: 'pending',
  vatRate: 0,
  vatAmount: 0,
  ...overrides,
});

describe('generatePaymentInvoicePDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates PDF with default template and uploads', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const result = await generatePaymentInvoicePDF(makeInvoice());
    expect(result).not.toBeNull();
    expect(mockUpload).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('generates PDF with classic template', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const result = await generatePaymentInvoicePDF(makeInvoice(), undefined, 'classic');
    expect(result).not.toBeNull();
  });

  it('generates PDF with compact template', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const result = await generatePaymentInvoicePDF(makeInvoice(), undefined, 'compact');
    expect(result).not.toBeNull();
  });

  it('generates PDF with VAT and adds QR code', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const { generateZatcaQrTLV } = await import('@/utils/zatcaQr');
    const result = await generatePaymentInvoicePDF(
      makeInvoice({ vatRate: 15, vatAmount: 1500, amount: 11500 }),
      { waqfName: 'وقف تجريبي', vatNumber: '300000000000003' },
    );
    expect(result).not.toBeNull();
    expect(generateZatcaQrTLV).toHaveBeenCalledWith(expect.objectContaining({
      vatNumber: '300000000000003',
      totalWithVat: 11500,
      vatAmount: 1500,
    }));
    expect(mockAddImage).toHaveBeenCalled();
  });

  it('retries upload with timestamp on duplicate error', async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: 'already exists' } })
      .mockResolvedValueOnce({ error: null });
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    await generatePaymentInvoicePDF(makeInvoice());
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('falls back to local save on storage failure', async () => {
    mockUpload.mockImplementationOnce(() => { throw new Error('network error'); });
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const result = await generatePaymentInvoicePDF(makeInvoice());
    expect(result).toBeNull();
    expect(mockSave).toHaveBeenCalled();
  });

  it('does not generate QR without vatNumber in waqfInfo', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    const { generateZatcaQrTLV } = await import('@/utils/zatcaQr');
    await generatePaymentInvoicePDF(
      makeInvoice({ vatRate: 15, vatAmount: 1500 }),
      { waqfName: 'وقف' },
    );
    expect(generateZatcaQrTLV).not.toHaveBeenCalled();
  });

  it('updates file_path in DB after successful upload', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    await generatePaymentInvoicePDF(makeInvoice());
    expect(mockUpdate).toHaveBeenCalledWith({ file_path: 'payment-invoices/INV-001.pdf' });
  });

  it('renders bank details with tax_professional template', async () => {
    const { generatePaymentInvoicePDF } = await import('./paymentInvoice');
    await generatePaymentInvoicePDF(
      makeInvoice(),
      { waqfName: 'وقف', bankName: 'الأهلي', bankIBAN: 'SA0000' },
      'tax_professional',
    );
    // بيانات البنك تظهر في PDF
    expect(mockText).toHaveBeenCalledWith(expect.stringContaining('الأهلي'), expect.any(Number), expect.any(Number), expect.any(Object));
  });
});
