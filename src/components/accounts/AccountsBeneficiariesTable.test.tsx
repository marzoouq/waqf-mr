import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsBeneficiariesTable from './AccountsBeneficiariesTable';

const makeBeneficiaries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `b${i}`,
    name: `مستفيد ${i + 1}`,
    share_percentage: 10 + i,
  }));

describe('AccountsBeneficiariesTable', () => {
  it('renders empty state when no beneficiaries', () => {
    render(
      <AccountsBeneficiariesTable
        beneficiaries={[]}
        manualDistributions={5000}
        totalBeneficiaryPercentage={0}
      />,
    );
    expect(screen.getByText('لا يوجد مستفيدون مسجلون')).toBeInTheDocument();
  });

  it('renders beneficiary rows with correct share amounts', () => {
    const beneficiaries = [
      { id: 'b1', name: 'أحمد', share_percentage: 60 },
      { id: 'b2', name: 'محمد', share_percentage: 40 },
    ];
    render(
      <AccountsBeneficiariesTable
        beneficiaries={beneficiaries}
        manualDistributions={10000}
        totalBeneficiaryPercentage={100}
      />,
    );
    expect(screen.getByText('أحمد')).toBeInTheDocument();
    expect(screen.getByText('محمد')).toBeInTheDocument();
  });

  it('handles zero totalBeneficiaryPercentage without division error', () => {
    const beneficiaries = makeBeneficiaries(3);
    // Should NOT throw — division by zero protection
    expect(() =>
      render(
        <AccountsBeneficiariesTable
          beneficiaries={beneficiaries}
          manualDistributions={5000}
          totalBeneficiaryPercentage={0}
        />,
      ),
    ).not.toThrow();

    // All amounts should display 0
    const cells = screen.getAllByText('0');
    expect(cells.length).toBe(3);
  });

  it('calculates proportional amounts when totalBeneficiaryPercentage > 0', () => {
    const beneficiaries = [
      { id: 'b1', name: 'سعد', share_percentage: 25 },
      { id: 'b2', name: 'خالد', share_percentage: 75 },
    ];
    const distributions = 20000;
    const totalPct = 100;

    render(
      <AccountsBeneficiariesTable
        beneficiaries={beneficiaries}
        manualDistributions={distributions}
        totalBeneficiaryPercentage={totalPct}
      />,
    );

    // سعد: 20000 * 25 / 100 = 5,000
    expect(screen.getByText('5,000')).toBeInTheDocument();
    // خالد: 20000 * 75 / 100 = 15,000
    expect(screen.getByText('15,000')).toBeInTheDocument();
  });

  it('shows total distribution amount in footer', () => {
    render(
      <AccountsBeneficiariesTable
        beneficiaries={makeBeneficiaries(1)}
        manualDistributions={12345}
        totalBeneficiaryPercentage={100}
      />,
    );
    expect(screen.getByText('12,345 ريال')).toBeInTheDocument();
  });

  it('formats share_percentage to 6 decimal places', () => {
    const beneficiaries = [
      { id: 'b1', name: 'فهد', share_percentage: 7.142857 },
    ];
    render(
      <AccountsBeneficiariesTable
        beneficiaries={beneficiaries}
        manualDistributions={1000}
        totalBeneficiaryPercentage={100}
      />,
    );
    expect(screen.getByText('7.142857%')).toBeInTheDocument();
  });
});
