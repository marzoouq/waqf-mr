import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BeneficiarySupportPage from './SupportPage';

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/hooks/useSupportTickets', () => ({
  useSupportTickets: () => ({ data: { tickets: [] }, isLoading: false }),
  useTicketReplies: () => ({ data: [], isLoading: false }),
  useCreateTicket: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddTicketReply: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRateTicket: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/PageHeaderCard', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BeneficiarySupportPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BeneficiarySupportPage', () => {
  it('يرندر بنجاح', () => {
    const { container } = renderPage();
    expect(container).not.toBeNull();
  });

  it('يعرض layout', () => {
    const { getByTestId } = renderPage();
    expect(getByTestId('layout')).not.toBeNull();
  });

  it('يعرض حالة فارغة', () => {
    renderPage();
    expect(screen.getAllByText(/لا توجد تذاكر/).length).toBeGreaterThan(0);
  });
});
