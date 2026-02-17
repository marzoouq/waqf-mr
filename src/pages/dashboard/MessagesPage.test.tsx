import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'admin-1' }, role: 'admin' })),
}));

vi.mock('@/hooks/useMessaging', () => ({
  useConversations: vi.fn(() => ({
    data: [
      { id: 'c1', subject: 'استفسار مالي', type: 'chat', status: 'open', created_by: 'admin-1', participant_id: 'user-1', updated_at: '2024-06-01T10:00:00Z', created_at: '2024-06-01T10:00:00Z' },
      { id: 'c2', subject: 'طلب تقرير', type: 'chat', status: 'open', created_by: 'admin-1', participant_id: 'user-2', updated_at: '2024-06-02T10:00:00Z', created_at: '2024-06-02T10:00:00Z' },
    ],
  })),
  useMessages: vi.fn(() => ({ data: [] })),
  useSendMessage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateConversation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiaries: vi.fn(() => ({
    data: [
      { id: 'b1', name: 'فهد', user_id: 'user-1', share_percentage: 50 },
      { id: 'b2', name: 'سارة', user_id: 'user-2', share_percentage: 50 },
    ],
  })),
}));

import MessagesPage from './MessagesPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter><MessagesPage /></BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MessagesPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('المراسلات')).toBeInTheDocument();
  });

  it('shows new conversation button for admin', () => {
    renderPage();
    expect(screen.getByText('محادثة جديدة')).toBeInTheDocument();
  });

  it('shows conversation count', () => {
    renderPage();
    expect(screen.getByText('2 محادثة')).toBeInTheDocument();
  });

  it('shows conversations in list', () => {
    renderPage();
    expect(screen.getByText('استفسار مالي')).toBeInTheDocument();
    expect(screen.getByText('طلب تقرير')).toBeInTheDocument();
  });

  it('shows empty state when no conversation selected', () => {
    renderPage();
    expect(screen.getByText('اختر محادثة للبدء')).toBeInTheDocument();
  });

  it('shows beneficiary names in conversation list', () => {
    renderPage();
    expect(screen.getByText('فهد')).toBeInTheDocument();
    expect(screen.getByText('سارة')).toBeInTheDocument();
  });

  it('hides new conversation button for beneficiary', async () => {
    const { useAuth } = await import('@/contexts/AuthContext');
    (useAuth as any).mockReturnValue({ user: { id: 'user-1' }, role: 'beneficiary' });
    renderPage();
    expect(screen.queryByText('محادثة جديدة')).not.toBeInTheDocument();
  });
});
