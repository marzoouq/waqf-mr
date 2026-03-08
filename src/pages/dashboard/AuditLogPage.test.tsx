import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

const today = new Date().toISOString();
const mockLogs = [
  { id: 'log1', table_name: 'income', operation: 'INSERT', created_at: today, record_id: 'r1', user_id: 'u1', old_data: null, new_data: { amount: 5000, source: 'إيجار' } },
  { id: 'log2', table_name: 'expenses', operation: 'UPDATE', created_at: '2024-01-15T10:00:00Z', record_id: 'r2', user_id: 'u1', old_data: { amount: 1000 }, new_data: { amount: 1500 } },
  { id: 'log3', table_name: 'accounts', operation: 'DELETE', created_at: '2024-01-10T08:00:00Z', record_id: 'r3', user_id: 'u1', old_data: { total_income: 50000 }, new_data: null },
];

vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: vi.fn(() => ({ data: mockLogs, isLoading: false })),
  getTableNameAr: (t: string) => {
    const map: Record<string, string> = { income: 'الدخل', expenses: 'المصروفات', accounts: 'الحسابات' };
    return map[t] || t;
  },
  getOperationNameAr: (op: string) => {
    const map: Record<string, string> = { INSERT: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف' };
    return map[op] || op;
  },
}));

import AuditLogPage from './AuditLogPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><AuditLogPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AuditLogPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument();
  });

  it('shows total operations count', () => {
    renderPage();
    expect(screen.getByText('إجمالي العمليات')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows today operations stat', () => {
    renderPage();
    expect(screen.getByText('عمليات اليوم')).toBeInTheDocument();
  });

  it('renders filter dropdowns', () => {
    renderPage();
    expect(screen.getByPlaceholderText('بحث...')).toBeInTheDocument();
  });

  it('shows operation badges', () => {
    renderPage();
    expect(screen.getAllByText('إضافة').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('تعديل').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('حذف').length).toBeGreaterThanOrEqual(1);
  });

  it('shows table names in Arabic', () => {
    renderPage();
    expect(screen.getAllByText('الدخل').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('المصروفات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الحسابات').length).toBeGreaterThanOrEqual(1);
  });

  it('shows summary text for each log entry', () => {
    renderPage();
    expect(screen.getAllByText(/إضافة سجل جديد في الدخل/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/تعديل سجل في المصروفات/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/حذف سجل من الحسابات/).length).toBeGreaterThanOrEqual(1);
  });
});
