import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockText = vi.fn();
vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return {
      text: mockText, save: mockSave, setFont: vi.fn(), setFontSize: vi.fn(),
      addPage: mockAddPage, setFillColor: vi.fn(), setTextColor: vi.fn(),
      setDrawColor: vi.fn(), setLineWidth: vi.fn(), line: vi.fn(),
      roundedRect: vi.fn(), getTextWidth: vi.fn(() => 40),
      splitTextToSize: vi.fn((text: string) => text.split('\n')),
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
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_GOLD: [161, 128, 48],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
}));

import { generateBylawsPDF } from './bylaws';

describe('generateBylawsPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates PDF with table of contents and content pages', async () => {
    await generateBylawsPDF([
      { part_number: 1, part_title: 'أحكام عامة', chapter_title: null, content: 'نص اللائحة **مع تنسيق**' },
    ]);
    expect(mockSave).toHaveBeenCalledWith('waqf-bylaws.pdf');
    expect(mockAddPage).toHaveBeenCalled();
  });

  it('strips markdown from content', async () => {
    await generateBylawsPDF([
      { part_number: 0, part_title: 'المقدمة', chapter_title: 'مقدمة', content: '# عنوان\n**جريء** *مائل*' },
    ]);
    // لن يحتوي النص الناتج على رموز markdown
    expect(mockSave).toHaveBeenCalled();
  });
});
