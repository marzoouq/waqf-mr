import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockRoundedRect = vi.fn();

vi.mock('jspdf', () => {
  const JsPDFMock = function(this: Record<string, unknown>) {
    this.setFont = vi.fn();
    this.setFontSize = vi.fn();
    this.text = mockText;
    this.setTextColor = vi.fn();
    this.setFillColor = vi.fn();
    this.roundedRect = mockRoundedRect;
    this.addPage = mockAddPage;
    this.save = vi.fn();
    this.splitTextToSize = vi.fn((text: string, _w: number) => [text]);
    this.internal = { pageSize: { width: 210, height: 297, getWidth: () => 210, getHeight: () => 297 } };
    this.getNumberOfPages = () => 1;
    this.setPage = vi.fn();
  };
  return { default: JsPDFMock };
});

vi.mock('../core/core', () => ({
  createPdfDocument: vi.fn().mockImplementation(async () => {
    const { default: JsPDF } = await import('jspdf');
    return { doc: new JsPDF(), fontFamily: 'Amiri', startY: 40 };
  }),
  finalizePdf: vi.fn(),
  reshapeArabic: (t: string) => t,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

describe('generateAnnualReportPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseData = {
    fiscalYearLabel: '2024-2025',
    achievements: [{ title: 'تحصيل 100%', content: 'تم تحصيل كامل الإيجارات' }],
    challenges: [{ title: 'تأخر صيانة', content: 'تأخر في إصلاح بعض الوحدات' }],
    futurePlans: [{ title: 'توسعة', content: 'إضافة وحدات جديدة' }],
    propertyStatuses: [{ title: 'مبنى أ', content: 'حالة ممتازة', propertyName: 'عقار 1' }],
  };

  it('ينشئ PDF ويستدعي finalizePdf', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    await generateAnnualReportPDF(baseData);
    const { finalizePdf } = await import('./core');
    expect(finalizePdf).toHaveBeenCalledTimes(1);
    expect(vi.mocked(finalizePdf).mock.calls[0]?.[2]).toContain('التقرير_السنوي');
  });

  it('يعرض عنوان التقرير مع السنة المالية', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    await generateAnnualReportPDF(baseData);
    const titleCalls = mockText.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('التقرير السنوي')
    );
    expect(titleCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('يكتب جميع الأقسام الأربعة', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    await generateAnnualReportPDF(baseData);
    const sections = ['حالة العقارات', 'الإنجازات', 'التحديات', 'الخطط المستقبلية'];
    for (const section of sections) {
      const found = mockText.mock.calls.some(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes(section)
      );
      expect(found, `القسم "${section}" يجب أن يكون موجوداً`).toBe(true);
    }
  });

  it('يعالج أقسام فارغة بدون خطأ', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    await expect(generateAnnualReportPDF({
      ...baseData,
      achievements: [],
      challenges: [],
      futurePlans: [],
      propertyStatuses: [],
    })).resolves.not.toThrow();
  });

  it('يعرض بطاقات الملخص عند وجودها', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    mockRoundedRect.mockClear();
    await generateAnnualReportPDF({
      ...baseData,
      summaryCards: [
        { label: 'إجمالي الإيرادات', value: '500,000 ر.س' },
        { label: 'عدد العقود', value: '12' },
      ],
    });
    expect(mockRoundedRect).toHaveBeenCalled();
  });

  it('لا يعرض بطاقات ملخص عند عدم وجودها', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    mockRoundedRect.mockClear();
    await generateAnnualReportPDF(baseData);
    expect(mockRoundedRect).not.toHaveBeenCalled();
  });

  it('يعالج propertyName في عنوان البند', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    await generateAnnualReportPDF(baseData);
    const propCall = mockText.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('عقار 1')
    );
    expect(propCall).toBeDefined();
  });

  it('يعرض toast نجاح بعد الانتهاء', async () => {
    const { generateAnnualReportPDF } = await import('./annualReport');
    const { toast } = await import('sonner');
    await generateAnnualReportPDF(baseData);
    expect(toast.success).toHaveBeenCalledWith('تم تصدير التقرير السنوي بنجاح');
  });

  it('يعالج خطأ ويعرض toast خطأ', async () => {
    const { createPdfDocument } = await import('./core');
    vi.mocked(createPdfDocument).mockRejectedValueOnce(new Error('mock error'));
    const { generateAnnualReportPDF } = await import('./annualReport');
    const { toast } = await import('sonner');
    await generateAnnualReportPDF(baseData);
    expect(toast.error).toHaveBeenCalledWith('فشل في تصدير التقرير');
  });
});
