import { describe, it, expect } from 'vitest';
import { numberToArabicWords, amountToArabicWords } from './arabicNumberWords';

describe('numberToArabicWords', () => {
  it('صفر', () => expect(numberToArabicWords(0)).toBe('صفر'));
  it('آحاد وعشرات', () => {
    expect(numberToArabicWords(5)).toBe('خمسة');
    expect(numberToArabicWords(11)).toBe('أحد عشر');
    expect(numberToArabicWords(25)).toBe('خمسة وعشرون');
  });
  it('مئات وآلاف', () => {
    expect(numberToArabicWords(1350)).toBe('ألف وثلاثمائة وخمسون');
    expect(numberToArabicWords(2000)).toBe('ألفان');
    expect(numberToArabicWords(16200)).toBe('ستة عشر ألفاً ومائتان');
    expect(numberToArabicWords(259200)).toBe('مائتان وتسعة وخمسون ألفاً ومائتان');
  });
  it('ملايين', () => expect(numberToArabicWords(1000000)).toBe('مليون'));
});

describe('amountToArabicWords', () => {
  it('ريال بلا هللات', () => expect(amountToArabicWords(1350)).toBe('ألف وثلاثمائة وخمسون ريالاً سعودياً فقط لا غير'));
  it('مع هللات', () => expect(amountToArabicWords(1237.5)).toBe('ألف ومائتان وسبعة وثلاثون ريالاً سعودياً وخمسون هللة فقط لا غير'));
});
