import { describe, it, expect } from 'vitest';
import { sanitizeFrom, isFromAllowedForRole } from './useRoleRedirect';

describe('sanitizeFrom', () => {
  it('rejects external/protocol-relative/auth/unauthorized', () => {
    expect(sanitizeFrom(null)).toBeNull();
    expect(sanitizeFrom('')).toBeNull();
    expect(sanitizeFrom('https://evil.com')).toBeNull();
    expect(sanitizeFrom('//evil.com')).toBeNull();
    expect(sanitizeFrom('/auth')).toBeNull();
    expect(sanitizeFrom('/unauthorized')).toBeNull();
  });
  it('accepts internal paths', () => {
    expect(sanitizeFrom('/beneficiary/invoices')).toBe('/beneficiary/invoices');
    expect(sanitizeFrom('/dashboard/users')).toBe('/dashboard/users');
  });
});

describe('isFromAllowedForRole', () => {
  it('beneficiary cannot use admin paths', () => {
    expect(isFromAllowedForRole('/dashboard/users', 'beneficiary')).toBe(false);
    expect(isFromAllowedForRole('/beneficiary/invoices', 'beneficiary')).toBe(true);
  });
  it('waqif limited to /waqif', () => {
    expect(isFromAllowedForRole('/dashboard', 'waqif')).toBe(false);
    expect(isFromAllowedForRole('/beneficiary', 'waqif')).toBe(false);
    expect(isFromAllowedForRole('/waqif', 'waqif')).toBe(true);
  });
  it('accountant limited to /dashboard', () => {
    expect(isFromAllowedForRole('/dashboard/income', 'accountant')).toBe(true);
    expect(isFromAllowedForRole('/beneficiary', 'accountant')).toBe(false);
  });
  it('admin allowed dashboard and beneficiary preview', () => {
    expect(isFromAllowedForRole('/dashboard/users', 'admin')).toBe(true);
    expect(isFromAllowedForRole('/beneficiary/invoices', 'admin')).toBe(true);
  });
  it('unknown role denied', () => {
    expect(isFromAllowedForRole('/dashboard', 'guest')).toBe(false);
  });
});
