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

    it('يحتوي على ZIP signature (PK)', async () => {
      const data = [{ اختبار: 'قيمة' }];
      const blob = buildXlsx(data);
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // ZIP magic bytes: PK (0x50, 0x4B)
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4B);
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
