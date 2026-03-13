import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    text: vi.fn(), save: mockSave, setFont: vi.fn(), setFontSize: vi.fn(),
    internal: { pageSize: { width: 210, height: 297 }, pages: ['', ''] },
    getNumberOfPages: vi.fn(() => 1), setPage: vi.fn(),
  })),
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(), addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
}));

import { generateIncomePDF, generateExpensesPDF } from './expenses';

describe('generateIncomePDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves income-report.pdf', async () => {
    await generateIncomePDF([{ source: 'إيجارات', amount: 50000, date: '2024-01-01' }], 50000);
    expect(mockSave).toHaveBeenCalledWith('income-report.pdf');
  });
});

describe('generateExpensesPDF', () => {
  it('saves expenses-report.pdf', async () => {
    await generateExpensesPDF([{ expense_type: 'صيانة', amount: 10000, date: '2024-02-01' }], 10000);
    expect(mockSave).toHaveBeenCalledWith('expenses-report.pdf');
  });
});
