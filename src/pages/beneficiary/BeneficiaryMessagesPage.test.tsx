import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/useMessaging', () => ({
  useConversations: vi.fn((type: string) => ({
    data: type === 'chat'
      ? [{ id: 'c1', subject: 'استفسار عن الحصة', type: 'chat', status: 'open', created_by: 'user-1', participant_id: 'admin-1', updated_at: '2024-06-01T10:00:00Z', created_at: '2024-06-01T10:00:00Z' }]
      : [{ id: 'c2', subject: 'مشكلة تقنية', type: 'support', status: 'open', created_by: 'user-1', participant_id: null, updated_at: '2024-06-02T10:00:00Z', created_at: '2024-06-02T10:00:00Z' }],
  })),
  useMessages: vi.fn(() => ({ data: [] })),
  useSendMessage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateConversation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import BeneficiaryMessagesPage from './BeneficiaryMessagesPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><BeneficiaryMessagesPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('BeneficiaryMessagesPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('المراسلات')).toBeInTheDocument();
  });

  it('shows support button', () => {
    renderPage();
    expect(screen.getByText('دعم فني')).toBeInTheDocument();
  });

  it('shows chat and support tabs', () => {
    renderPage();
    expect(screen.getByText('المحادثات')).toBeInTheDocument();
    expect(screen.getByText('الدعم الفني')).toBeInTheDocument();
  });

  it('shows conversation in chat list', () => {
    renderPage();
    expect(screen.getByText('استفسار عن الحصة')).toBeInTheDocument();
  });

  it('shows empty state prompt when no conversation selected', () => {
    renderPage();
    expect(screen.getByText('اختر محادثة أو أنشئ تذكرة دعم')).toBeInTheDocument();
  });
});
