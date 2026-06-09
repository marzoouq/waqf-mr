/**
 * Contract: notifications & messaging hooks MUST use beneficiaries_safe view
 * (not the raw `beneficiaries` table) to avoid PII exposure outside admin CRUD.
 *
 * Also locks cache key isolation via the central `beneficiariesKeys` factory:
 *  - usePrefetchPages uses beneficiariesKeys.safe()
 *  - notification/messaging hooks use sub-keyed factories under beneficiaries-safe prefix
 *  - These never collide with the CRUD factory key ['beneficiaries'] used by useBeneficiaries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('beneficiaries_safe usage contract', () => {
  it('central factory tuples remain stable under beneficiaries-safe prefix', () => {
    expect(beneficiariesKeys.safe()).toEqual(['beneficiaries-safe']);
    expect(beneficiariesKeys.notificationRecipients()).toEqual(['beneficiaries-safe', 'notifications-recipients']);
    expect(beneficiariesKeys.messagingRecipients()).toEqual(['beneficiaries-safe', 'messaging-recipients']);
    expect(beneficiariesKeys.prefixes.crud).toEqual(['beneficiaries']);
  });

  it('useNotificationBeneficiaries reads from beneficiaries_safe view via central factory', () => {
    const src = read('src/hooks/data/notifications/useNotificationBeneficiaries.ts');
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).not.toMatch(/from\(['"]beneficiaries['"]\)/);
    expect(src).toMatch(/beneficiariesKeys\.notificationRecipients\(\)/);
  });

  it('useBulkMessaging reads from beneficiaries_safe view via central factory', () => {
    const src = read('src/hooks/data/messaging/useBulkMessaging.ts');
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).not.toMatch(/from\(['"]beneficiaries['"]\)/);
    expect(src).toMatch(/beneficiariesKeys\.messagingRecipients\(\)/);
  });

  it('usePrefetchPages uses beneficiariesKeys.safe() (no collision with CRUD)', () => {
    const src = read('src/hooks/data/core/usePrefetchPages.ts');
    expect(src).toMatch(/beneficiariesKeys\.safe\(\)/);
    // must NOT prefetch under bare ['beneficiaries'] key (CRUD factory uses that for PII table)
    expect(src).not.toMatch(/queryKey:\s*\[['"]beneficiaries['"]\]/);
  });

  it('useBeneficiariesSafe targets the safe view, useBeneficiaries (CRUD) targets the real table', () => {
    const src = read('src/hooks/data/beneficiaries/useBeneficiaries.ts');
    // CRUD factory still on real table (admin/accountant only via RLS)
    expect(src).toMatch(/table:\s*['"]beneficiaries['"]/);
    expect(src).toMatch(/queryKey:\s*['"]beneficiaries['"]/);
    // Safe variant on view through central factory
    expect(src).toMatch(/from\(['"]beneficiaries_safe['"]\)/);
    expect(src).toMatch(/beneficiariesKeys\.safe\(\)/);
  });
});
