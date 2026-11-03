/**
 * اختبارات الصفحات التي لم تكن مغطاة: الصيانة، موافقة الربط، دعم المستفيد.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const maint = { isActive: true, message: 'صيانة مجدولة', startedAt: null as string | null, isLoading: false };
const auth = { role: 'beneficiary' as string | null, user: { id: 'u1' } as { id: string } | null, signOut: vi.fn() };
const consent = { details: null as unknown, error: null as string | null, busy: false, decide: vi.fn() };
const support = {
  tickets: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn(),
  selectedTicket: null, setSelectedTicket: vi.fn(), showNewTicket: false, setShowNewTicket: vi.fn(),
};

vi.mock('@/hooks/application/useMaintenanceMode', () => ({ useMaintenanceMode: () => maint }));
vi.mock('@/hooks/auth/session/useAuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/page/auth/useOAuthConsent', () => ({ useOAuthConsent: () => consent }));
vi.mock('@/hooks/page/beneficiary', () => ({ useSupportPage: () => support }));
vi.mock('@/components/layout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageHeaderCard: ({ title, actions }: { title: string; actions?: ReactNode }) => <div><h1>{title}</h1>{actions}</div>,
}));
vi.mock('@/components/support', () => ({
  TicketList: ({ tickets }: { tickets: unknown[] }) => <div>قائمة {tickets.length}</div>,
  TicketViewDialog: () => null,
  NewTicketDialog: () => null,
}));

import MaintenancePage from './MaintenancePage';
import OAuthConsent from './OAuthConsent';
import BeneficiarySupportPage from './beneficiary/SupportPage';

const wrap = (el: ReactNode, path = '/m') => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>الرئيسية</div>} />
        <Route path="/m" element={el} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  Object.assign(maint, { isActive: true, isLoading: false, startedAt: null });
  Object.assign(auth, { role: 'beneficiary', user: { id: 'u1' } });
  Object.assign(consent, { details: null, error: null, busy: false });
  Object.assign(support, { tickets: [], isLoading: false, isError: false });
});

describe('صفحة الصيانة', () => {
  it('تعرض الرسالة للمستفيد أثناء الصيانة', () => {
    wrap(<MaintenancePage />);
    expect(screen.getByText('النظام تحت الصيانة')).toBeInTheDocument();
    expect(screen.getByText('صيانة مجدولة')).toBeInTheDocument();
  });
  it.each(['admin', 'support'])('الدور %s يتجاوز الصيانة إلى الرئيسية', (r) => {
    auth.role = r;
    wrap(<MaintenancePage />);
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
  });
  it.each(['accountant', 'waqif'])('الدور %s لا يتجاوز الصيانة', (r) => {
    auth.role = r;
    wrap(<MaintenancePage />);
    expect(screen.getByText('النظام تحت الصيانة')).toBeInTheDocument();
  });
  it('عند انتهاء الصيانة يعود للرئيسية', () => {
    maint.isActive = false;
    wrap(<MaintenancePage />);
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
  });
  it('زر الخروج يظهر فقط للمسجّل', () => {
    auth.user = null;
    wrap(<MaintenancePage />);
    expect(screen.queryByText('تسجيل الخروج')).toBeNull();
  });
});

describe('صفحة موافقة الربط', () => {
  it('لا تعرض زر الموافقة قبل وصول التفاصيل', () => {
    wrap(<OAuthConsent />, '/m?authorization_id=a1');
    expect(screen.queryByText('الموافقة والربط')).toBeNull();
  });
  it('تعرض الخطأ ولا تعرض أزرار القرار', () => {
    consent.error = 'طلب غير صالح';
    wrap(<OAuthConsent />);
    expect(screen.getByText('طلب غير صالح')).toBeInTheDocument();
    expect(screen.queryByText('رفض')).toBeNull();
  });
  it('الرفض يرسل false والموافقة ترسل true', () => {
    consent.details = { client: { name: 'تطبيق س' } };
    wrap(<OAuthConsent />);
    fireEvent.click(screen.getByText('رفض'));
    fireEvent.click(screen.getByText('الموافقة والربط'));
    expect(consent.decide).toHaveBeenNthCalledWith(1, false);
    expect(consent.decide).toHaveBeenNthCalledWith(2, true);
  });
  it('الأزرار معطلة أثناء المعالجة', () => {
    consent.details = { client: {} };
    consent.busy = true;
    wrap(<OAuthConsent />);
    expect(screen.getByText('رفض').closest('button')).toBeDisabled();
  });
});

describe('صفحة دعم المستفيد', () => {
  it('حالة فارغة', () => {
    wrap(<BeneficiarySupportPage />);
    expect(screen.getByText(/لا توجد تذاكر/)).toBeInTheDocument();
  });
  it('حالة خطأ مع إعادة المحاولة', () => {
    support.isError = true;
    wrap(<BeneficiarySupportPage />);
    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(support.refetch).toHaveBeenCalled();
  });
  it('تعرض التذاكر وزر طلب جديد يفتح النافذة', () => {
    support.tickets = [{ id: 't1' }, { id: 't2' }];
    wrap(<BeneficiarySupportPage />);
    expect(screen.getByText('قائمة 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('طلب دعم جديد'));
    expect(support.setShowNewTicket).toHaveBeenCalledWith(true);
  });
});
