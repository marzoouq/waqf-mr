import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SignupForm from './SignupForm';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('SignupForm', () => {
  const mockSignUp = vi.fn().mockResolvedValue({ error: null });

  it('يرندر بنجاح', () => {
    const { container } = render(<SignupForm signUp={mockSignUp} />);
    expect(container).not.toBeNull();
  });

  it('يعرض حقول البريد وكلمة المرور', () => {
    render(<SignupForm signUp={mockSignUp} />);
    expect(screen.getByPlaceholderText('example@email.com')).not.toBeNull();
    expect(screen.getByPlaceholderText('••••••••')).not.toBeNull();
  });

  it('يعرض زر الإرسال', () => {
    render(<SignupForm signUp={mockSignUp} />);
    const btn = screen.getByRole('button', { name: /إنشاء حساب|تسجيل/ });
    expect(btn).not.toBeNull();
  });

  it('يمنع الإرسال بدون بيانات', async () => {
    render(<SignupForm signUp={mockSignUp} />);
    const btn = screen.getByRole('button', { name: /إنشاء حساب|تسجيل/ });
    fireEvent.submit(btn.closest('form')!);
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
