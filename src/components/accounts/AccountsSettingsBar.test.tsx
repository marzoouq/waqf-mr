import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountsSettingsBar from './AccountsSettingsBar';

const defaultProps = {
  fiscalYear: '1446-1447هـ',
  adminPercent: 10,
  waqifPercent: 5,
  waqfCorpusPrevious: 10000,
  manualVat: 5000,
  zakatAmount: 2000,
  waqfCorpusManual: 3000,
  manualDistributions: 8000,
  calculatedVat: 1500,
  commercialRent: 50000,
  vatPercentage: 15,
  onFiscalYearChange: vi.fn(),
  onAdminPercentChange: vi.fn(),
  onWaqifPercentChange: vi.fn(),
  onWaqfCorpusPreviousChange: vi.fn(),
  onManualVatChange: vi.fn(),
  onZakatAmountChange: vi.fn(),
  onWaqfCorpusManualChange: vi.fn(),
  onManualDistributionsChange: vi.fn(),
};

describe('AccountsSettingsBar', () => {
  it('يعرض إعدادات السنة المالية', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    expect(screen.getByText('إعدادات:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1446-1447هـ')).toBeInTheDocument();
  });

  it('يعرض نسب الناظر والواقف', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('يعرض الضريبة المحسوبة استرشادياً', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    expect(screen.getByText(/ضريبة تجارية محسوبة/)).toBeInTheDocument();
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('يستدعي callback عند تغيير السنة المالية', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    const input = screen.getByDisplayValue('1446-1447هـ');
    fireEvent.change(input, { target: { value: '1447-1448هـ' } });
    expect(defaultProps.onFiscalYearChange).toHaveBeenCalledWith('1447-1448هـ');
  });

  it('يعرض حقل الزكاة', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    expect(screen.getByText(/مبلغ الزكاة/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
  });

  it('يعرض حقل رقبة الوقف الحالي', () => {
    render(<AccountsSettingsBar {...defaultProps} />);
    expect(screen.getByText(/رقبة الوقف للعام الحالي/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
  });
});
