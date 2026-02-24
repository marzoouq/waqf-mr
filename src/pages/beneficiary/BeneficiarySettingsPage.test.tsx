import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', email: 'ahmed@test.com' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiariesSafe: vi.fn(() => ({
    data: [
      { id: 'b1', user_id: 'user-1', name: 'أحمد محمد', share_percentage: 10, phone: '0551234567', email: 'ahmed@test.com', national_id: '1234567890', bank_account: null, notes: null },
    ],
    isLoading: false, isError: false,
  })),
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

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({ data: [], unreadCount: 0 })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { updateUser: vi.fn(() => Promise.resolve({ error: null })) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/ThemeColorPicker', () => ({ default: () => <div>ThemeColorPicker</div> }));

import BeneficiarySettingsPage from './BeneficiarySettingsPage';

const renderPage = () => render(<MemoryRouter><BeneficiarySettingsPage /></MemoryRouter>);

describe('BeneficiarySettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يعرض عنوان الصفحة', () => {
    renderPage();
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    expect(screen.getByText('إدارة حسابك وتفضيلاتك')).toBeInTheDocument();
  });

  it('يعرض تبويبات الإعدادات', () => {
    renderPage();
    expect(screen.getByText('الحساب')).toBeInTheDocument();
    expect(screen.getByText('كلمة المرور')).toBeInTheDocument();
    expect(screen.getByText('الإشعارات')).toBeInTheDocument();
    expect(screen.getByText('المظهر')).toBeInTheDocument();
  });

  it('يعرض معلومات المستفيد في تبويب الحساب', () => {
    renderPage();
    expect(screen.getByDisplayValue('أحمد محمد')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ahmed@test.com')).toBeInTheDocument();
  });

  it('يعرض الهوية مخفية', () => {
    renderPage();
    expect(screen.getByDisplayValue('****7890')).toBeInTheDocument();
  });

  it('يعرض رسالة القراءة فقط', () => {
    renderPage();
    expect(screen.getByText(/هذه المعلومات تُدار بواسطة ناظر الوقف/)).toBeInTheDocument();
  });

  it('يعرض حالة الخطأ', async () => {
    const { useBeneficiariesSafe } = await import('@/hooks/useBeneficiaries');
    (useBeneficiariesSafe as any).mockReturnValueOnce({
      data: [], isLoading: false, isError: true,
    });
    render(<MemoryRouter><BeneficiarySettingsPage /></MemoryRouter>);
    expect(screen.getByText('حدث خطأ أثناء تحميل البيانات')).toBeInTheDocument();
  });

  it('يعرض حالة التحميل', async () => {
    const { useBeneficiariesSafe } = await import('@/hooks/useBeneficiaries');
    (useBeneficiariesSafe as any).mockReturnValueOnce({
      data: [], isLoading: true, isError: false,
    });
    render(<MemoryRouter><BeneficiarySettingsPage /></MemoryRouter>);
    // TableSkeleton renders
    expect(screen.queryByText('الإعدادات')).not.toBeInTheDocument();
  });
});
