/**
 * Contract — تأكيد أن بطاقة "الإيرادات التعاقدية" تظهر للناظر فقط، لا للمستفيد.
 * يحمي ضد ارتداد الإصلاح الذي عالج تسرّب الأرقام المالية إلى لوحة المستفيد.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';

const baseStats = {
  total: 5,
  active: 3,
  activePercent: 60,
  expired: 2,
  totalRent: 120000,
  activeRent: 72000,
  expiringSoon: 1,
};

describe('ContractStatsCards — variant=beneficiary لا يكشف الإيرادات', () => {
  it('لا يعرض "الإيرادات التعاقدية" عند variant=beneficiary', () => {
    render(<ContractStatsCards stats={baseStats} isLoading={false} variant="beneficiary" />);
    expect(screen.queryByText('الإيرادات التعاقدية')).toBeNull();
    expect(screen.queryByText(/نشط:/)).toBeNull();
  });

  it('يعرض "الإيرادات التعاقدية" عند variant=admin (افتراضي)', () => {
    render(<ContractStatsCards stats={baseStats} isLoading={false} />);
    expect(screen.getByText('الإيرادات التعاقدية')).toBeInTheDocument();
  });

  it('يعرض البطاقتين الأساسيتين (الإجمالي + النشطة) في كلا الوضعين', () => {
    const { rerender } = render(<ContractStatsCards stats={baseStats} isLoading={false} variant="beneficiary" />);
    expect(screen.getByText('إجمالي العقود')).toBeInTheDocument();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();

    rerender(<ContractStatsCards stats={baseStats} isLoading={false} variant="admin" />);
    expect(screen.getByText('إجمالي العقود')).toBeInTheDocument();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();
  });
});
