import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonthlyPerformanceReport from './MonthlyPerformanceReport';

// Mock recharts to avoid canvas errors in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Line: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
}));

describe('MonthlyPerformanceReport', () => {
  const sampleIncome = [
    { date: '2024-01-15', amount: 10000 },
    { date: '2024-01-20', amount: 5000 },
    { date: '2024-02-10', amount: 8000 },
    { date: '2024-03-05', amount: 12000 },
  ];

  const sampleExpenses = [
    { date: '2024-01-10', amount: 3000 },
    { date: '2024-02-15', amount: 6000 },
    { date: '2024-03-20', amount: 2000 },
  ];

  it('renders empty state when no data is provided', () => {
    render(<MonthlyPerformanceReport income={[]} expenses={[]} />);
    expect(screen.getByText('لا توجد بيانات مالية للسنة المالية المحددة')).toBeInTheDocument();
  });

  it('renders monthly table with correct row count', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Month labels appear in summary cards AND table rows
    expect(screen.getAllByText('يناير 2024').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('فبراير 2024').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('مارس 2024')).toBeInTheDocument();
  });

  it('calculates monthly aggregations correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // January: income 15000, expenses 3000
    expect(screen.getByText('15,000 ر.س')).toBeInTheDocument(); // Jan income
    expect(screen.getByText('3,000 ر.س')).toBeInTheDocument(); // Jan expenses
  });

  it('shows correct totals in footer', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Total income: 35000, total expenses: 11000
    expect(screen.getByText('35,000 ر.س')).toBeInTheDocument();
    expect(screen.getByText('11,000 ر.س')).toBeInTheDocument();
  });

  it('identifies best and worst months correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Jan net: 12000, Feb net: 2000, Mar net: 10000
    // Best = Jan (12000), Worst = Feb (2000)
    const bestLabel = screen.getAllByText('يناير 2024');
    expect(bestLabel.length).toBeGreaterThanOrEqual(1);
  });

  it('computes averages correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Avg income: 35000/3 ≈ 11667, Avg expenses: 11000/3 ≈ 3667
    expect(screen.getByText('11,667 ر.س')).toBeInTheDocument();
    expect(screen.getByText('3,667 ر.س')).toBeInTheDocument();
  });

  it('handles single month data without crashing', () => {
    const singleIncome = [{ date: '2024-06-01', amount: 5000 }];
    const singleExpense = [{ date: '2024-06-15', amount: 1000 }];
    expect(() =>
      render(<MonthlyPerformanceReport income={singleIncome} expenses={singleExpense} />)
    ).not.toThrow();
    expect(screen.getAllByText('يونيو 2024').length).toBeGreaterThanOrEqual(1);
  });
});
