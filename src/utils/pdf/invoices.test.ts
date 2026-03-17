import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return {
      text: vi.fn(), save: mockSave, setFont: vi.fn(), setFontSize: vi.fn(),
      internal: { pageSize: { width: 210, height: 297 }, pages: ['', ''] },
      getNumberOfPages: vi.fn(() => 1), setPage: vi.fn(),
    };
  },
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(), addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
}));

import { generateInvoicesViewPDF } from './invoices';

describe('generateInvoicesViewPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves invoices-report.pdf', async () => {
    await generateInvoicesViewPDF([
      { invoice_type: 'إيجار', invoice_number: 'INV-001', amount: 10000, date: '2024-01-01', property_number: 'P-1', status: 'paid' },
    ]);
    expect(mockSave).toHaveBeenCalledWith('invoices-report.pdf');
  });
});
