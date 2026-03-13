import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPassword from './ResetPassword';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      updateUser: vi.fn(),
    },
  },
}));

// Mock sonner
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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

describe('ResetPassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('يرندر بنجاح', () => {
    const { container } = renderPage();
    expect(container).not.toBeNull();
  });

  it('يعرض حالة "رابط غير صالح" افتراضياً', () => {
    renderPage();
    expect(screen.getAllByText(/رابط غير صالح/).length).toBeGreaterThan(0);
  });

  it('يعرض زر العودة لتسجيل الدخول', () => {
    renderPage();
    expect(screen.getAllByText(/العودة لتسجيل الدخول/).length).toBeGreaterThan(0);
  });
});
