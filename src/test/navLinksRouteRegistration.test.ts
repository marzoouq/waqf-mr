/**
 * Round V2 — كل to في navigation links مسجَّل كـ <Route path> فعلي
 *
 * يمنع روابط ميتة في القائمة الجانبية (مثل ادعاء "/waqif يتيم").
 * يقرأ مباشرة من ملفات routes/*.tsx لاستخراج المسارات الفعلية.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allAdminLinks, allBeneficiaryLinks } from '@/constants/navigation';

const ROOT = process.cwd();
const ROUTE_FILES = [
  'src/routes/adminRoutes.tsx',
  'src/routes/beneficiaryRoutes.tsx',
  'src/routes/waqifRoutes.tsx',
  'src/routes/publicRoutes.tsx',
];

function extractRegisteredPaths(): Set<string> {
  const re = /<Route\s+path=["']([^"'*]+)["']/g;
  const out = new Set<string>();
  for (const f of ROUTE_FILES) {
    const content = readFileSync(resolve(ROOT, f), 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) out.add(m[1]);
  }
  return out;
}

const registered = extractRegisteredPaths();

describe('Round V2 — Navigation links ↔ Route registration', () => {
  it('استُخرجت المسارات من ملفات routes (sanity check)', () => {
    expect(registered.size).toBeGreaterThan(15);
    expect(registered.has('/dashboard')).toBe(true);
    expect(registered.has('/beneficiary')).toBe(true);
    expect(registered.has('/waqif')).toBe(true);
  });

  it('كل رابط في allAdminLinks له <Route> مسجَّل', () => {
    const missing = allAdminLinks.map(l => l.to).filter(to => !registered.has(to));
    expect(missing, `روابط بدون Route: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل رابط في allBeneficiaryLinks له <Route> مسجَّل', () => {
    const missing = allBeneficiaryLinks.map(l => l.to).filter(to => !registered.has(to));
    expect(missing, `روابط مستفيد بدون Route: ${missing.join(', ')}`).toEqual([]);
  });

  it('/waqif مسجَّل (نقطة فحص صريحة #26)', () => {
    expect(registered.has('/waqif')).toBe(true);
  });

  it('/unauthorized مسجَّل (وجهة redirect عند رفض الصلاحية)', () => {
    expect(registered.has('/unauthorized')).toBe(true);
  });
});
