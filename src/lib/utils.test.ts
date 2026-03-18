import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn – className utility', () => {
  it('يدمج أسماء الأصناف', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('يتعامل مع القيم الشرطية', () => {
    const hidden = false;
    expect(cn('base', hidden ? 'hidden' : undefined, 'extra')).toBe('base extra');
  });

  it('يدمج أصناف Tailwind بذكاء', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('يتعامل مع undefined و null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('يعالج مصفوفة فارغة', () => {
    expect(cn()).toBe('');
  });
});
