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
    expect(screen.getByText('كهرباء')).toBeInTheDocument();
    expect(screen.getByText('مياه')).toBeInTheDocument();
  });

  it('shows total expenses', () => {
    render(
      <AccountsExpensesTable
        expensesCount={1}
        expensesByType={{ صيانة: 1000 }}
        totalExpenses={1000}
      />
    );
    expect(screen.getByText('إجمالي المصروفات')).toBeInTheDocument();
  });

  it('shows negative amounts with dash prefix', () => {
    render(
      <AccountsExpensesTable
        expensesCount={1}
        expensesByType={{ كهرباء: 500 }}
        totalExpenses={500}
      />
    );
    // The amount cell shows "-500" or "-٥٠٠"
    const cells = screen.getAllByRole('cell');
    const amountCell = cells.find(c => c.textContent?.startsWith('-'));
    expect(amountCell).toBeDefined();
  });
});
