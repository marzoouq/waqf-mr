import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResetPasswordForm from './ResetPasswordForm';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) } },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ResetPasswordForm', () => {
  const mockBack = vi.fn();

  it('يرندر بنجاح', () => {
    const { container } = render(<ResetPasswordForm onBack={mockBack} />);
    expect(container).not.toBeNull();
  });

  it('يعرض حقل البريد الإلكتروني', () => {
    render(<ResetPasswordForm onBack={mockBack} />);
    expect(screen.getByPlaceholderText('example@email.com')).not.toBeNull();
  });

  it('يعرض زر العودة', () => {
    render(<ResetPasswordForm onBack={mockBack} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
