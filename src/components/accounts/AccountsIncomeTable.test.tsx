import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountsIncomeTable from './AccountsIncomeTable';

describe('AccountsIncomeTable', () => {
  it('يعرض رسالة عند عدم وجود إيرادات', () => {
    render(<AccountsIncomeTable incomeCount={0} incomeBySource={{}} totalIncome={0} />);
    expect(screen.getByText('لا توجد إيرادات مسجلة')).toBeInTheDocument();
  });

  it('يعرض جدول الإيرادات مع المصادر', () => {
    const bySource = { 'إيجارات': 100000, 'استثمارات': 20000 };
    render(<AccountsIncomeTable incomeCount={3} incomeBySource={bySource} totalIncome={120000} />);
    expect(screen.getByText('إيجارات')).toBeInTheDocument();
    expect(screen.getByText('استثمارات')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الإيرادات')).toBeInTheDocument();
  });

  it('يعرض عنوان الجدول', () => {
    render(<AccountsIncomeTable incomeCount={0} incomeBySource={{}} totalIncome={0} />);
    expect(screen.getByText('تفصيل الإيرادات')).toBeInTheDocument();
  });
});
