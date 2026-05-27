/**
 * Smoke test: AnnualReportPage (لوحة الناظر)
 * يضمن أن الصفحة تربط ببيانات useAnnualReportPage وتُعرض دون أخطاء.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return {
    ...actual,
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@/hooks/page/admin/reports/useAnnualReportPage', () => ({
  useAnnualReportPage: vi.fn(() => ({
    fiscalYear: { id: 'fy1', label: '2024-2025' },
    isPublished: false,
    isLoading: false,
    activeTab: 'property_status',
    setActiveTab: vi.fn(),
    grouped: { property_status: [], achievement: [], challenge: [], future_plan: [] },
    propertiesList: [],
    summaryCards: [],
    editingItem: null,
    dialogOpen: false,
    deleteTarget: null,
    setEditingItem: vi.fn(),
    setDialogOpen: vi.fn(),
    setDeleteTarget: vi.fn(),
    handleReorder: vi.fn(),
    handleSubmit: vi.fn(),
    handleTogglePublish: vi.fn(),
    handleExportPdf: vi.fn(),
    handlePrint: vi.fn(),
    togglePublish: { isPending: false },
    createItem: { isPending: false },
    updateItem: { isPending: false },
    deleteItem: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/components/annual-report/IncomeComparisonChart', () => ({ default: () => null }));
vi.mock('@/components/annual-report/ReportSectionList', () => ({ default: () => null }));
vi.mock('@/components/annual-report/ReportItemFormDialog', () => ({ default: () => null }));
vi.mock('@/components/annual-report/PropertyStatusSection', () => ({ default: () => null }));

import AnnualReportPage from './AnnualReportPage';

describe('AnnualReportPage', () => {
  it('renders title and binds to useAnnualReportPage', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AnnualReportPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/التقرير السنوي/)).toBeInTheDocument();
    expect(screen.getByText('مسودة')).toBeInTheDocument();
  });
});
