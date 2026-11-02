import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// حارس انحدار: يمنع الرجوع لإصدارات بها ثغرات معروفة
const lock = readFileSync(resolve(process.cwd(), 'bun.lock'), 'utf8');

function resolvedVersion(pkg: string): number[] {
  const match = lock.match(new RegExp(`"${pkg}": \\["${pkg}@(\\d+)\\.(\\d+)\\.(\\d+)"`));
  if (!match) throw new Error(`${pkg} not found in bun.lock`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

describe('dependency security floor', () => {
  it('zod is 4.6.6 or later (GHSA-mrhx-c7xc-m3w5)', () => {
    expect(compare(resolvedVersion('zod'), [4, 6, 6])).toBeGreaterThanOrEqual(0);
  });
  it('dompurify is above 3.4.16 (GHSA-mrv2-3pqr-j5jr)', () => {
    expect(compare(resolvedVersion('dompurify'), [3, 4, 16])).toBeGreaterThan(0);
  });
});
