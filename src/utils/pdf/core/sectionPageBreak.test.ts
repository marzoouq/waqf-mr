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
