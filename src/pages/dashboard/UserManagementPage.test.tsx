import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: 'admin', loading: false }),
}));

const mockUsers = [
  { id: 'u1', email: 'admin@test.com', email_confirmed_at: '2024-01-01', created_at: '2024-01-01', last_sign_in_at: '2024-06-01', role: 'admin' },
  { id: 'u2', email: 'ben@test.com', email_confirmed_at: null, created_at: '2024-02-01', last_sign_in_at: null, role: 'beneficiary' },
  { id: 'u3', email: 'waqif@test.com', email_confirmed_at: '2024-01-01', created_at: '2024-03-01', last_sign_in_at: '2024-05-01', role: 'waqif' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'test' } } }) },
    functions: { invoke: vi.fn(() => Promise.resolve({ data: { users: mockUsers }, error: null })) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { value: 'false' }, error: null }) }) }),
    }),
  },
}));

import UserManagementPage from './UserManagementPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><UserManagementPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('UserManagementPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('إدارة المستخدمين')).toBeInTheDocument();
  });

  it('shows create user button', () => {
    renderPage();
    expect(screen.getByText('إنشاء مستخدم')).toBeInTheDocument();
  });

  it('shows registration toggle', () => {
    renderPage();
    expect(screen.getByText('التسجيل العام')).toBeInTheDocument();
  });

  it('shows users table headers after loading', async () => {
    renderPage();
    expect(await screen.findByText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByText('الدور')).toBeInTheDocument();
    expect(screen.getByText('الحالة')).toBeInTheDocument();
    expect(screen.getByText('آخر دخول')).toBeInTheDocument();
  });

  it('displays users after loading', async () => {
    renderPage();
    expect(await screen.findByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('ben@test.com')).toBeInTheDocument();
    expect(screen.getByText('waqif@test.com')).toBeInTheDocument();
  });

  it('shows role badges correctly', async () => {
    renderPage();
    await screen.findByText('admin@test.com');
    expect(screen.getByText('ناظر')).toBeInTheDocument();
    expect(screen.getByText('مستفيد')).toBeInTheDocument();
    expect(screen.getByText('واقف')).toBeInTheDocument();
  });

  it('shows confirm button for unconfirmed user', async () => {
    renderPage();
    await screen.findByText('ben@test.com');
    expect(screen.getByText('غير مفعل')).toBeInTheDocument();
    expect(screen.getByText('تفعيل')).toBeInTheDocument();
  });

  it('shows user count in card title', async () => {
    renderPage();
    expect(await screen.findByText(/المستخدمون \(3\)/)).toBeInTheDocument();
  });
});
