/**
 * Integration tests — تتحقق أن أزرار تصدير PDF تُنتج مستندات PDF صالحة فعلاً
 * بدلاً من mock كامل لـ jsPDF كما في اختبارات الوحدة. هنا نستخدم jsPDF الحقيقي
 * ونلتقط الكائن `doc` عبر mock محدود لـ `finalizePdf` ثم نتحقق من:
 *   - توقيع %PDF
 *   - حجم > 1000 بايت
 *   - getNumberOfPages >= 1
 *   - اسم الملف يحوي السنة المالية
 *
 * يغطي التقارير الثلاثة المطلوبة:
 *   1. الإفصاح السنوي         → generateAnnualDisclosurePDF
 *   2. الحسابات الختامية      → generateAnnualReportPDF
 *   3. توزيع الحصص            → generateDistributionsPDF
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type jsPDF from 'jspdf';

interface Captured {
  doc: jsPDF | null;
  filename: string | null;
}
const captured: Captured = { doc: null, filename: null };

// Mock محدود: نُبقي كل الثوابت والأنماط الحقيقية، ونعترض فقط ما يحتاج شبكة/IO.
vi.mock('@/utils/pdf/core/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/pdf/core/core')>();
  const { default: JsPDF } = await import('jspdf');
  return {
    ...actual,
    // نُنشئ doc حقيقي بدون header (الذي قد يجلب logo من الشبكة)
    createPdfDocument: vi.fn(async () => ({
      doc: new JsPDF(),
      fontFamily: 'helvetica',
      startY: 40,
    })),
    // نلتقط بدلاً من doc.save()
    finalizePdf: vi.fn((doc, _fontFamily, filename) => {
      captured.doc = doc;
      captured.filename = filename;
    }),
    loadArabicFont: vi.fn().mockResolvedValue(false),
    addHeader: vi.fn().mockResolvedValue(40),
    addHeaderToAllPages: vi.fn(),
    addFooter: vi.fn(),
    reshapeArabic: (t: string) => t,
    reshapeRow: (r: unknown[]) => r,
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/notify', () => ({
  uiNotify: { success: vi.fn(), error: vi.fn() },
}));

const PDF_MAGIC = '%PDF';

function assertValidPdf(doc: jsPDF | null, filename: string | null, expectedNameFragment: string) {
  expect(doc, 'finalizePdf must receive a doc').not.toBeNull();
  expect(filename, 'filename must be captured').not.toBeNull();
  expect(filename!).toContain(expectedNameFragment);

  const buffer = doc!.output('arraybuffer') as ArrayBuffer;
  const bytes = new Uint8Array(buffer);
  expect(bytes.byteLength).toBeGreaterThan(1000);

  const header = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  expect(header).toBe(PDF_MAGIC);

  expect(doc!.getNumberOfPages()).toBeGreaterThanOrEqual(1);
}

const FISCAL_YEAR = '2024-2025';

const baseDistributionData = [
  { name: 'محمد', percentage: 60, amount: 229500 },
  { name: 'علي', percentage: 40, amount: 153000 },
];

function buildInput() {
  return {
    fiscalYearLabel: FISCAL_YEAR,
    totalIncome: 500000,
    totalExpenses: 50000,
    netRevenue: 450000,
    adminShare: 45000,
    waqifShare: 22500,
    waqfRevenue: 382500,
    waqfCorpusPrevious: 0,
    grandTotal: 500000,
    netAfterExpenses: 450000,
    vatAmount: 67500,
    netAfterVat: 382500,
    zakatAmount: 0,
    netAfterZakat: 382500,
    waqfCorpusManual: 0,
    availableAmount: 382500,
    distributionsAmount: 382500,
    remainingBalance: 0,
    adminPct: 10,
    waqifPct: 5,
    incomeSourceData: [{ name: 'إيجارات', value: 500000 }],
    expenseTypeData: [{ name: 'صيانة', value: 50000 }],
    distributionData: baseDistributionData,
    forensicAuditData: {} as never,
  };
}

beforeEach(() => {
  captured.doc = null;
  captured.filename = null;
  vi.clearAllMocks();
  // إعادة تعيين module cache لضمان تطبيق mock الـ pdf/core/core
  // عند استيراد useReportsExport (وإلا يأخذ نسخة مُلوّثة من ملفات أخرى).
  vi.resetModules();
});

describe('PDF Reports Integration — مستندات صالحة', { timeout: 30000 }, () => {
  it('الإفصاح السنوي: handleExportDisclosure يُنتج PDF صالحاً', async () => {
    const { useReportsExport } = await import('@/hooks/page/admin/reports/useReportsExport');
    const { handleExportDisclosure } = useReportsExport(buildInput());
    await handleExportDisclosure();
    assertValidPdf(captured.doc, captured.filename, FISCAL_YEAR);
    expect(captured.filename).toContain('disclosure');
  });

  it('الحسابات الختامية: handleExportPDF يُنتج PDF صالحاً', async () => {
    const { useReportsExport } = await import('@/hooks/page/admin/reports/useReportsExport');
    const { handleExportPDF } = useReportsExport(buildInput());
    await handleExportPDF();
    assertValidPdf(captured.doc, captured.filename, FISCAL_YEAR);
    expect(captured.filename).toMatch(/waqf-report|report/i);
  });

  it('توزيع الحصص: handleExportDistribution يُنتج PDF صالحاً', async () => {
    const { useReportsExport } = await import('@/hooks/page/admin/reports/useReportsExport');
    const { handleExportDistribution } = useReportsExport(buildInput());
    await handleExportDistribution();
    assertValidPdf(captured.doc, captured.filename, FISCAL_YEAR);
    expect(captured.filename).toContain('distribution');
  });

  it('finalizePdf يُستدعى مرة واحدة بالضبط لكل تصدير', async () => {
    const core = await import('@/utils/pdf/core/core');
    const { useReportsExport } = await import('@/hooks/page/admin/reports/useReportsExport');
    const { handleExportDisclosure } = useReportsExport(buildInput());
    await handleExportDisclosure();
    expect(vi.mocked(core.finalizePdf)).toHaveBeenCalledTimes(1);
  });
});
