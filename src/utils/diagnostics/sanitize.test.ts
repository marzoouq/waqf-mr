import { describe, it, expect } from 'vitest';
import { sanitizeDiagnosticOutput } from './sanitize';

describe('sanitizeDiagnosticOutput', () => {
  it('يحذف البريد الإلكتروني', () => {
    expect(sanitizeDiagnosticOutput('user test@example.com here'))
      .toBe('user [EMAIL] here');
  });

  it('يحذف JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(sanitizeDiagnosticOutput(`token: ${jwt}`))
      .toBe('token: [JWT]');
  });

  it('يحذف UUIDs', () => {
    expect(sanitizeDiagnosticOutput('id: a1b2c3d4-e5f6-7890-abcd-ef1234567890'))
      .toBe('id: [UUID]');
  });

  it('يحذف أرقام الهوية الوطنية', () => {
    expect(sanitizeDiagnosticOutput('هوية: 1234567890'))
      .toBe('هوية: [NATIONAL_ID]');
  });

  it('لا يغيّر نصاً عادياً', () => {
    expect(sanitizeDiagnosticOutput('كل شيء يعمل بنجاح'))
      .toBe('كل شيء يعمل بنجاح');
  });
});
