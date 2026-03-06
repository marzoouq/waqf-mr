import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null }),
        eq: () => ({ order: () => ({ data: [], error: null }) }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: '1', email: 'admin@test.com' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    functions: { invoke: vi.fn() },
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com' },
    role: 'admin',
    loading: false,
  }),
}));

// Mock fiscal year context
vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({
    fiscalYear: { id: '1', label: '2025-2026', status: 'active' },
    fiscalYearId: '1',
    isLoading: false,
  }),
  FiscalYearProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ZatcaManagementPage', () => {
  it('renders without crashing (smoke test)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    // Dynamic import to avoid hoisting issues
    const { default: ZatcaManagementPage } = await import('./ZatcaManagementPage');
    
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ZatcaManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check for tab triggers
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
    expect(screen.getByText('الشهادات')).toBeInTheDocument();
    expect(screen.getByText('سلسلة التوقيع')).toBeInTheDocument();
  });
});
