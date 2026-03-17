import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateForensicAuditPDF, ForensicAuditData } from './forensicAudit';

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

// Mock core utilities
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addFooter: vi.fn(),
  addHeaderToAllPages: vi.fn(),
  baseTableStyles: vi.fn().mockReturnValue({}),
  headStyles: vi.fn().mockReturnValue({}),
  TABLE_HEAD_GREEN: [22, 101, 52],
  TABLE_HEAD_GOLD: [202, 138, 4],
  TABLE_HEAD_RED: [180, 40, 40],
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
}));

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockLine = vi.fn();
const mockCircle = vi.fn();
const mockRoundedRect = vi.fn();
const mockSetLineDashPattern = vi.fn();
const mockAddPage = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      internal = { pageSize: { width: 210, height: 297 } };
      text = mockText;
      setFont = mockSetFont;
      setFontSize = mockSetFontSize;
      setTextColor = mockSetTextColor;
      setFillColor = mockSetFillColor;
      setDrawColor = mockSetDrawColor;
      setLineWidth = mockSetLineWidth;
      line = mockLine;
      circle = mockCircle;
      roundedRect = mockRoundedRect;
      setLineDashPattern = mockSetLineDashPattern;
      addPage = mockAddPage;
      save = mockSave;
      lastAutoTable = { finalY: 120 };
    },
  };
});

const sampleData: ForensicAuditData = {
  auditDate: '2025-02-17',
  auditorName: 'نظام الوقف',
  overallScore: 9.8,
  totalFiles: 113,
  issuesFound: 5,
  issuesFixed: 4,
  categories: [
    { category: 'أمن البيانات', status: 'سليم', details: 'RLS مفعّل', score: '10/10' },
    { category: 'إخفاء البيانات', status: 'مُصحح', details: 'تم التصحيح', score: '9/10' },
  ],
  securityFindings: [
    { finding: 'بيانات المستفيدين', severity: 'خطأ', status: 'مُعالج', notes: 'محمي بـ RLS' },
    { finding: 'سجل التدقيق', severity: 'تحذير', status: 'معلق', notes: 'يتطلب تفعيل يدوي' },
  ],
};

describe('generateForensicAuditPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate PDF without errors', async () => {
    await expect(generateForensicAuditPDF(sampleData)).resolves.not.toThrow();
  });

  it('should save file with correct name containing date', async () => {
    await generateForensicAuditPDF(sampleData);
    expect(mockSave).toHaveBeenCalledWith('تقرير-الفحص-الجنائي-2025-02-17.pdf');
  });

  it('should handle empty categories and findings', async () => {
    const emptyData: ForensicAuditData = {
      ...sampleData,
      categories: [],
      securityFindings: [],
    };
    await expect(generateForensicAuditPDF(emptyData)).resolves.not.toThrow();
  });

  it('should work without waqfInfo', async () => {
    await expect(generateForensicAuditPDF(sampleData)).resolves.not.toThrow();
  });

  it('should work with waqfInfo', async () => {
    const waqfInfo = { name: 'وقف الاختبار', founder: 'محمد', admin: 'أحمد', logoUrl: '' };
    await expect(generateForensicAuditPDF(sampleData, waqfInfo)).resolves.not.toThrow();
  });

  it('should call autoTable twice (categories + security)', async () => {
    const autoTable = (await import('jspdf-autotable')).default;
    await generateForensicAuditPDF(sampleData);
    expect(autoTable).toHaveBeenCalledTimes(2);
  });

  it('should render report title', async () => {
    await generateForensicAuditPDF(sampleData);
    expect(mockText).toHaveBeenCalledWith(
      'تقرير الفحص الجنائي',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'center' })
    );
  });
});
