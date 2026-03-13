import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return {
      text: vi.fn(), save: mockSave, setFont: vi.fn(), setFontSize: vi.fn(),
      addPage: vi.fn(),
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
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_GOLD: [161, 128, 48], TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
}));
vi.mock('./pdfHelpers', () => ({ getLastAutoTableY: vi.fn(() => 100) }));

import { generateComprehensiveBeneficiaryPDF } from './comprehensiveBeneficiary';

describe('generateComprehensiveBeneficiaryPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves comprehensive PDF with Arabic filename', async () => {
    await generateComprehensiveBeneficiaryPDF({
      beneficiaryName: 'محمد',
      fiscalYear: '2024-2025',
      totalIncome: 500000, totalExpenses: 50000,
      netAfterExpenses: 450000, vatAmount: 67500,
      netAfterVat: 382500, zakatAmount: 0, netAfterZakat: 382500,
      adminShare: 38250, waqifShare: 19125,
      waqfRevenue: 325125, waqfCorpusManual: 0,
      availableAmount: 325125,
      myShare: 195075, totalReceived: 150000, pendingAmount: 45075,
      incomeBySource: { 'إيجارات': 500000 },
      expensesByType: { 'صيانة': 50000 },
      contracts: [{ contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 120000, status: 'active' }],
      distributions: [{ date: '2024-06-01', fiscalYear: '2024-2025', amount: 150000, status: 'paid' }],
    });
    expect(mockSave).toHaveBeenCalledWith('تقرير-شامل-محمد-2024-2025.pdf');
  });

  it('handles empty contracts and distributions', async () => {
    await generateComprehensiveBeneficiaryPDF({
      beneficiaryName: 'علي',
      fiscalYear: '2024-2025',
      totalIncome: 0, totalExpenses: 0,
      netAfterExpenses: 0, vatAmount: 0,
      netAfterVat: 0, zakatAmount: 0, netAfterZakat: 0,
      adminShare: 0, waqifShare: 0,
      waqfRevenue: 0, waqfCorpusManual: 0,
      availableAmount: 0,
      myShare: 0, totalReceived: 0, pendingAmount: 0,
      incomeBySource: {}, expensesByType: {},
      contracts: [], distributions: [],
    });
    expect(mockSave).toHaveBeenCalledWith('تقرير-شامل-علي-2024-2025.pdf');
  });
});
