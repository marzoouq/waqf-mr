import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsDistributionTable from './AccountsDistributionTable';

const defaultProps = {
  waqfCorpusPrevious: 0,
  totalIncome: 100000,
  grandTotal: 100000,
  totalExpenses: 20000,
  netAfterExpenses: 80000,
  manualVat: 5000,
  netAfterVat: 75000,
  zakatAmount: 1875,
  netAfterZakat: 73125,
  adminPercent: 10,
  adminShare: 7312,
  waqifPercent: 5,
  waqifShare: 3656,
  waqfRevenue: 62157,
  waqfCorpusManual: 10000,
  availableAmount: 52157,
  manualDistributions: 40000,
  remainingBalance: 12157,
};

describe('AccountsDistributionTable', () => {
  it('renders title', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText('التوزيع والحصص')).toBeInTheDocument();
  });

  it('shows income row', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument();
  });

  it('shows expenses row', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText(/المصروفات التشغيلية/)).toBeInTheDocument();
  });

  it('shows admin share with percentage', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText(/حصة الناظر/)).toBeInTheDocument();
  });

  it('shows waqif share with percentage', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText(/حصة الواقف/)).toBeInTheDocument();
  });

  it('shows remaining balance', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getByText('الرصيد المتبقي')).toBeInTheDocument();
  });

  it('hides previous corpus row when zero', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.queryByText('رقبة الوقف المرحلة من العام السابق')).not.toBeInTheDocument();
  });

  it('shows previous corpus row when > 0', () => {
    render(<AccountsDistributionTable {...defaultProps} waqfCorpusPrevious={5000} grandTotal={105000} />);
    expect(screen.getByText('رقبة الوقف المرحلة من العام السابق')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي الشامل')).toBeInTheDocument();
  });

  it('applies destructive color for negative balance', () => {
    const { container } = render(<AccountsDistributionTable {...defaultProps} remainingBalance={-500} />);
    const balanceCell = container.querySelector('.text-destructive.text-lg');
    expect(balanceCell).toBeInTheDocument();
  });
});
