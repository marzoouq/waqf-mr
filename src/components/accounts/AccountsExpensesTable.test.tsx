import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsExpensesTable from './AccountsExpensesTable';

describe('AccountsExpensesTable', () => {
  it('renders title', () => {
    render(<AccountsExpensesTable expensesCount={1} expensesByType={{ كهرباء: 500 }} totalExpenses={500} />);
    expect(screen.getByText('تفصيل المصروفات')).toBeInTheDocument();
  });

  it('shows empty message when no expenses', () => {
    render(<AccountsExpensesTable expensesCount={0} expensesByType={{}} totalExpenses={0} />);
    expect(screen.getByText('لا توجد مصروفات مسجلة')).toBeInTheDocument();
  });

  it('renders expense types', () => {
    render(
      <AccountsExpensesTable
        expensesCount={2}
        expensesByType={{ كهرباء: 500, مياه: 300 }}
        totalExpenses={800}
      />
    );
    // Both mobile and desktop views render
    expect(screen.getAllByText('كهرباء').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('مياه').length).toBeGreaterThanOrEqual(1);
  });

  it('shows total expenses', () => {
    render(
      <AccountsExpensesTable
        expensesCount={1}
        expensesByType={{ صيانة: 1000 }}
        totalExpenses={1000}
      />
    );
    expect(screen.getAllByText(/إجمالي المصروفات/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows negative amounts with dash prefix', () => {
    render(
      <AccountsExpensesTable
        expensesCount={1}
        expensesByType={{ كهرباء: 500 }}
        totalExpenses={500}
      />
    );
    // The component prefixes amounts with "-"
    const allText = document.body.textContent || '';
    expect(allText).toContain('-');
  });
});
