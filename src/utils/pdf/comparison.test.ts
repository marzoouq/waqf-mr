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
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
}));
vi.mock('./pdfHelpers', () => ({ getLastAutoTableY: vi.fn(() => 100) }));

import { generateYearComparisonPDF } from './comparison';

describe('generateYearComparisonPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves comparison PDF with correct filename', async () => {
    await generateYearComparisonPDF({
      year1Label: '2023-2024', year2Label: '2024-2025',
      year1: { income: 400000, expenses: 40000, net: 360000 },
      year2: { income: 500000, expenses: 50000, net: 450000 },
      incomeChange: 25, expenseChange: 25, netChange: 25,
      expensesByType1: [{ name: 'صيانة', value: 40000 }],
      expensesByType2: [{ name: 'صيانة', value: 50000 }],
      monthlyData: [{ month: 'يناير', income1: 33000, expenses1: 3000, net1: 30000, income2: 42000, expenses2: 4000, net2: 38000 }],
    });
    expect(mockSave).toHaveBeenCalledWith('year-comparison-2023-2024-vs-2024-2025.pdf');
  });
});
