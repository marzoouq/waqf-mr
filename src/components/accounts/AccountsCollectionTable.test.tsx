import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountsCollectionTable, { CollectionItem } from './AccountsCollectionTable';

const mockItem: CollectionItem = {
  index: 1,
  tenantName: 'أحمد',
  paymentPerPeriod: 5000,
  expectedPayments: 12,
  paidMonths: 10,
  totalCollected: 50000,
  arrears: 10000,
  status: 'متأخر',
  notes: '',
};

const defaultProps = {
  contracts: { length: 1 },
  collectionData: [mockItem],
  editingIndex: null,
  editData: null,
  setEditData: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  totalExpectedPayments: 12,
  totalPaidMonths: 10,
  totalCollectedAll: 50000,
  totalArrearsAll: 10000,
  isUpdatePending: false,
  isUpsertPending: false,
};

describe('AccountsCollectionTable', () => {
  it('renders table title', () => {
    render(<AccountsCollectionTable {...defaultProps} />);
    expect(screen.getByText('تفصيل التحصيل والمتأخرات')).toBeInTheDocument();
  });

  it('renders tenant name', () => {
    render(<AccountsCollectionTable {...defaultProps} />);
    expect(screen.getByText('أحمد')).toBeInTheDocument();
  });

  it('shows empty message when no contracts', () => {
    render(<AccountsCollectionTable {...defaultProps} contracts={{ length: 0 }} collectionData={[]} />);
    expect(screen.getByText('لا توجد عقود مسجلة')).toBeInTheDocument();
  });

  it('shows footer totals', () => {
    render(<AccountsCollectionTable {...defaultProps} />);
    expect(screen.getByText('1 مستأجر')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<AccountsCollectionTable {...defaultProps} />);
    expect(screen.getByText('متأخر')).toBeInTheDocument();
  });

  it('calls onStartEdit when edit button clicked', async () => {
    const onStartEdit = vi.fn();
    render(<AccountsCollectionTable {...defaultProps} onStartEdit={onStartEdit} />);
    const editBtn = screen.getAllByRole('button')[0];
    await userEvent.click(editBtn);
    expect(onStartEdit).toHaveBeenCalledWith(0);
  });

  it('shows edit inputs when editing', () => {
    render(
      <AccountsCollectionTable
        {...defaultProps}
        editingIndex={0}
        editData={{ tenantName: 'أحمد', monthlyRent: 5000, paidMonths: 10, status: 'متأخر' }}
      />
    );
    // Should have input fields
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });
});
