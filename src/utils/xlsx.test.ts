import { describe, it, expect, vi } from 'vitest';
import { buildXlsx, downloadXlsx } from './xlsx';

describe('xlsx utilities', () => {
  describe('buildXlsx', () => {
    it('يعيد Blob فارغ عند تمرير مصفوفة فارغة', () => {
      const blob = buildXlsx([]);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(0);
    });

    it('يبني ملف XLSX صالح من بيانات بسيطة', () => {
      const data = [
        { الاسم: 'أحمد', العمر: 30 },
        { الاسم: 'سارة', العمر: 25 },
      ];
      const blob = buildXlsx(data);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('يتعامل مع القيم الفارغة والمفقودة', () => {
      const data = [
        { الحقل: null, آخر: undefined, ثالث: '' },
      ];
      const blob = buildXlsx(data as Record<string, unknown>[]);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('يتعامل مع الأرقام والنصوص معاً', () => {
      const data = [
        { المبلغ: 1500.75, الوصف: 'إيجار شهري', الرمز: '001' },
      ];
      const blob = buildXlsx(data);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('ينتج Blob بحجم معقول يتناسب مع البيانات', () => {
      const small = buildXlsx([{ أ: 1 }]);
      const bigger = buildXlsx([
        { أ: 1, ب: 2, ج: 3 },
        { أ: 4, ب: 5, ج: 6 },
        { أ: 7, ب: 8, ج: 9 },
      ]);
      expect(bigger.size).toBeGreaterThan(small.size);
    });

    it('يتعامل مع أحرف XML الخاصة', () => {
      const data = [{ العنوان: '<div>"test" & \'more\'' }];
      const blob = buildXlsx(data);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('يعالج عدداً كبيراً من الأعمدة (>26)', () => {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < 30; i++) row[`عمود_${i}`] = i;
      const blob = buildXlsx([row]);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('downloadXlsx', () => {
    it('ينشئ رابط تحميل ويضغط عليه', () => {
      const clickSpy = vi.fn();
      const createSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        set href(_: string) { /* noop */ },
        set download(_: string) { /* noop */ },
        click: clickSpy,
      } as unknown as HTMLAnchorElement);

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

      const blob = new Blob(['test']);
      downloadXlsx(blob, 'report.xlsx');

      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeSpy).toHaveBeenCalledWith('blob:test');

      createSpy.mockRestore();
      revokeSpy.mockRestore();
    });
  });
});
