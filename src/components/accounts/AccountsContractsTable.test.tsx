import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountsContractsTable from './AccountsContractsTable';
import type { Contract } from '@/types/database';

const mockContract: Contract = {
  id: '1',
  contract_number: 'C-001',
  tenant_name: 'أحمد',
  rent_amount: 60000,
  payment_type: 'monthly',
  payment_count: 12,
  payment_amount: 5000,
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  status: 'active',
  property_id: 'p1',
  unit_id: undefined,
  fiscal_year_id: undefined,
  notes: undefined,
  created_at: '',
  updated_at: '',
};

describe('AccountsContractsTable', () => {
  const defaultProps = {
    contracts: [mockContract],
    getPaymentPerPeriod: (c: Contract) => Number(c.payment_amount) || 0,
    getExpectedPayments: (c: Contract) => c.payment_count ?? 0,
    totalPaymentPerPeriod: 5000,
    totalAnnualRent: 60000,
    statusLabel: (s: string) => s === 'active' ? 'ساري' : s,
    onEditContract: vi.fn(),
    onDeleteContract: vi.fn(),
  };

  it('يعرض رسالة عند عدم وجود عقود', () => {
    render(<AccountsContractsTable {...defaultProps} contracts={[]} />);
    expect(screen.getByText('لا توجد عقود مسجلة')).toBeInTheDocument();
  });

  it('يعرض بيانات العقد', () => {
    render(<AccountsContractsTable {...defaultProps} />);
    // Both mobile and desktop views render
    expect(screen.getAllByText('C-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('أحمد').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ساري').length).toBeGreaterThanOrEqual(1);
  });

  it('يستدعي onEditContract عند النقر على تعديل', () => {
    render(<AccountsContractsTable {...defaultProps} />);
    const editBtns = screen.getAllByRole('button');
    const editBtn = editBtns.find(b => b.querySelector('.lucide-pencil'));
    if (editBtn) fireEvent.click(editBtn);
    expect(defaultProps.onEditContract).toHaveBeenCalledWith(mockContract);
  });

  it('يعرض إجمالي العقود في التذييل', () => {
    render(<AccountsContractsTable {...defaultProps} />);
    expect(screen.getAllByText('الإجمالي').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1 عقد').length).toBeGreaterThanOrEqual(1);
  });
});
