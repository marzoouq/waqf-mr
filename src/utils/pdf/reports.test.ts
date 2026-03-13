import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsPDF mock
const mockText = vi.fn();
const mockSave = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
let mockDoc: Record<string, unknown>;

vi.mock('jspdf', () => ({
  default: vi.fn(() => {
    mockDoc = {
      text: mockText,
      save: mockSave,
      setFont: mockSetFont,
      setFontSize: mockSetFontSize,
      addPage: vi.fn(),
      internal: { pageSize: { width: 210, height: 297 }, pages: ['', ''] },
      getNumberOfPages: vi.fn(() => 1),
      setPage: vi.fn(),
    };
    return mockDoc;
  }),
}));

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(),
  addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52],
  TABLE_HEAD_GOLD: [161, 128, 48],
  TABLE_HEAD_RED: [180, 40, 40],
  baseTableStyles: vi.fn(() => ({})),
  headStyles: vi.fn(() => ({})),
  footStyles: vi.fn(() => ({})),
}));
vi.mock('./pdfHelpers', () => ({ getLastAutoTableY: vi.fn(() => 100) }));

import { generateAnnualReportPDF, generateBeneficiaryStatementPDF, generateAnnualDisclosurePDF } from './reports';

describe('generateAnnualReportPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates and saves PDF', async () => {
    await generateAnnualReportPDF({
      fiscalYear: '2024-2025',
      totalIncome: 500000,
      totalExpenses: 50000,
      netRevenue: 450000,
      adminShare: 45000,
      waqifShare: 22500,
      waqfRevenue: 382500,
      expensesByType: [{ type: 'صيانة', amount: 50000 }],
      incomeBySource: [{ source: 'إيجارات', amount: 500000 }],
      beneficiaries: [{ name: 'محمد', percentage: 60, amount: 229500 }],
    });
    expect(mockSave).toHaveBeenCalledWith('waqf-report-2024-2025.pdf');
  });
});

describe('generateBeneficiaryStatementPDF', () => {
  it('generates and saves PDF', async () => {
    await generateBeneficiaryStatementPDF('أحمد', 40, 153000, '2024-2025');
    expect(mockSave).toHaveBeenCalledWith('statement-أحمد-2024-2025.pdf');
  });
});

describe('generateAnnualDisclosurePDF', () => {
  it('generates and saves disclosure PDF', async () => {
    await generateAnnualDisclosurePDF({
      fiscalYear: '2024-2025',
      totalIncome: 500000, totalExpenses: 50000,
      waqfCorpusPrevious: 0, grandTotal: 500000,
      netAfterExpenses: 450000, vatAmount: 67500,
      netAfterVat: 382500, zakatAmount: 0, netAfterZakat: 382500,
      adminShare: 38250, waqifShare: 19125,
      waqfRevenue: 325125, waqfCorpusManual: 0,
      availableAmount: 325125, distributionsAmount: 300000,
      remainingBalance: 25125,
      incomeBySource: { 'إيجارات': 500000 },
      expensesByType: { 'صيانة': 50000 },
      beneficiaries: [{ name: 'محمد', share_percentage: 100, amount: 300000 }],
      adminPct: 10, waqifPct: 5,
    });
    expect(mockSave).toHaveBeenCalledWith('annual-disclosure-2024-2025.pdf');
  });
});
