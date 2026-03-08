import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    functions: { invoke: vi.fn(() => Promise.resolve({ data: { users: mockUsers, total: 3 }, error: null })) },
    from: (table: string) => {
      if (table === 'beneficiaries') {
        return { select: () => ({ or: () => Promise.resolve({ data: [], error: null }) }) };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { value: 'false' }, error: null }) }) }),
      };
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
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
    const headers = await screen.findAllByText('البريد الإلكتروني');
    expect(headers.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الدور').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الحالة').length).toBeGreaterThanOrEqual(1);
  });

  it('displays users after loading', async () => {
    renderPage();
    // Wait for data to load by checking user count
    await screen.findByText(/المستخدمون \(3\)/);
    await waitFor(() => {
      expect(screen.getAllByText('admin@test.com').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('ben@test.com').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('waqif@test.com').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows role badges correctly', async () => {
    renderPage();
    await screen.findByText(/المستخدمون \(3\)/);
    await waitFor(() => {
      expect(screen.getAllByText('ناظر').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('مستفيد').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('واقف').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows confirm button for unconfirmed user', async () => {
    renderPage();
    await screen.findByText(/المستخدمون \(3\)/);
    await waitFor(() => {
      expect(screen.getAllByText('غير مفعل').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('تفعيل').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows user count in card title', async () => {
    renderPage();
    expect(await screen.findByText(/المستخدمون \(3\)/)).toBeInTheDocument();
  });
});
