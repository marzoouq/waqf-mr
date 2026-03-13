import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CarryforwardHistoryPage from './CarryforwardHistoryPage';

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: 'beneficiary', loading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'b1', name: 'مستفيد', share_percentage: 25 } }),
          order: () => Promise.resolve({ data: [] }),
        }),
        order: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useAdvanceRequests', () => ({
  useMyCarryforwards: () => ({ data: [], isLoading: false }),
  useMyAdvanceRequests: () => ({ data: [], isLoading: false }),
  useCarryforwardBalance: () => ({ data: 0 }),
}));

vi.mock('@/components/SkeletonLoaders', () => ({
  DashboardSkeleton: () => <div>loading</div>,
}));

vi.mock('@/components/PageHeaderCard', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/ExportMenu', () => ({
  default: () => <div>export</div>,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CarryforwardHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CarryforwardHistoryPage', () => {
  it('يرندر بنجاح', () => {
    const { container } = renderPage();
    expect(container).not.toBeNull();
  });

  it('يعرض layout', () => {
    const { getByTestId } = renderPage();
    expect(getByTestId('layout')).not.toBeNull();
  });
});
