import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsSavedTable from './AccountsSavedTable';

const mockAccounts = [
  {
    id: '1',
    fiscal_year: '1446-1447هـ',
    total_income: 500000,
    total_expenses: 100000,
    admin_share: 40000,
    waqif_share: 20000,
    waqf_revenue: 340000,
  },
];

describe('AccountsSavedTable', () => {
  it('يعرض رسالة التحميل', () => {
    const { container } = render(<AccountsSavedTable accounts={[]} isLoading={true} onDeleteAccount={vi.fn()} />);
    // Loading shows Skeleton placeholders
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض رسالة فارغة عند عدم وجود حسابات', () => {
    render(<AccountsSavedTable accounts={[]} isLoading={false} onDeleteAccount={vi.fn()} />);
    expect(screen.getByText('لا توجد حسابات ختامية مسجلة')).toBeInTheDocument();
  });

  it('يعرض بيانات الحسابات', () => {
    render(<AccountsSavedTable accounts={mockAccounts} isLoading={false} onDeleteAccount={vi.fn()} />);
    expect(screen.getByText('1446-1447هـ')).toBeInTheDocument();
    expect(screen.getByText('السجلات السابقة')).toBeInTheDocument();
  });
});
