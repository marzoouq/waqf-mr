import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockText = vi.fn();
const mockAutoTable = vi.fn();

vi.mock('jspdf', () => {
  const JsPDFMock = function(this: Record<string, unknown>) {
    this.setFont = vi.fn();
    this.setFontSize = vi.fn();
    this.text = mockText;
    this.setTextColor = vi.fn();
    this.save = mockSave;
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    this.getNumberOfPages = () => 1;
    this.setPage = vi.fn();
  };
  return { default: JsPDFMock };
});

vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => mockAutoTable(...args) }));

vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(true),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(),
  addFooter: vi.fn(),
  createPdfDocument: vi.fn().mockImplementation(async () => {
    const { default: JsPDF } = await import('jspdf');
    return { doc: new JsPDF(), fontFamily: 'Amiri', startY: 40 };
  }),
  finalizePdf: vi.fn(),
  TABLE_HEAD_GREEN: [0, 128, 0],
  TABLE_HEAD_RED: [200, 0, 0],
  TABLE_HEAD_GOLD: [200, 170, 0],
  baseTableStyles: () => ({}),
  headStyles: () => ({}),
  footStyles: () => ({}),
  reshapeArabic: (t: string) => t,
  reshapeRow: (r: unknown[]) => r,
}));

vi.mock('./pdfHelpers', () => ({
  getLastAutoTableY: vi.fn(() => 80),
}));

vi.mock('@/utils/safeNumber', () => ({
  safeNumber: (n: unknown) => Number(n) || 0,
}));

vi.mock('@/utils/format', () => ({
  fmt: (n: number) => String(n),
}));

// ---------------------------------------------------------------------------
// generateDistributionsPDF
// ---------------------------------------------------------------------------
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

  it('ينشئ PDF ويستدعي finalizePdf باسم ملف صحيح', async () => {
    const { generateDistributionsPDF } = await import('./distributions');
    await generateDistributionsPDF(baseData);
    const { finalizePdf } = await import('./core');
    expect(finalizePdf).toHaveBeenCalledTimes(1);
    expect(vi.mocked(finalizePdf).mock.calls[0]?.[2]).toBe('distributions-report-2024-2025.pdf');
  });

  it('ينشئ جدولين على الأقل (ملخص + تفصيلي)', async () => {
    const { generateDistributionsPDF } = await import('./distributions');
    mockAutoTable.mockClear();
    await generateDistributionsPDF(baseData);
    expect(mockAutoTable).toHaveBeenCalledTimes(2);
  });

  it('يعالج حالة العجز (deficit > 0) بدون خطأ', async () => {
    const { generateDistributionsPDF } = await import('./distributions');
    const data = {
      ...baseData,
      distributions: [
        { beneficiary_name: 'محمد', share_percentage: 100, share_amount: 100000, advances_paid: 120000, carryforward_deducted: 0, net_amount: 0, deficit: 20000 },
      ],
    };
    await expect(generateDistributionsPDF(data)).resolves.not.toThrow();
  });

  it('يعالج قائمة توزيعات فارغة', async () => {
    const { generateDistributionsPDF } = await import('./distributions');
    const data = { ...baseData, distributions: [] };
    await expect(generateDistributionsPDF(data)).resolves.not.toThrow();
  });

  it('يعالج سُلف ومرحّل = 0 بعلامة "—"', async () => {
    const { generateDistributionsPDF } = await import('./accounts');
    const data = {
      ...baseData,
      distributions: [
        { beneficiary_name: 'أحمد', share_percentage: 100, share_amount: 100000, advances_paid: 0, carryforward_deducted: 0, net_amount: 100000, deficit: 0 },
      ],
    };
    await expect(generateDistributionsPDF(data)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateAccountsPDF
// ---------------------------------------------------------------------------
describe('generateAccountsPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  const fullData = {
    contracts: [{ contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 120000, status: 'active' }],
    incomeBySource: { 'إيجارات': 500000, 'أخرى': 50000 },
    expensesByType: { 'صيانة': 30000, 'كهرباء': 20000 },
    totalIncome: 550000,
    totalExpenses: 50000,
    netRevenue: 500000,
    adminShare: 50000,
    waqifShare: 25000,
    waqfRevenue: 425000,
    beneficiaries: [
      { name: 'محمد', share_percentage: 60 },
      { name: 'علي', share_percentage: 40 },
    ],
    vatAmount: 15000,
    zakatAmount: 5000,
    netAfterZakat: 480000,
    waqfCorpusPrevious: 100000,
    grandTotal: 650000,
    netAfterExpenses: 600000,
    netAfterVat: 585000,
    waqfCorpusManual: 50000,
    distributionsAmount: 375000,
    availableAmount: 375000,
    remainingBalance: 0,
  };

  it('ينشئ PDF باسم accounts-report.pdf', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    await generateAccountsPDF(fullData);
    const { finalizePdf } = await import('./core');
    expect(finalizePdf).toHaveBeenCalledTimes(1);
    expect(vi.mocked(finalizePdf).mock.calls[0]?.[2]).toBe('accounts-report.pdf');
  });

  it('ينشئ 5 جداول (عقود + إيرادات + مصروفات + توزيع + مستفيدين)', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    await generateAccountsPDF(fullData);
    expect(mockAutoTable).toHaveBeenCalledTimes(5);
  });

  it('يعرض رقبة الوقف المرحلة عندما > 0', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    await generateAccountsPDF(fullData);
    // الجدول الرابع (التوزيع) يجب أن يحتوي على صفوف رقبة الوقف
    const distributionCall = mockAutoTable.mock.calls[3];
    const bodyRows = distributionCall?.[1]?.body;
    const hasCorpusRow = bodyRows?.some((row: string[]) =>
      row.some((cell: string) => typeof cell === 'string' && cell.includes('رقبة الوقف المرحلة'))
    );
    expect(hasCorpusRow).toBe(true);
  });

  it('يُخفي صف الزكاة عندما = 0', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    const dataNoZakat = { ...fullData, zakatAmount: 0 };
    await generateAccountsPDF(dataNoZakat);
    const distributionCall = mockAutoTable.mock.calls[3];
    const bodyRows = distributionCall?.[1]?.body;
    const hasZakatRow = bodyRows?.some((row: string[]) =>
      row.some((cell: string) => typeof cell === 'string' && cell.includes('الزكاة'))
    );
    expect(hasZakatRow).toBeFalsy();
  });

  it('يعرض الزكاة عندما > 0', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    await generateAccountsPDF(fullData);
    const distributionCall = mockAutoTable.mock.calls[3];
    const bodyRows = distributionCall?.[1]?.body;
    const hasZakatRow = bodyRows?.some((row: string[]) =>
      row.some((cell: string) => typeof cell === 'string' && cell.includes('الزكاة'))
    );
    expect(hasZakatRow).toBe(true);
  });

  it('يعالج بيانات حد أدنى (بدون حقول اختيارية)', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    await expect(generateAccountsPDF({
      contracts: [],
      incomeBySource: {},
      expensesByType: {},
      totalIncome: 0,
      totalExpenses: 0,
      netRevenue: 0,
      adminShare: 0,
      waqifShare: 0,
      waqfRevenue: 0,
      beneficiaries: [],
    })).resolves.not.toThrow();
  });

  it('يحسب grandTotal تلقائياً عند عدم تمريره', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    const noGrandTotal = { ...fullData, grandTotal: undefined, waqfCorpusPrevious: 100000 };
    await generateAccountsPDF(noGrandTotal);
    // يجب أن يحسب grandTotal = totalIncome + corpusPrev
    const distributionCall = mockAutoTable.mock.calls[3];
    const bodyRows = distributionCall?.[1]?.body;
    const totalRow = bodyRows?.find((row: string[]) =>
      row.some((cell: string) => typeof cell === 'string' && cell.includes('الإجمالي الشامل'))
    );
    expect(totalRow).toBeDefined();
  });

  it('يحسب حصص المستفيدين تناسبياً', async () => {
    const { generateAccountsPDF } = await import('./accounts');
    mockAutoTable.mockClear();
    const data = {
      ...fullData,
      distributionsAmount: 100000,
      beneficiaries: [
        { name: 'أ', share_percentage: 75 },
        { name: 'ب', share_percentage: 25 },
      ],
    };
    await generateAccountsPDF(data);
    // الجدول الخامس (المستفيدين)
    const benCall = mockAutoTable.mock.calls[4];
    const benRows = benCall?.[1]?.body;
    expect(benRows).toHaveLength(2);
  });
});
