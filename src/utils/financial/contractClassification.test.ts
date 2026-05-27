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
});
