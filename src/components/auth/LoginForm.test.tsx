import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

// Mocks
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
      setSession: vi.fn(async () => ({ error: null })),
    },
  },
}));

vi.mock('@/hooks/useAccessLog', () => ({
  logAccessEvent: vi.fn(),
}));

vi.mock('@/utils/safeErrorMessage', () => ({
  getSafeErrorMessage: vi.fn(() => 'خطأ آمن'),
}));

vi.mock('./BiometricLoginButton', () => ({
  default: () => <div data-testid="biometric-btn" />,
}));

import { toast } from 'sonner';

const defaultProps = {
  signIn: vi.fn(async () => ({ error: null })),
  loading: false,
  onResetPassword: vi.fn(),
};

const renderForm = (props = {}) => render(<LoginForm {...defaultProps} {...props} />);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // matchMedia و ResizeObserver
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false, media: '', onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  });

  // ─── عرض المكوّن ───

  it('يعرض حقل البريد الإلكتروني افتراضياً', () => {
    renderForm();
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
  });

  it('يعرض حقل كلمة المرور', () => {
    renderForm();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
  });

  it('يعرض زر تسجيل الدخول', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  });

  it('يعرض رابط نسيت كلمة المرور', () => {
    renderForm();
    expect(screen.getByText('نسيت كلمة المرور؟')).toBeInTheDocument();
  });

  it('يعرض خيارات طريقة الدخول (بريد / هوية)', () => {
    renderForm();
    expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByText('رقم الهوية')).toBeInTheDocument();
  });

  it('يعرض مكوّن البصمة', () => {
    renderForm();
    expect(screen.getByTestId('biometric-btn')).toBeInTheDocument();
  });

  // ─── التبديل بين طرق الدخول ───

  it('يعرض حقل رقم الهوية عند اختيار طريقة الهوية', async () => {
    renderForm();
    const idLabel = screen.getByText('رقم الهوية');
    await userEvent.click(idLabel);
    expect(screen.getByLabelText('رقم الهوية الوطنية')).toBeInTheDocument();
  });

  // ─── تحقق البريد الإلكتروني ───

  it('يظهر خطأ عند إرسال بريد فارغ', async () => {
    renderForm();
    const passwordInput = screen.getByLabelText('كلمة المرور');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('يرجى إدخال البريد الإلكتروني');
    });
  });

  it('يظهر خطأ عند إرسال كلمة مرور فارغة مع بريد', async () => {
    renderForm();
    const emailInput = screen.getByLabelText('البريد الإلكتروني');
    await userEvent.type(emailInput, 'test@example.com');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('يرجى إدخال كلمة المرور');
    });
  });

  // ─── تسجيل دخول ناجح بالبريد ───

  it('يستدعي signIn عند إدخال بريد وكلمة مرور', async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    renderForm({ signIn });
    await userEvent.type(screen.getByLabelText('البريد الإلكتروني'), 'user@test.com');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'pass123');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('user@test.com', 'pass123');
      expect(toast.success).toHaveBeenCalledWith('تم تسجيل الدخول بنجاح');
    });
  });

  // ─── تسجيل دخول فاشل بالبريد ───

  it('يظهر خطأ آمن عند فشل signIn', async () => {
    const signIn = vi.fn(async () => ({ error: new Error('bad') }));
    renderForm({ signIn });
    await userEvent.type(screen.getByLabelText('البريد الإلكتروني'), 'user@test.com');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'wrong');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('خطأ آمن');
    });
  });

  // ─── رقم الهوية: التحقق ───

  it('يظهر خطأ عند إرسال هوية فارغة', async () => {
    renderForm();
    await userEvent.click(screen.getByText('رقم الهوية'));
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('يرجى إدخال رقم الهوية الوطنية');
    });
  });

  it('يظهر خطأ عند إدخال هوية أقل من 10 أرقام', async () => {
    renderForm();
    await userEvent.click(screen.getByText('رقم الهوية'));
    await userEvent.type(screen.getByLabelText('رقم الهوية الوطنية'), '12345');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('رقم الهوية يجب أن يكون 10 أرقام');
    });
  });

  // ─── نسيت كلمة المرور ───

  it('يستدعي onResetPassword عند الضغط على الرابط', async () => {
    const onResetPassword = vi.fn();
    renderForm({ onResetPassword });
    await userEvent.click(screen.getByText('نسيت كلمة المرور؟'));
    expect(onResetPassword).toHaveBeenCalled();
  });

  // ─── حالة التعطيل ───

  it('يعطّل الزر أثناء التحميل', () => {
    renderForm({ loading: true });
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeDisabled();
  });
});
