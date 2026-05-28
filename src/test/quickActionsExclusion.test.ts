import { describe, it, expect } from 'vitest';
import { QUICK_ACTIONS } from '@/constants/quickActions';
import { ACCOUNTANT_EXCLUDED_ROUTES } from '@/constants/navigation';

describe('QUICK_ACTIONS — accountant exclusion contract', () => {
  it('does not surface any route accountant is forbidden from', () => {
    const accountantActions = QUICK_ACTIONS.accountant ?? [];
    const leaks = accountantActions.filter((a) =>
      ACCOUNTANT_EXCLUDED_ROUTES.some((excluded) => a.to.startsWith(excluded)),
    );
    expect(leaks, `Accountant QuickActions leak forbidden routes: ${leaks.map(l => l.to).join(', ')}`).toEqual([]);
  });
});
