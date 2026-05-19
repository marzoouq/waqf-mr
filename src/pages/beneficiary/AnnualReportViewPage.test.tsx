/**
 * Smoke test: AnnualReportViewPage (لوحة المستفيد)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/hooks/page/beneficiary', () => ({
  useAnnualReportViewPage: vi.fn(() => ({
    isLoading: false,
    isPublished: false,
    isMobile: false,
    viewTab: 'property_status',
    setViewTab: vi.fn(),
    grouped: { property_status: [], achievement: [], challenge: [], future_plan: [] },
    summaryCards: [],
    properties: [],
    fiscalYear: { id: 'fy1', label: '2024-2025' },
    handleExportPdf: vi.fn(),
    handleExportCsv: vi.fn(),
  })),
}));

vi.mock('@/hooks/ui/usePrint', () => ({ usePrint: vi.fn(() => vi.fn()) }));
vi.mock('@/components/annual-report/IncomeComparisonChart', () => ({ default: () => null }));
vi.mock('@/components/annual-report/ReportItemCard', () => ({ default: () => null }));
vi.mock('@/components/annual-report/PropertyStatusSection', () => ({ default: () => null }));

import AnnualReportViewPage from './AnnualReportViewPage';

describe('AnnualReportViewPage', () => {
  it('يعرض رسالة عدم النشر عندما isPublished=false', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AnnualReportViewPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('التقرير السنوي')).toBeInTheDocument();
    expect(screen.getByText(/لم يتم نشر التقرير السنوي/)).toBeInTheDocument();
  });
});
