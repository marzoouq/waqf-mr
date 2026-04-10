import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

// vi.hoisted لحل مشكلة الرفع — المتغير يُنشأ قبل vi.mock
const mockNotify = vi.hoisted(() => ({
  error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ defaultNotify: mockNotify }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
      setSession: vi.fn(async () => ({ error: null })),
    },
  },
}));

vi.mock('@/lib/services/accessLogService', () => ({
  logAccessEvent: vi.fn(),
}));

vi.mock('@/utils/safeErrorMessage', () => ({
  getSafeErrorMessage: vi.fn(() => 'خطأ آمن'),
}));

vi.mock('./BiometricLoginButton', () => ({
  default: () => <div data-testid="biometric-btn" />,
}));

const defaultProps = {
  signIn: vi.fn(async () => ({ error: null })),
  loading: false,
  onResetPassword: vi.fn(),
};

const renderForm = (props = {}) => render(<LoginForm {...defaultProps} {...props} />);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── عرض المكوّن ───

  it('يعرض حقل البريد الإلكتروني افتراضياً', () => {
    renderForm();
    expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
  });

  it('يعرض حقل كلمة المرور', () => {
    renderForm();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
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
    expect(screen.getByText('طريقة تسجيل الدخول')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('يعرض مكوّن البصمة', () => {
    renderForm();
    expect(screen.getByTestId('biometric-btn')).toBeInTheDocument();
  });

  // ─── التبديل بين طرق الدخول ───

  it('يعرض حقل رقم الهوية عند اختيار طريقة الهوية', async () => {
    renderForm();
    await userEvent.click(screen.getByText('رقم الهوية'));
    expect(screen.getByPlaceholderText('1234567890')).toBeInTheDocument();
  });

  // ─── تحقق البريد الإلكتروني ───

  it('يظهر خطأ عند إرسال بريد فارغ', async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(screen.getByText('يرجى إدخال البريد الإلكتروني')).toBeInTheDocument();
    });
  });

  it('يظهر خطأ عند إرسال كلمة مرور فارغة مع بريد', async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'test@example.com');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(screen.getByText('يرجى إدخال كلمة المرور')).toBeInTheDocument();
    });
  });

  // ─── تسجيل دخول ناجح بالبريد ───

  it('يستدعي signIn عند إدخال بريد وكلمة مرور', async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    renderForm({ signIn });
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass123');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('user@test.com', 'pass123');
    });
  });

  // ─── تسجيل دخول فاشل بالبريد ───

  it('يظهر خطأ آمن عند فشل signIn', async () => {
    const signIn = vi.fn(async () => ({ error: new Error('bad') }));
    renderForm({ signIn });
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(mockNotify.error).toHaveBeenCalled();
    });
  });

  // ─── رقم الهوية: التحقق ───

  it('يظهر خطأ عند إرسال هوية فارغة', async () => {
    renderForm();
    await userEvent.click(screen.getByText('رقم الهوية'));
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(screen.getByText('يرجى إدخال رقم الهوية')).toBeInTheDocument();
    });
  });

  it('يظهر خطأ عند إدخال هوية أقل من 10 أرقام', async () => {
    renderForm();
    await userEvent.click(screen.getByText('رقم الهوية'));
    await userEvent.type(screen.getByPlaceholderText('1234567890'), '12345');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await waitFor(() => {
      expect(mockNotify.error).toHaveBeenCalledWith('رقم الهوية يجب أن يكون 10 أرقام');
    });
  });

  // ─── نسيت كلمة المرور ───

  it('يستدعي onResetPassword عند الضغط على الرابط', async () => {
    const onResetPassword = vi.fn();
    renderForm({ onResetPassword });
    await userEvent.click(screen.getByText('نسيت كلمة المرور؟'));
    expect(onResetPassword).toHaveBeenCalled();
  });

  // ─── حالة التعطيل — المكون يستخدم isLoading الداخلي من useLoginForm ───

  it('يعرض زر تسجيل الدخول بشكل صحيح', () => {
    renderForm();
    const btn = screen.getByRole('button', { name: 'تسجيل الدخول' });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('type')).toBe('submit');
  });
});
