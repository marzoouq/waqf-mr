import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return {
      text: vi.fn(), save: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(),
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
  createPdfDocument: vi.fn().mockImplementation(async () => {  const { default: JsPDF } = await import('jspdf'); return { doc: new JsPDF(), fontFamily: 'Amiri', startY: 40 }; }),
  finalizePdf: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
  fmtDate: (d: string) => d,
}));
vi.mock('@/utils/format', () => ({ fmt: (n: number) => String(n) }));

import { generateIncomePDF, generateExpensesPDF } from '../entities/expenses';

describe('generateIncomePDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves income-report.pdf', async () => {
    await generateIncomePDF([{ source: 'إيجارات', amount: 50000, date: '2024-01-01' }], 50000);
    const { finalizePdf } = await import('./core');
    expect(vi.mocked(finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked(finalizePdf).mock.calls[0]?.[2]).toMatch(/^income-report/);
  });
});

describe('generateExpensesPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves expenses-report.pdf', async () => {
    await generateExpensesPDF([{ expense_type: 'صيانة', amount: 10000, date: '2024-02-01' }], 10000);
    const { finalizePdf } = await import('./core');
    expect(vi.mocked(finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked(finalizePdf).mock.calls[0]?.[2]).toMatch(/^expenses-report/);
  });
});
