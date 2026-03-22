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
    // Both mobile and desktop views render in jsdom
    expect(screen.getAllByText('إيجارات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('استثمارات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/إجمالي الإيرادات/).length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض عنوان الجدول', () => {
    render(<AccountsIncomeTable incomeCount={0} incomeBySource={{}} totalIncome={0} />);
    expect(screen.getByText('تفصيل الإيرادات')).toBeInTheDocument();
  });
});
