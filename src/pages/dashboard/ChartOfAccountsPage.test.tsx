/**
 * Smoke test: ChartOfAccountsPage
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/hooks/page/admin/management/useChartOfAccountsPage', () => ({
  useChartOfAccountsPage: vi.fn(() => ({
    isLoading: false,
    searchTerm: '', setSearchTerm: vi.fn(),
    dialogOpen: false, setDialogOpen: vi.fn(),
    deleteDialogOpen: false, setDeleteDialogOpen: vi.fn(),
    editingCategory: null, deletingCategory: null,
    form: { code: '', name: '', type: 'income', parent_id: null, is_active: true },
    setForm: vi.fn(),
    stats: { total: 0, income: 0, expense: 0, active: 0, inactive: 0 },
    filteredTree: [],
    parentCandidates: [],
    openCreateDialog: vi.fn(), openEditDialog: vi.fn(),
    handleSave: vi.fn(), handleDelete: vi.fn(), handleToggle: vi.fn(), confirmDelete: vi.fn(),
    createPending: false, updatePending: false,
  })),
}));

vi.mock('@/components/accounts/CategoryTreeView', () => ({ TreeBranch: () => null }));

import ChartOfAccountsPage from './ChartOfAccountsPage';

describe('ChartOfAccountsPage', () => {
  it('renders title and binds to useChartOfAccountsPage', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><ChartOfAccountsPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('الشجرة المحاسبية')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الحسابات')).toBeInTheDocument();
  });
});
