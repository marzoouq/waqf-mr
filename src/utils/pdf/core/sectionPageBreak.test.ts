import { describe, it, expect, vi } from 'vitest';
import type jsPDF from 'jspdf';
import { startSectionPage } from '@/utils/pdf/core/pdfLayout';

const mkDoc = () => ({ addPage: vi.fn() }) as unknown as jsPDF & { addPage: ReturnType<typeof vi.fn> };

describe('startSectionPage — كل قسم في صفحة مستقلة', () => {
  it('يبدأ قسم المصروفات بصفحة جديدة حتى لو بقي مكان في صفحة الإيرادات', () => {
    const doc = mkDoc();
    const y = startSectionPage(doc, 25, 90);
    expect(doc.addPage).toHaveBeenCalledTimes(1);
    expect(y).toBe(25);
  });
  it('لا يُنتج صفحة فارغة إذا كانت الصفحة الحالية ما زالت فارغة', () => {
    const doc = mkDoc();
    expect(startSectionPage(doc, 25, 25)).toBe(25);
    expect(doc.addPage).not.toHaveBeenCalled();
  });
});

describe('insertTableOfContents — فهرس في الصفحة الأولى', () => {
  it('يُدرج صفحة فهرس عند وجود 3 أقسام فأكثر', async () => {
    const { insertTableOfContents } = await import('@/utils/pdf/core/pdfLayout');
    let pages = 1;
    const doc = {
      addPage: vi.fn(() => { pages++; }), getNumberOfPages: () => pages,
      insertPage: vi.fn(), setPage: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(),
      text: vi.fn(), setDrawColor: vi.fn(), line: vi.fn(), getTextWidth: () => 10,
      internal: { pageSize: { width: 210 } },
    } as unknown as jsPDF & { insertPage: ReturnType<typeof vi.fn> };
    ['الإيرادات', 'المصروفات', 'التوزيعات'].forEach(t => startSectionPage(doc, 25, 100, t));
    expect(insertTableOfContents(doc, 'Amiri')).toBe(true);
    expect(doc.insertPage).toHaveBeenCalledWith(1);
  });
});
