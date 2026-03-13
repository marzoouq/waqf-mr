import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPassword from './ResetPassword';

// متغيرات للتحكم في سلوك المحاكاة — مرفوعة لتعمل مع vi.mock
const { mockUpdateUser, mockNavigate, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));
let authChangeCallback: ((event: string) => void) | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      updateUser: mockUpdateUser,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** محاكاة وصول المستخدم عبر رابط الاسترداد */
function renderRecoveryPage() {
  const result = renderPage();
  // تشغيل حدث PASSWORD_RECOVERY داخل act لتحديث الحالة
  act(() => {
    if (authChangeCallback) authChangeCallback('PASSWORD_RECOVERY');
  });
  return result;
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
  });

  // ======= حالة الرابط غير الصالح =======
  describe('حالة الرابط غير الصالح', () => {
    it('يعرض حالة "رابط غير صالح" افتراضياً عندما لا يوجد حدث recovery', () => {
      renderPage();
      expect(screen.getAllByText(/رابط غير صالح/).length).toBeGreaterThan(0);
    });

    it('يعرض زر العودة لتسجيل الدخول', () => {
      renderPage();
      expect(screen.getAllByText(/العودة لتسجيل الدخول/).length).toBeGreaterThan(0);
    });

    it('زر العودة ينقل إلى صفحة المصادقة', () => {
      renderPage();
      const btn = screen.getByText(/العودة لتسجيل الدخول/);
      fireEvent.click(btn);
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  // ======= نموذج إعادة التعيين =======
  describe('نموذج إعادة التعيين', () => {
    it('يعرض نموذج إعادة التعيين بعد حدث PASSWORD_RECOVERY', () => {
      renderRecoveryPage();
      expect(screen.getAllByText(/إعادة تعيين كلمة المرور/).length).toBeGreaterThan(0);
      expect(screen.getByLabelText(/كلمة المرور الجديدة/)).not.toBeNull();
      expect(screen.getByLabelText(/تأكيد كلمة المرور/)).not.toBeNull();
    });

    it('يعرض خطأ عند إرسال كلمة مرور أقل من 8 أحرف', async () => {
      renderRecoveryPage();
      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: '123' } });
      fireEvent.change(confirmInput, { target: { value: '123' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('يعرض خطأ عند عدم تطابق كلمتي المرور', async () => {
      renderRecoveryPage();
      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different123' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('كلمتا المرور غير متطابقتين');
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('يستدعي updateUser عند إرسال كلمة مرور صحيحة ومتطابقة', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      renderRecoveryPage();

      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'StrongPass123!' });
      });
    });

    it('يعرض رسالة نجاح بعد تغيير كلمة المرور بنجاح', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      renderRecoveryPage();

      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('تم تغيير كلمة المرور بنجاح');
        expect(screen.getAllByText(/تم التغيير بنجاح/).length).toBeGreaterThan(0);
      });
    });

    it('يعرض رسالة خطأ عند فشل updateUser', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Token expired' } });
      renderRecoveryPage();

      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      // لا يجب أن يظهر شاشة النجاح
      expect(screen.queryByText(/تم التغيير بنجاح/)).toBeNull();
    });
  });

  // ======= حالة النجاح =======
  describe('حالة النجاح', () => {
    it('زر العودة في شاشة النجاح ينقل إلى صفحة المصادقة', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      renderRecoveryPage();

      const passInput = screen.getByLabelText(/كلمة المرور الجديدة/);
      const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور/);

      fireEvent.change(passInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } });
      fireEvent.submit(passInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getAllByText(/العودة لتسجيل الدخول/).length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByText(/العودة لتسجيل الدخول/));
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  // ======= حالة كلمة مرور فارغة =======
  it('يعرض خطأ عند إرسال النموذج بدون كلمة مرور', async () => {
    renderRecoveryPage();
    const form = screen.getByLabelText(/كلمة المرور الجديدة/).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    });
  });
});
