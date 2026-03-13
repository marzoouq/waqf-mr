import { describe, it, expect } from 'vitest';
import { normalizeArabicDigits } from './normalizeDigits';

describe('normalizeArabicDigits', () => {
  it('يحول الأرقام العربية-الهندية إلى لاتينية', () => {
    expect(normalizeArabicDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });
  it('يحول الأرقام الفارسية إلى لاتينية', () => {
    expect(normalizeArabicDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });
  it('يحافظ على الأرقام اللاتينية', () => {
    expect(normalizeArabicDigits('0123456789')).toBe('0123456789');
  });
  it('يعالج نص مختلط', () => {
    expect(normalizeArabicDigits('test@١٢٣.com')).toBe('test@123.com');
  });
  it('يزيل المسافات الزائدة', () => {
    expect(normalizeArabicDigits('  ٤٥  ')).toBe('45');
  });
  it('يعالج نص فارغ', () => {
    expect(normalizeArabicDigits('')).toBe('');
  });
});
