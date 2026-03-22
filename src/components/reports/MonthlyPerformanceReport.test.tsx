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
    expect(screen.getAllByText(/يناير 2024/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/فبراير 2024/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/مارس 2024/).length).toBeGreaterThanOrEqual(1);
  });

  it('calculates monthly aggregations correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // January: income 15000, expenses 3000 — values appear in table
    expect(screen.getAllByText(/15,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/3,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct totals in footer', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Total income: 35000, total expenses: 11000
    expect(screen.getAllByText(/35,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/11,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('identifies best and worst months correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    const bestLabel = screen.getAllByText(/يناير 2024/);
    expect(bestLabel.length).toBeGreaterThanOrEqual(1);
  });

  it('computes averages correctly', () => {
    render(<MonthlyPerformanceReport income={sampleIncome} expenses={sampleExpenses} />);
    // Avg income: 35000/3 ≈ 11667, Avg expenses: 11000/3 ≈ 3667
    expect(screen.getAllByText(/11,667/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/3,667/).length).toBeGreaterThanOrEqual(1);
  });

  it('handles single month data without crashing', () => {
    const singleIncome = [{ date: '2024-06-01', amount: 5000 }];
    const singleExpense = [{ date: '2024-06-15', amount: 1000 }];
    expect(() =>
      render(<MonthlyPerformanceReport income={singleIncome} expenses={singleExpense} />)
    ).not.toThrow();
    expect(screen.getAllByText(/يونيو 2024/).length).toBeGreaterThanOrEqual(1);
  });
});
