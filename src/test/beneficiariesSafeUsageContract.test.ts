/**
 * Contract: notifications & messaging hooks MUST use beneficiaries_safe view
 * (not the raw `beneficiaries` table) to avoid PII exposure outside admin CRUD.
 *
 * Also locks cache key isolation:
 *  - usePrefetchPages uses ['beneficiaries-safe']
 *  - notification/messaging hooks use ['beneficiaries-safe', ...] (sub-keyed)
 *  - These never collide with the CRUD factory key ['beneficiaries'] used by useBeneficiaries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('beneficiaries_safe usage contract', () => {
  it('useNotificationBeneficiaries reads from beneficiaries_safe view only', () => {
    const src = read('src/hooks/data/notifications/useNotificationBeneficiaries.ts');
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).not.toMatch(/from\(['"]beneficiaries['"]\)/);
    expect(src).toMatch(/queryKey:\s*\[['"]beneficiaries-safe['"]/);
  });

  it('useBulkMessaging reads from beneficiaries_safe view only', () => {
    const src = read('src/hooks/data/messaging/useBulkMessaging.ts');
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).not.toMatch(/from\(['"]beneficiaries['"]\)/);
    expect(src).toMatch(/queryKey:\s*\[['"]beneficiaries-safe['"]/);
  });

  it('usePrefetchPages uses ["beneficiaries-safe"] key (no collision with CRUD)', () => {
    const src = read('src/hooks/data/core/usePrefetchPages.ts');
    expect(src).toMatch(/queryKey:\s*\[['"]beneficiaries-safe['"]\]/);
    // must NOT prefetch under bare ['beneficiaries'] key (CRUD factory uses that for PII table)
    expect(src).not.toMatch(/queryKey:\s*\[['"]beneficiaries['"]\]/);
  });

  it('useBeneficiariesSafe targets the safe view, useBeneficiaries (CRUD) targets the real table', () => {
    const src = read('src/hooks/data/beneficiaries/useBeneficiaries.ts');
    // CRUD factory still on real table (admin/accountant only via RLS)
    expect(src).toMatch(/table:\s*['"]beneficiaries['"]/);
    expect(src).toMatch(/queryKey:\s*['"]beneficiaries['"]/);
    // Safe variant on view
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).toMatch(/queryKey:\s*\[['"]beneficiaries-safe['"]\]/);
  });
});
