import { describe, it, expect } from 'vitest';
import { reshapeArabic, reshapeRow } from './arabicReshaper';

/**
 * اختبارات دالة reshapeArabic و reshapeRow
 * التحقق من: اتصال الحروف العربية، ترتيب الأرقام، النصوص المختلطة
 */

describe('reshapeArabic', () => {
  it('يُرجع نصاً فارغاً بدون تعديل', () => {
    expect(reshapeArabic('')).toBe('');
  });

  it('يُرجع null/undefined بدون تعديل', () => {
    expect(reshapeArabic(null as any)).toBe(null);
    expect(reshapeArabic(undefined as any)).toBe(undefined);
  });

  it('يُرجع نصاً إنجليزياً بدون تعديل', () => {
    expect(reshapeArabic('Hello World')).toBe('Hello World');
  });

  it('يُرجع أرقاماً بدون تعديل', () => {
    expect(reshapeArabic('12345')).toBe('12345');
  });

  it('يُحوّل النص العربي إلى Presentation Forms (حروف متصلة)', () => {
    const result = reshapeArabic('رقم العقد');
    // يجب أن يكون الناتج مختلفاً عن المدخل (تم تشكيله)
    expect(result).not.toBe('رقم العقد');
    // يجب أن يحتوي على حروف من Presentation Forms-B (0xFE70-0xFEFF)
    let hasPresentationForm = false;
    for (let i = 0; i < result.length; i++) {
      const code = result.charCodeAt(i);
      if (code >= 0xFE70 && code <= 0xFEFF) {
        hasPresentationForm = true;
        break;
      }
    }
    expect(hasPresentationForm).toBe(true);
  });

  it('يحافظ على اتصال الحروف — لا يعكس داخل الكلمة', () => {
    const result = reshapeArabic('محمد');
    // الناتج يجب أن يكون كلمة واحدة (بدون مسافات)
    expect(result.trim().split(' ').length).toBe(1);
    // الطول يجب أن يكون مساوياً أو أقل (Presentation Forms قد تدمج حروفاً)
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it('يعكس ترتيب الكلمات العربية (للعرض RTL في jsPDF)', () => {
    const result = reshapeArabic('رقم العقد');
    // الناتج يجب أن يحتوي على كلمتين
    const words = result.trim().split(' ').filter(w => w.length > 0);
    expect(words.length).toBe(2);
  });

  it('يحافظ على الأرقام بترتيبها الصحيح في نص مختلط', () => {
    const result = reshapeArabic('عقد رقم 12345');
    // الأرقام يجب أن تظهر بنفس الترتيب 12345
    expect(result).toContain('12345');
  });

  it('يحافظ على النص اللاتيني بترتيبه في نص مختلط', () => {
    const result = reshapeArabic('اسم ABC تجربة');
    expect(result).toContain('ABC');
  });

  it('يعالج نصاً عربياً طويلاً بدون خطأ', () => {
    const longText = 'تقرير الحسابات المالية للسنة المالية الأولى من عام ألف وأربعمائة وخمسة وأربعين';
    const result = reshapeArabic(longText);
    expect(result.length).toBeGreaterThan(0);
    // يجب أن يحتوي على حروف Presentation Forms
    let hasPF = false;
    for (let i = 0; i < result.length; i++) {
      const code = result.charCodeAt(i);
      if ((code >= 0xFB50 && code <= 0xFDFF) || (code >= 0xFE70 && code <= 0xFEFF)) {
        hasPF = true;
        break;
      }
    }
    expect(hasPF).toBe(true);
  });

  it('يعالج نصاً يحتوي على تشكيل', () => {
    const result = reshapeArabic('بِسْمِ اللَّهِ');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('reshapeRow', () => {
  it('يعالج مصفوفة مختلطة (نص عربي، أرقام، null)', () => {
    const row = ['رقم العقد', 12345, null, 'Hello'];
    const result = reshapeRow(row);

    // النص العربي يجب أن يتحوّل
    expect(result[0]).not.toBe('رقم العقد');
    // الأرقام تبقى كما هي
    expect(result[1]).toBe(12345);
    // null تبقى كما هي
    expect(result[2]).toBeNull();
    // النص الإنجليزي يبقى كما هو
    expect(result[3]).toBe('Hello');
  });

  it('يعالج كائنات { content } داخل المصفوفة', () => {
    const row = [{ content: 'اسم المستأجر', styles: { fontStyle: 'bold' } }];
    const result = reshapeRow(row);

    expect(result[0].styles.fontStyle).toBe('bold');
    expect(result[0].content).not.toBe('اسم المستأجر');
    // يجب أن يحتوي على Presentation Forms
    let hasPF = false;
    for (let i = 0; i < result[0].content.length; i++) {
      const code = result[0].content.charCodeAt(i);
      if (code >= 0xFE70 && code <= 0xFEFF) {
        hasPF = true;
        break;
      }
    }
    expect(hasPF).toBe(true);
  });

  it('يعالج كائنات { content } رقمية بدون تعديل', () => {
    const row = [{ content: 500, colSpan: 2 }];
    const result = reshapeRow(row);
    expect(result[0].content).toBe(500);
    expect(result[0].colSpan).toBe(2);
  });

  it('يعالج مصفوفة فارغة', () => {
    expect(reshapeRow([])).toEqual([]);
  });
});
