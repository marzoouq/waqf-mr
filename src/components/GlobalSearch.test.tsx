import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// ResizeObserver polyfill
beforeAll(() => {
  (globalThis as Record<string, unknown>).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin', user: { id: '1' } }),
}));
vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({ fiscalYearId: 'fy-1' }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        or: () => ({
          limit: () => ({
            abortSignal: () => Promise.resolve({ data: [] }),
            eq: () => ({ abortSignal: () => Promise.resolve({ data: [] }) }),
          }),
        }),
        ilike: () => ({
          limit: () => ({
            abortSignal: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  },
}));

import GlobalSearch from './GlobalSearch';

describe('GlobalSearch', () => {
  it('يرندر حقل البحث مع placeholder', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText(/بحث/)).toBeInTheDocument();
  });

  it('يعرض زر مسح البحث عند وجود نص', async () => {
    const { container } = render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/بحث/);
    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    expect(container.querySelector('[aria-label="مسح البحث"]')).toBeInTheDocument();
  });

  it('لا يعرض النتائج عندما يكون الاستعلام أقل من حرفين', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/بحث/);
    import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'a' } });
    });
    // لا dropdown
    expect(screen.queryByText(/لا توجد نتائج/)).not.toBeInTheDocument();
  });

  it('يحتوي على container بشكل relative', () => {
    const { container } = render(<GlobalSearch />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('relative');
  });
});
