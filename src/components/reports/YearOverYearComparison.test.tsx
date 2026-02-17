import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import YearOverYearComparison from './YearOverYearComparison';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

// Mock useFinancialSummary
vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: () => ({
    income: [],
    expenses: [],
    totalIncome: 0,
    totalExpenses: 0,
    expensesByType: {},
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('YearOverYearComparison', () => {
  it('shows empty state when less than 2 fiscal years', () => {
    render(
      <YearOverYearComparison
        fiscalYears={[{ id: '1', label: '1446', start_date: '', end_date: '', status: 'active', created_at: '' }]}
        currentFiscalYearId="1"
      />,
      { wrapper }
    );
    expect(screen.getByText('يجب وجود سنتين ماليتين على الأقل لإجراء المقارنة')).toBeInTheDocument();
  });

  it('renders year selectors when 2+ fiscal years exist', () => {
    render(
      <YearOverYearComparison
        fiscalYears={[
          { id: '1', label: '1446', start_date: '', end_date: '', status: 'active', created_at: '' },
          { id: '2', label: '1447', start_date: '', end_date: '', status: 'closed', created_at: '' },
        ]}
        currentFiscalYearId="1"
      />,
      { wrapper }
    );
    expect(screen.getByText('السنة الأولى:')).toBeInTheDocument();
    expect(screen.getByText('السنة الثانية:')).toBeInTheDocument();
  });

  it('renders change summary cards', () => {
    render(
      <YearOverYearComparison
        fiscalYears={[
          { id: '1', label: '1446', start_date: '', end_date: '', status: 'active', created_at: '' },
          { id: '2', label: '1447', start_date: '', end_date: '', status: 'closed', created_at: '' },
        ]}
        currentFiscalYearId="1"
      />,
      { wrapper }
    );
    expect(screen.getByText('التغير في الدخل')).toBeInTheDocument();
    expect(screen.getByText('التغير في المصروفات')).toBeInTheDocument();
    expect(screen.getByText('التغير في الصافي')).toBeInTheDocument();
  });

  it('renders chart titles', () => {
    render(
      <YearOverYearComparison
        fiscalYears={[
          { id: '1', label: '1446', start_date: '', end_date: '', status: 'active', created_at: '' },
          { id: '2', label: '1447', start_date: '', end_date: '', status: 'closed', created_at: '' },
        ]}
        currentFiscalYearId="1"
      />,
      { wrapper }
    );
    expect(screen.getByText('مقارنة الدخل الشهري')).toBeInTheDocument();
    expect(screen.getByText('جدول المقارنة التفصيلي')).toBeInTheDocument();
  });
});
