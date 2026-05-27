import { describe, it, expect } from 'vitest';
import { classifyContractOrigin } from './contractClassification';

describe('classifyContractOrigin', () => {
  const fyStart = '2025-01-01';

  it('عقد بدأ داخل السنة المالية → inYear', () => {
    expect(classifyContractOrigin('2025-03-15', fyStart)).toBe('inYear');
    expect(classifyContractOrigin('2025-01-01', fyStart)).toBe('inYear');
  });

  it('عقد بدأ قبل السنة المالية → fromPrevious', () => {
    expect(classifyContractOrigin('2024-12-31', fyStart)).toBe('fromPrevious');
    expect(classifyContractOrigin('2023-06-01', fyStart)).toBe('fromPrevious');
  });

  it('وضع كل السنوات (بدون سنة مرجعية) → unknown', () => {
    expect(classifyContractOrigin('2025-03-15', null)).toBe('unknown');
  });

  // حالات الحدود
  it('بالضبط يوم بداية السنة → inYear', () => {
    expect(classifyContractOrigin('2025-01-01', '2025-01-01')).toBe('inYear');
  });

  it('يوم واحد قبل بداية السنة → fromPrevious', () => {
    expect(classifyContractOrigin('2024-12-31', '2025-01-01')).toBe('fromPrevious');
  });

  it('الاستقرار: نفس النتيجة عبر 100 استدعاء', () => {
    const results = Array.from({ length: 100 }, () =>
      classifyContractOrigin('2024-06-15', '2025-01-01'),
    );
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('fromPrevious');
  });
});
