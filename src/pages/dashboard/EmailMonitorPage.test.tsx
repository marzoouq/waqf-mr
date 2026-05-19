/**
 * Smoke test: EmailMonitorPage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/hooks/page/admin/management/useEmailMonitorPage', () => ({
  useEmailMonitorPage: vi.fn(() => ({
    isLoading: false,
    adminStats: { last_log_at: null, rate_limited_until: null, queued: 0, sent: 0, failed: 0, blocked: 0, dlq: 0 },
    logs: [],
    filters: { status: 'all', q: '' },
    setFilters: vi.fn(),
    refresh: vi.fn(),
    retryDlq: vi.fn(),
    retryPending: false,
  })),
}));

vi.mock('@/components/admin/email-monitor/EmailMonitorPrimitives', () => ({
  EmailStatCard: () => null,
  formatEmailDateTime: (v: string) => v,
}));
vi.mock('@/components/admin/email-monitor/EmailDlqRetryCard', () => ({ EmailDlqRetryCard: () => null }));
vi.mock('@/components/admin/email-monitor/EmailFiltersCard', () => ({ EmailFiltersCard: () => null }));
vi.mock('@/components/admin/email-monitor/EmailLogsTable', () => ({ EmailLogsTable: () => null }));

import EmailMonitorPage from './EmailMonitorPage';

describe('EmailMonitorPage', () => {
  it('renders title and binds to useEmailMonitorPage', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><EmailMonitorPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('مراقبة نظام البريد الإلكتروني')).toBeInTheDocument();
  });
});
