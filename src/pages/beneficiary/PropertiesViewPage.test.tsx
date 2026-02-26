import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false, noPublishedYears: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({
    data: [
      { id: 'p1', property_number: 'عقار-01', property_type: 'مبنى', location: 'الرياض', area: 500, created_at: '', updated_at: '', description: null },
    ],
    isLoading: false, isError: false, refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: vi.fn(() => ({
    data: [
      { id: 'u1', property_id: 'p1', unit_number: '101', unit_type: 'شقة', status: 'مؤجرة', area: 120, floor: '1', notes: null, created_at: '', updated_at: '' },
      { id: 'u2', property_id: 'p1', unit_number: '102', unit_type: 'شقة', status: 'شاغرة', area: 100, floor: '1', notes: null, created_at: '', updated_at: '' },
    ],
    isLoading: false, isError: false, refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({
    data: [
      { id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد', rent_amount: 60000, payment_type: 'monthly', payment_count: 12, payment_amount: 5000, start_date: '2024-01-01', end_date: '2024-12-31', status: 'active', property_id: 'p1', unit_id: 'u1', fiscal_year_id: 'fy1', notes: null, created_at: '', updated_at: '' },
    ],
  })),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpensesByFiscalYear: vi.fn(() => ({
    data: [
      { id: 'e1', expense_type: 'صيانة', amount: 5000, date: '2024-06-01', property_id: 'p1', fiscal_year_id: 'fy1', description: null, created_at: '' },
    ],
  })),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({ data: [], unreadCount: 0 })),
  TONE_OPTIONS: [
    { id: 'chime', label: 'رنين كلاسيكي' },
    { id: 'bell', label: 'جرس' },
    { id: 'drop', label: 'قطرة ماء' },
    { id: 'pulse', label: 'نبضة' },
    { id: 'gentle', label: 'هادئ' },
  ],
  VOLUME_OPTIONS: [
    { id: 'high', label: 'مرتفع', gain: 1.0 },
    { id: 'medium', label: 'متوسط', gain: 0.5 },
    { id: 'low', label: 'منخفض', gain: 0.15 },
  ],
  NOTIFICATION_TONE_KEY: 'waqf_notification_tone',
  NOTIFICATION_VOLUME_KEY: 'waqf_notification_volume',
  NOTIF_PREFS_KEY: 'waqf_notification_preferences',
  previewTone: vi.fn(),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

import PropertiesViewPage from './PropertiesViewPage';

const renderPage = () => render(<MemoryRouter><PropertiesViewPage /></MemoryRouter>);

describe('PropertiesViewPage', () => {
  it('يعرض عنوان الصفحة', () => {
    renderPage();
    expect(screen.getByText('العقارات')).toBeInTheDocument();
  });

  it('يعرض بطاقات الملخص التشغيلي', () => {
    renderPage();
    expect(screen.getByText('إجمالي العقارات')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الوحدات')).toBeInTheDocument();
    expect(screen.getByText('مؤجرة')).toBeInTheDocument();
    expect(screen.getByText('شاغرة')).toBeInTheDocument();
  });

  it('يعرض المؤشرات المالية', () => {
    renderPage();
    expect(screen.getByText('الإيرادات التعاقدية')).toBeInTheDocument();
    expect(screen.getByText('المصروفات')).toBeInTheDocument();
    expect(screen.getByText('صافي الدخل')).toBeInTheDocument();
  });

  it('يعرض نسبة الإشغال', () => {
    renderPage();
    expect(screen.getByText('نسبة الإشغال الإجمالية')).toBeInTheDocument();
  });

  it('يعرض بطاقة العقار', () => {
    renderPage();
    expect(screen.getByText('عقار-01')).toBeInTheDocument();
    expect(screen.getByText('مبنى')).toBeInTheDocument();
    expect(screen.getByText('الرياض')).toBeInTheDocument();
  });

  it('يعرض الدخل النشط', () => {
    renderPage();
    expect(screen.getByText('الدخل النشط')).toBeInTheDocument();
  });

  it('يعرض معلومات العقار التفصيلية', () => {
    renderPage();
    expect(screen.getByText(/500/)).toBeInTheDocument(); // area
  });
});
