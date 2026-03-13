import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();

vi.mock('jspdf', () => {
  const JsPDFMock = function(this: Record<string, unknown>) {
    this.setFont = vi.fn();
    this.setFontSize = vi.fn();
    this.text = vi.fn();
    this.setTextColor = vi.fn();
    this.save = mockSave;
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
  addHeaderToAllPages: vi.fn(),
  addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [0, 128, 0],
  TABLE_HEAD_RED: [200, 0, 0],
  TABLE_HEAD_GOLD: [200, 170, 0],
  baseTableStyles: () => ({}),
  headStyles: () => ({}),
  footStyles: () => ({}),
}));

vi.mock('./pdfHelpers', () => ({
  getLastAutoTableY: vi.fn(() => 80),
}));

describe('generateDistributionsPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseData = {
    fiscalYearLabel: '2024-2025',
    availableAmount: 100000,
    distributions: [
      { beneficiary_name: 'محمد', share_percentage: 60, share_amount: 60000, advances_paid: 5000, carryforward_deducted: 0, net_amount: 55000, deficit: 0 },
      { beneficiary_name: 'علي', share_percentage: 40, share_amount: 40000, advances_paid: 0, carryforward_deducted: 2000, net_amount: 38000, deficit: 0 },
    ],
  };

  it('generates PDF without error', async () => {
    const { generateDistributionsPDF } = await import('./accounts');
    await generateDistributionsPDF(baseData);
    expect(mockSave).toHaveBeenCalledWith('distributions-report-2024-2025.pdf');
  });

  it('handles deficit > 0 correctly', async () => {
    const { generateDistributionsPDF } = await import('./accounts');
    const data = {
      ...baseData,
      distributions: [
        { beneficiary_name: 'محمد', share_percentage: 100, share_amount: 100000, advances_paid: 120000, carryforward_deducted: 0, net_amount: 0, deficit: 20000 },
      ],
    };
    await generateDistributionsPDF(data);
    expect(mockSave).toHaveBeenCalled();
  });
});

describe('generateAccountsPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates accounts PDF without error', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    await generateAccountsPDF({
      contracts: [{ contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 120000, status: 'active' }],
      incomeBySource: { 'إيجارات': 500000 },
      expensesByType: { 'صيانة': 50000 },
      totalIncome: 500000,
      totalExpenses: 50000,
      netRevenue: 450000,
      adminShare: 45000,
      waqifShare: 22500,
      waqfRevenue: 382500,
      beneficiaries: [{ name: 'محمد', share_percentage: 100 }],
    });
    expect(mockSave).toHaveBeenCalledWith('accounts-report.pdf');
  });
});
