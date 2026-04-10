import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FiscalYearProvider, useFiscalYear } from './FiscalYearContext';

const mockFiscalYears = [
  { id: 'a0000000-0000-0000-0000-000000000001', label: '1446-1447', start_date: '2024-10-01', end_date: '2025-10-01', status: 'active', published: true, created_at: '' },
  { id: 'b0000000-0000-0000-0000-000000000002', label: '1445-1446', start_date: '2023-10-01', end_date: '2024-10-01', status: 'closed', published: true, created_at: '' },
];

vi.mock('@/hooks/financial/useFiscalYears', () => ({
  useActiveFiscalYear: () => ({
    data: mockFiscalYears[0],
    fiscalYears: mockFiscalYears,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => ({ role: 'admin', user: { id: 'u1' }, loading: false }),
}));

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const TestConsumer = () => {
  const ctx = useFiscalYear();
  return (
    <div>
      <span data-testid="fy-id">{ctx.fiscalYearId}</span>
      <span data-testid="is-closed">{String(ctx.isClosed)}</span>
      <span data-testid="no-published">{String(ctx.noPublishedYears)}</span>
      <span data-testid="count">{ctx.fiscalYears.length}</span>
    </div>
  );
};

const renderWithQC = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={qc()}>{ui}</QueryClientProvider>);

describe('FiscalYearContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides fiscal year data to children', () => {
    renderWithQC(<FiscalYearProvider><TestConsumer /></FiscalYearProvider>);
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('defaults to active fiscal year for admin when no selection', () => {
    renderWithQC(<FiscalYearProvider><TestConsumer /></FiscalYearProvider>);
    expect(screen.getByTestId('fy-id').textContent).toBe('a0000000-0000-0000-0000-000000000001');
  });

  it('persists selected fiscal year in localStorage', () => {
    localStorage.setItem('waqf_selected_fiscal_year', 'b0000000-0000-0000-0000-000000000002');
    renderWithQC(<FiscalYearProvider><TestConsumer /></FiscalYearProvider>);
    expect(screen.getByTestId('fy-id').textContent).toBe('b0000000-0000-0000-0000-000000000002');
    expect(screen.getByTestId('is-closed').textContent).toBe('true');
  });

  it('returns fallback when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Outer = () => {
      const ctx = useFiscalYear();
      return <span data-testid="fallback-loading">{String(ctx.isLoading)}</span>;
    };
    renderWithQC(<Outer />);
    expect(screen.getByTestId('fallback-loading').textContent).toBe('true');
    consoleSpy.mockRestore();
  });

  it('shows noPublishedYears as false for admin', () => {
    renderWithQC(<FiscalYearProvider><TestConsumer /></FiscalYearProvider>);
    expect(screen.getByTestId('no-published').textContent).toBe('false');
  });
});
