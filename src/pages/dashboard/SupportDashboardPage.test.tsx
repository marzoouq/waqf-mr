import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupportDashboardPage from './SupportDashboardPage';

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: 'admin', loading: false }),
}));

vi.mock('@/hooks/useSupportTickets', () => ({
  useSupportTickets: () => ({ data: { tickets: [] }, isLoading: false }),
  useTicketReplies: () => ({ data: [], isLoading: false }),
  useCreateTicket: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTicketStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddTicketReply: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useClientErrors: () => ({ data: [], isLoading: false }),
  useSupportStats: () => ({ data: { openTickets: 0, inProgressTickets: 0, resolvedTickets: 0, errorsLast24h: 0 } }),
}));

vi.mock('@/components/PageHeaderCard', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SupportDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SupportDashboardPage', () => {
  it('يرندر بنجاح', () => {
    const { container } = renderPage();
    expect(container).not.toBeNull();
  });

  it('يعرض العنوان داخل layout', () => {
    const { getByTestId } = renderPage();
    expect(getByTestId('layout')).not.toBeNull();
  });
});
