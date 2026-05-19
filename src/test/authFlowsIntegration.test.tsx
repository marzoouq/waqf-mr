/**
 * Integration tests — Auth flows continuity
 *
 * نختبر استمرارية الصلاحيات (role) عبر تدفقات:
 *   1) تسجيل الدخول بالبريد         (useLoginForm)
 *   2) تغيير كلمة المرور             (useChangePassword)
 *   3) طلب إعادة تعيين كلمة المرور   (usePasswordResetRequest)
 *   4) تنفيذ إعادة تعيين كلمة المرور (useResetPassword)
 *   5) البصمة                        (تغطية بنيوية عبر useWebAuthn.test.ts)
 *
 * كل تدفّق يجب أن يستدعي Supabase auth بشكل صحيح ولا يلمس AuthState.role
 * (الصلاحيات تُحسب من جدول user_roles عبر has_role؛ هذه التدفقات لا تكتب أدواراً).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Hoisted mocks ───────────────────────────────────────────────────
const { updateUserMock, resetPasswordForEmailMock, onAuthStateChangeMock, notifyMock } = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  onAuthStateChangeMock: vi.fn((_cb: unknown) => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  notifyMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: (arg: unknown) => updateUserMock(arg),
      resetPasswordForEmail: (email: unknown, opts: unknown) => resetPasswordForEmailMock(email, opts),
      onAuthStateChange: (cb: unknown) => onAuthStateChangeMock(cb),
    },
  },
}));

vi.mock('@/lib/notify', () => ({ uiNotify: notifyMock }));

vi.mock('@/lib/services/accessLogService', () => ({ logAccessEvent: vi.fn() }));
vi.mock('@/lib/auth/nationalIdLogin', () => ({ handleNationalIdLogin: vi.fn() }));

import { useLoginForm } from '@/hooks/auth/flows/useLoginForm';
import { useChangePassword } from '@/hooks/auth/flows/useChangePassword';
import { usePasswordResetRequest } from '@/hooks/auth/flows/usePasswordResetRequest';
import { useResetPassword } from '@/hooks/auth/flows/useResetPassword';

beforeEach(() => {
  updateUserMock.mockReset();
  resetPasswordForEmailMock.mockReset();
  notifyMock.success.mockClear();
  notifyMock.error.mockClear();
});

// ────────────────────────────────────────────────────────────────────
// 1) Login flow
// ────────────────────────────────────────────────────────────────────
describe('useLoginForm — تسجيل الدخول بالبريد', () => {
  it('يستدعي signIn ولا يكتب أي role محلياً', async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    const { result } = renderHook(() => useLoginForm({ signIn }));

    act(() => {
      result.current.setLoginEmail('admin@example.com');
      result.current.setLoginPassword('Passw0rd!');
    });

    await act(async () => {
      await result.current.handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(signIn).toHaveBeenCalledWith('admin@example.com', 'Passw0rd!');
    expect(notifyMock.error).not.toHaveBeenCalled();
  });

  it('يعرض خطأ آمن عند فشل signIn ولا يفقد serverError', async () => {
    const signIn = vi.fn(async () => ({ error: new Error('Invalid login credentials') }));
    const { result } = renderHook(() => useLoginForm({ signIn }));

    act(() => {
      result.current.setLoginEmail('x@y.com');
      result.current.setLoginPassword('badpass');
    });

    await act(async () => {
      await result.current.handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(signIn).toHaveBeenCalled();
    expect(result.current.serverError).toBeTruthy();
    expect(notifyMock.error).toHaveBeenCalled();
  });

  it('يمنع الإرسال عند بيانات فارغة (validation محلية)', async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    const { result } = renderHook(() => useLoginForm({ signIn }));

    await act(async () => {
      await result.current.handleSignIn({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(signIn).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.email).toBeTruthy();
    expect(result.current.fieldErrors.password).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────
// 2) Change password
// ────────────────────────────────────────────────────────────────────
describe('useChangePassword — تغيير كلمة المرور', () => {
  it('ينجح ويُظهر إشعار نجاح', async () => {
    updateUserMock.mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useChangePassword());

    let ok = false;
    await act(async () => { ok = await result.current.changePassword('NewPass123!'); });

    expect(ok).toBe(true);
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewPass123!' });
    expect(notifyMock.success).toHaveBeenCalled();
  });

  it('يفشل بأمان عند خطأ Supabase', async () => {
    updateUserMock.mockResolvedValueOnce({ error: new Error('weak password') });
    const { result } = renderHook(() => useChangePassword());

    let ok = true;
    await act(async () => { ok = await result.current.changePassword('123'); });

    expect(ok).toBe(false);
    expect(notifyMock.error).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────
// 3) Password reset request
// ────────────────────────────────────────────────────────────────────
describe('usePasswordResetRequest — طلب رابط', () => {
  it('يرسل الرابط مع redirectTo الصحيح', async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePasswordResetRequest(onSuccess));

    act(() => result.current.setResetEmail('u@example.com'));
    await act(async () => { await result.current.handleRequest(); });

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      'u@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') }),
    );
    expect(notifyMock.success).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('يرفض الإرسال عند بريد فارغ', async () => {
    const { result } = renderHook(() => usePasswordResetRequest());
    await act(async () => { await result.current.handleRequest(); });
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
    expect(notifyMock.error).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────
// 4) Reset password page hook
// ────────────────────────────────────────────────────────────────────
describe('useResetPassword — تنفيذ التغيير', () => {
  it('يستدعي updateUser ويضع success=true عند التطابق', async () => {
    updateUserMock.mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useResetPassword());

    act(() => {
      result.current.setPassword('NewStrong1!');
      result.current.setConfirmPassword('NewStrong1!');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewStrong1!' });
    expect(result.current.success).toBe(true);
  });

  it('يرفض كلمات المرور القصيرة وغير المتطابقة', async () => {
    const { result } = renderHook(() => useResetPassword());

    act(() => { result.current.setPassword('short'); result.current.setConfirmPassword('short'); });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    });
    expect(updateUserMock).not.toHaveBeenCalled();

    act(() => { result.current.setPassword('Strong123!'); result.current.setConfirmPassword('Other123!'); });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    });
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(notifyMock.error).toHaveBeenCalled();
  });

  it('يشترك في onAuthStateChange للاستماع لـ PASSWORD_RECOVERY', () => {
    renderHook(() => useResetPassword());
    expect(onAuthStateChangeMock).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────
// 5) Permissions continuity — structural guard
// ────────────────────────────────────────────────────────────────────
describe('استمرارية الصلاحيات — لا تدفّق auth يكتب user_roles', () => {
  const ROOT = process.cwd();
  const files = [
    'src/hooks/auth/flows/useLoginForm.ts',
    'src/hooks/auth/flows/useChangePassword.ts',
    'src/hooks/auth/flows/usePasswordResetRequest.ts',
    'src/hooks/auth/flows/useResetPassword.ts',
    'src/hooks/auth/biometric/useWebAuthnAuth.ts',
    'src/hooks/auth/biometric/useWebAuthnRegister.ts',
    'src/hooks/auth/biometric/useWebAuthnManage.ts',
  ];

  it.each(files)('%s لا يُعدّل جدول user_roles أو app_role', (relPath) => {
    const src = readFileSync(join(ROOT, relPath), 'utf8');
    // لا insert/update/delete على user_roles
    expect(src).not.toMatch(/from\(['"]user_roles['"]\)[\s\S]{0,200}\.(insert|update|upsert|delete)/);
    // لا كتابة لـ app_role enum
    expect(src).not.toMatch(/\.(insert|update|upsert)\([^)]*['"]role['"]\s*:\s*['"](admin|accountant|beneficiary|waqif)['"]/);
  });

  it('AuthState لا يخزّن الدور في localStorage', () => {
    const src = readFileSync(join(ROOT, 'src/contexts/AuthContext.tsx'), 'utf8');
    expect(src).not.toMatch(/localStorage\.setItem\([^)]*role/i);
  });
});
