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
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_GOLD: [161, 128, 48], TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})),
}));
vi.mock('./pdfHelpers', () => ({ getLastAutoTableY: vi.fn(() => 100) }));

import { generateMySharePDF, generateDisclosurePDF } from './beneficiary';

describe('generateMySharePDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves PDF with beneficiary name', async () => {
    await generateMySharePDF({
      beneficiaryName: 'أحمد',
      sharePercentage: 60,
      myShare: 60000,
      totalReceived: 50000,
      pendingAmount: 10000,
      netRevenue: 450000,
      adminShare: 45000,
      waqifShare: 22500,
      beneficiariesShare: 382500,
      distributions: [],
    });
    expect(mockSave).toHaveBeenCalledWith('my-share-أحمد.pdf');
  });
});

describe('generateDisclosurePDF', () => {
  it('saves disclosure PDF', async () => {
    await generateDisclosurePDF({
      fiscalYear: '2024-2025',
      beneficiaryName: 'محمد',
      sharePercentage: 40,
      myShare: 40000,
      totalIncome: 500000,
      totalExpenses: 50000,
      netRevenue: 450000,
      adminShare: 45000,
      waqifShare: 22500,
      beneficiariesShare: 382500,
      incomeBySource: { 'إيجارات': 500000 },
      expensesByType: { 'صيانة': 50000 },
    });
    expect(mockSave).toHaveBeenCalledWith('disclosure-2024-2025.pdf');
  });
});
