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
    expect(screen.getAllByText('إجمالي الدخل').length).toBeGreaterThanOrEqual(1);
  });

  it('shows expenses row', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getAllByText(/المصروفات التشغيلية/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows admin share with percentage', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getAllByText('10%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/حصة الناظر/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows waqif share with percentage', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getAllByText('5%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/حصة الواقف/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows remaining balance', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.getAllByText('الرصيد المتبقي').length).toBeGreaterThanOrEqual(1);
  });

  it('hides previous corpus row when zero', () => {
    render(<AccountsDistributionTable {...defaultProps} />);
    expect(screen.queryByText('رقبة الوقف المرحلة من العام السابق')).not.toBeInTheDocument();
  });

  it('shows previous corpus row when > 0', () => {
    render(<AccountsDistributionTable {...defaultProps} waqfCorpusPrevious={5000} grandTotal={105000} />);
    expect(screen.getAllByText('رقبة الوقف المرحلة من العام السابق').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الإجمالي الشامل').length).toBeGreaterThanOrEqual(1);
  });

  it('applies destructive color for negative balance', () => {
    const { container } = render(<AccountsDistributionTable {...defaultProps} remainingBalance={-500} />);
    const balanceCell = container.querySelector('.text-destructive.text-lg');
    expect(balanceCell).toBeInTheDocument();
  });
});
