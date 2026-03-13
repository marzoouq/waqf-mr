import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsSummaryCards from './AccountsSummaryCards';

const defaultProps = {
  waqfCorpusPrevious: 10000,
  totalIncome: 120000,
  grandTotal: 130000,
  totalExpenses: 30000,
  netAfterExpenses: 100000,
  manualVat: 5000,
  netAfterVat: 95000,
  zakatAmount: 2000,
  adminPercent: 10,
  adminShare: 8800,
  waqifPercent: 5,
  waqifShare: 4400,
  waqfRevenue: 79800,
  waqfCorpusManual: 3000,
  manualDistributions: 8000,
  remainingBalance: 68800,
};

describe('AccountsSummaryCards', () => {
  it('renders the summary title', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText('ملخص الحسابات الحالية')).toBeInTheDocument();
  });

  it('displays all financial values', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText('120,000')).toBeInTheDocument();
    expect(screen.getByText('30,000')).toBeInTheDocument();
    expect(screen.getByText('100,000')).toBeInTheDocument();
    expect(screen.getByText('95,000')).toBeInTheDocument();
  });

  it('shows admin and waqif percentages', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText('حصة الناظر (10%)')).toBeInTheDocument();
    expect(screen.getByText('حصة الواقف (5%)')).toBeInTheDocument();
  });

  it('hides waqf corpus previous when zero', () => {
    render(<AccountsSummaryCards {...defaultProps} waqfCorpusPrevious={0} />);
    expect(screen.queryByText('رقبة وقف مرحلة')).not.toBeInTheDocument();
    expect(screen.queryByText('الإجمالي الشامل')).not.toBeInTheDocument();
  });

  it('shows waqf corpus previous when > 0', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText('رقبة وقف مرحلة')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
  });

  it('displays remaining balance', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText('الرصيد المتبقي')).toBeInTheDocument();
    expect(screen.getByText('68,800')).toBeInTheDocument();
  });

  it('يعرض تنبيه أرقام تقديرية عندما isClosed=false', () => {
    render(<AccountsSummaryCards {...defaultProps} />);
    expect(screen.getByText(/أرقام تقديرية/)).toBeInTheDocument();
  });

  it('يخفي تنبيه أرقام تقديرية عندما isClosed=true', () => {
    render(<AccountsSummaryCards {...defaultProps} isClosed={true} />);
    expect(screen.queryByText(/أرقام تقديرية/)).not.toBeInTheDocument();
  });

  it('يعرض تنبيه النسب الافتراضية عند usingFallbackPct=true', () => {
    render(<AccountsSummaryCards {...defaultProps} usingFallbackPct={true} />);
    expect(screen.getByText(/النسب الافتراضية/)).toBeInTheDocument();
  });
});
