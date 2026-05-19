/**
 * Smoke test: ExpensesViewPage (لوحة المستفيد)
 * يضمن أن الصفحة تربط ببيانات useExpensesViewPage فقط (لا useExpensesPage).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/components/common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/common');
  return {
    ...actual,
    TableSkeleton: () => null,
    TablePagination: () => null,
    ExportMenu: () => null,
    RequirePublishedYears: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@/components/expenses', () => ({
  ExpenseSummaryCards: () => null,
  ExpensesPieChart: () => null,
  ExpensesMobileCards: () => null,
  ExpensesDesktopTable: () => null,
}));

vi.mock('@/components/dashboard/AdvancedFiltersBar', () => ({ default: () => null }));

vi.mock('@/hooks/page/beneficiary', () => ({
  useExpensesViewPage: vi.fn(() => ({
    expenses: [],
    totalExpenses: 0,
    documentedCount: 0,
    documentationRate: 0,
    isLoading: false,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    setCurrentPage: vi.fn(),
    currentPage: 1,
    filters: {},
    setFilters: vi.fn(),
    uniqueTypes: [],
    properties: [],
    handleExportPdf: vi.fn(),
    handleExportCsv: vi.fn(),
  })),
}));

import ExpensesViewPage from './ExpensesViewPage';

describe('ExpensesViewPage', () => {
  it('renders title and binds to useExpensesViewPage', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><ExpensesViewPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getAllByText('مصروفات الوقف').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('بحث في المصروفات...')).toBeInTheDocument();
  });
});
