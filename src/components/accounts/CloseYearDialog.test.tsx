import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CloseYearDialog from './CloseYearDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn(),
  isClosing: false,
  fyLabel: '1446-1447هـ',
  waqfCorpusManual: 5000,
  totalIncome: 100000,
  totalExpenses: 20000,
  netAfterExpenses: 80000,
  availableAmount: 60000,
  distributionsAmount: 30000,
};

describe('CloseYearDialog', () => {
  it('يعرض العنوان', () => {
    render(<CloseYearDialog {...defaultProps} />);
    expect(screen.getByText('تأكيد إقفال السنة المالية')).toBeInTheDocument();
  });

  it('يعرض الملخص المالي عند وجود بيانات', () => {
    render(<CloseYearDialog {...defaultProps} />);
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument();
    expect(screen.getByText('إجمالي المصروفات')).toBeInTheDocument();
    expect(screen.getByText('المتاح للتوزيع')).toBeInTheDocument();
    expect(screen.getByText('الموزَّع فعلياً')).toBeInTheDocument();
  });

  it('يخفي الملخص المالي عند totalIncome=0 و totalExpenses=0', () => {
    render(<CloseYearDialog {...defaultProps} totalIncome={0} totalExpenses={0} />);
    expect(screen.queryByText('إجمالي الدخل')).not.toBeInTheDocument();
  });

  it('يعرض "جاري الإقفال" عند isClosing=true', () => {
    render(<CloseYearDialog {...defaultProps} isClosing={true} />);
    expect(screen.getByText('جاري الإقفال...')).toBeInTheDocument();
  });

  it('يعرض السنة المالية ورقبة الوقف', () => {
    render(<CloseYearDialog {...defaultProps} />);
    expect(screen.getByText('1446-1447هـ')).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
  });

  it('يستدعي onConfirm عند النقر', () => {
    render(<CloseYearDialog {...defaultProps} />);
    const btn = screen.getByText('تأكيد الإقفال');
    fireEvent.click(btn);
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });
});
