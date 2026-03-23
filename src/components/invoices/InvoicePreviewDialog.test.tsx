/**
 * اختبار تدفق تحميل PDF من المعاينة (html2canvas → jsPDF)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoicePreviewDialog from './InvoicePreviewDialog';
import type { InvoicePreviewData } from './InvoicePreviewDialog';

// Mock html2canvas
const mockToDataURL = vi.fn(() => 'data:image/png;base64,mock');
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: mockToDataURL,
    width: 800,
    height: 1200,
  })),
}));

// Mock jsPDF
const mockSave = vi.fn();
const mockAddImage = vi.fn();
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addImage: mockAddImage,
    addPage: vi.fn(),
    save: mockSave,
  })),
}));

const sampleInvoice: InvoicePreviewData = {
  type: 'simplified',
  invoiceNumber: 'INV-001',
  date: '2026-01-15',
  sellerName: 'وقف تجريبي',
  sellerVatNumber: '300000000000003',
  sellerAddress: 'الرياض',
  buyerName: 'مستأجر تجريبي',
  buyerVatNumber: '',
  buyerAddress: '',
  items: [{ name: 'إيجار', quantity: 1, unitPrice: 1000, vatRate: 15 }],
  subtotal: 1000,
  totalVat: 150,
  totalWithVat: 1150,
  qrCode: '',
  zatcaUuid: 'test-uuid',
  icv: 1,
};

describe('InvoicePreviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يعرض زر تحميل PDF', () => {
    render(<InvoicePreviewDialog open={true} onOpenChange={vi.fn()} invoice={sampleInvoice} />);
    expect(screen.getByText('تحميل PDF')).toBeInTheDocument();
  });

  it('يعرض رقم الفاتورة', () => {
    render(<InvoicePreviewDialog open={true} onOpenChange={vi.fn()} invoice={sampleInvoice} />);
    expect(screen.getByText(/INV-001/)).toBeInTheDocument();
  });

  it('لا يعرض شيئاً عند عدم وجود فاتورة', () => {
    render(<InvoicePreviewDialog open={true} onOpenChange={vi.fn()} invoice={null} />);
    expect(screen.queryByText('تحميل PDF')).not.toBeInTheDocument();
  });
});
