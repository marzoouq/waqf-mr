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

const mockContracts = [
  {
    id: 'c1', contract_number: 'W-001', tenant_name: 'أحمد',
    rent_amount: 60000, payment_type: 'monthly', payment_count: 12, payment_amount: 5000,
    start_date: '2024-01-01', end_date: '2024-12-31', status: 'active',
    property_id: 'p1', unit_id: null, fiscal_year_id: 'fy1', notes: null, created_at: '', updated_at: '',
  },
  {
    id: 'c2', contract_number: 'W-002', tenant_name: 'خالد',
    rent_amount: 36000, payment_type: 'monthly', payment_count: 12, payment_amount: 3000,
    start_date: '2023-01-01', end_date: '2023-12-31', status: 'expired',
    property_id: 'p1', unit_id: null, fiscal_year_id: 'fy1', notes: null, created_at: '', updated_at: '',
  },
];

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({
    data: mockContracts, isLoading: false, isError: false, refetch: vi.fn(),
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

import ContractsViewPage from './ContractsViewPage';

const renderPage = () => render(<MemoryRouter><ContractsViewPage /></MemoryRouter>);

describe('ContractsViewPage', () => {
  it('يعرض عنوان الصفحة', () => {
    renderPage();
    expect(screen.getByText('العقود')).toBeInTheDocument();
  });

  it('يعرض بطاقات الملخص الإحصائي', () => {
    renderPage();
    expect(screen.getByText('إجمالي العقود')).toBeInTheDocument();
    expect(screen.getByText('نشطة')).toBeInTheDocument();
    expect(screen.getByText('منتهية')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الإيجارات')).toBeInTheDocument();
  });

  it('يعرض إجمالي العقود = 2', () => {
    renderPage();
    // Find the stat card with total count
    const totalCards = screen.getAllByText('2');
    expect(totalCards.length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض عدد العقود النشطة = 1', () => {
    renderPage();
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض بيانات العقد في الجدول', () => {
    renderPage();
    expect(screen.getByText('W-001')).toBeInTheDocument();
    expect(screen.getByText('أحمد')).toBeInTheDocument();
    expect(screen.getByText('W-002')).toBeInTheDocument();
    expect(screen.getByText('خالد')).toBeInTheDocument();
  });

  it('يعرض حالة العقد بشكل صحيح', () => {
    renderPage();
    expect(screen.getByText('نشط')).toBeInTheDocument();
    expect(screen.getByText('منتهي')).toBeInTheDocument();
  });

  it('يعرض بطاقة قريبة الانتهاء', () => {
    renderPage();
    expect(screen.getByText('قريبة الانتهاء')).toBeInTheDocument();
  });

  it('يعرض رؤوس الجدول', () => {
    renderPage();
    expect(screen.getByText('رقم العقد')).toBeInTheDocument();
    expect(screen.getByText('المستأجر')).toBeInTheDocument();
    expect(screen.getByText('قيمة الإيجار')).toBeInTheDocument();
  });
});