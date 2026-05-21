/**
 * اختبارات BiometricLoginButton — يضمن:
 *  - ظهور الزر عند دعم WebAuthn ووجود مؤشر waqf_biometric_enabled
 *  - رسالة إرشادية عند غياب المؤشر
 *  - رسالة عدم دعم المتصفح
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockBrowserSupports = vi.hoisted(() => vi.fn());
vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => mockBrowserSupports(),
  startAuthentication: vi.fn(),
}));

vi.mock('@/hooks/auth/biometric/useWebAuthn', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/auth/biometric/useWebAuthn')>(
    '@/hooks/auth/biometric/useWebAuthn',
  );
  return {
    ...actual,
    useWebAuthn: () => ({
      isLoading: false,
      authenticateWithBiometric: vi.fn(),
    }),
  };
});

import BiometricLoginButton from './BiometricLoginButton';

describe('BiometricLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('يعرض رسالة عدم الدعم عندما يكون المتصفح غير مدعوم', () => {
    mockBrowserSupports.mockReturnValue(false);
    render(<BiometricLoginButton />);
    expect(screen.getByText(/لا يدعم تسجيل الدخول بالبصمة/)).toBeInTheDocument();
  });

  it('يعرض رسالة إرشادية عندما لا يوجد مؤشر بصمة محلي', () => {
    mockBrowserSupports.mockReturnValue(true);
    render(<BiometricLoginButton />);
    expect(screen.getByText(/فعّلها من الإعدادات/)).toBeInTheDocument();
  });

  it('يعرض زر البصمة عند الدعم ووجود المؤشر', () => {
    mockBrowserSupports.mockReturnValue(true);
    localStorage.setItem('waqf_biometric_enabled', 'true');
    render(<BiometricLoginButton />);
    expect(screen.getByRole('button', { name: /تسجيل الدخول بالبصمة/ })).toBeInTheDocument();
  });
});
