/**
 * Smoke test: HistoricalComparisonPage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/hooks/page/admin/reports/useHistoricalComparison', () => ({
  useHistoricalComparison: vi.fn(() => ({
    fiscalYears: [],
    fyLoading: false,
    selectedIds: [],
    selectedYears: [],
    yearData: {},
    isAnyLoading: false,
    toggleYear: vi.fn(),
    chartData: [],
    comparisonRows: [],
    handleExportPdf: vi.fn(),
  })),
}));

vi.mock('@/components/reports/HistoricalComparisonChartInner', () => ({ default: () => null }));
vi.mock('@/components/reports/ChangeIndicator', () => ({ ChangeIndicator: () => null }));

import HistoricalComparisonPage from './HistoricalComparisonPage';

describe('HistoricalComparisonPage', () => {
  it('renders title and binds to useHistoricalComparison', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><HistoricalComparisonPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('المقارنة التاريخية')).toBeInTheDocument();
  });
});
