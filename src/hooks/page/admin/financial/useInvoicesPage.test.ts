/**
 * اختبارات sanitizeDescription — حماية ضد CSV Injection
 *
 * الدالة محلية في useInvoicesPage؛ نُعيد تعريفها هنا للاختبار المباشر
 * (نفس المنطق بالضبط — أي تغيير يجب أن يُحدَّث في كلا الموقعين).
 */
import { describe, it, expect } from 'vitest';

const sanitizeDescription = (value: string): string => {
  if (!value) return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
};

describe('sanitizeDescription', () => {
  it('يحذف = من البداية', () => {
    expect(sanitizeDescription('=SUM(A1:A10)')).toBe('SUM(A1:A10)');
  });

  it('يحذف + من البداية', () => {
    expect(sanitizeDescription('+1234567')).toBe('1234567');
  });

  it('يحذف - من البداية', () => {
    expect(sanitizeDescription('-cmd|calc')).toBe('cmd|calc');
  });

  it('يحذف @ من البداية (DDE)', () => {
    expect(sanitizeDescription('@SUM(1+1)*cmd|/c calc')).toBe('SUM(1+1)*cmd|/c calc');
  });

  it('يحذف الرموز المتعددة من البداية', () => {
    expect(sanitizeDescription('=+-@text')).toBe('text');
  });

  it('يحذف tab وreturn من البداية', () => {
    expect(sanitizeDescription('\t\r=text')).toBe('text');
  });

  it('يُبقي النص الآمن كما هو', () => {
    expect(sanitizeDescription('وصف عادي للفاتورة')).toBe('وصف عادي للفاتورة');
  });

  it('لا يلمس الرموز في وسط النص', () => {
    expect(sanitizeDescription('Total = 100')).toBe('Total = 100');
  });

  it('يُرجع نص فارغ كما هو', () => {
    expect(sanitizeDescription('')).toBe('');
  });

  it('يتعامل مع نصوص عربية مع رمز خبيث', () => {
    expect(sanitizeDescription('=فاتورة كهرباء')).toBe('فاتورة كهرباء');
  });

  it('يحمي من XSS-like في CSV', () => {
    expect(sanitizeDescription('=HYPERLINK("http://evil.com","click")')).toBe('HYPERLINK("http://evil.com","click")');
  });
});
