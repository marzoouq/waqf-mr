import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(),
  useWaqfInfo: vi.fn(() => ({ data: null })),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useAccessLog', () => ({
  logAccessEvent: vi.fn(),
}));

vi.mock('@/utils/safeErrorMessage', () => ({
  getSafeErrorMessage: vi.fn(() => 'خطأ آمن'),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: { properties: 12, beneficiaries: 8, fiscal_years: 3 }, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { value: 'true' }, error: null })),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(async () => ({ data: { found: true, email: 'user@example.com' }, error: null })),
    },
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';

import Auth from './Auth';
import Index from './Index';
import InstallApp from './InstallApp';
import NotFound from './NotFound';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfUse from './TermsOfUse';
import Unauthorized from './Unauthorized';

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseAppSettings = vi.mocked(useAppSettings);

const renderWithRouter = (node: React.ReactNode, initialEntry = '/') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>{node}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Public pages smoke tests', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      role: null,
      loading: false,
      signIn: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ error: null })),
    } as any);

    mockedUseAppSettings.mockReturnValue({
      getJsonSetting: vi.fn((_key: string, fallback: unknown) => fallback),
    } as any);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('renders Unauthorized page', () => {
    renderWithRouter(<Unauthorized />);
    expect(screen.getByText('غير مصرح')).toBeInTheDocument();
  });

  it('renders NotFound page', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithRouter(<NotFound />, '/missing-page');
    expect(screen.getByText('عذراً! الصفحة غير موجودة')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders PrivacyPolicy page', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByText('سياسة الخصوصية')).toBeInTheDocument();
  });

  it('renders TermsOfUse page', () => {
    renderWithRouter(<TermsOfUse />);
    expect(screen.getByText('شروط الاستخدام')).toBeInTheDocument();
  });

  it('renders InstallApp page', () => {
    renderWithRouter(<InstallApp />);
    expect(screen.getByText('تثبيت التطبيق')).toBeInTheDocument();
  });

  it('renders Index page', async () => {
    renderWithRouter(<Index />);
    expect(await screen.findByText('نظام إدارة الوقف')).toBeInTheDocument();
    expect(screen.getAllByText('دخول النظام').length).toBeGreaterThan(0);
  });

  it('renders Auth page', async () => {
    await act(async () => {
      renderWithRouter(<Auth />);
      await Promise.resolve();
    });
    expect(screen.getAllByText('نظام إدارة الوقف').length).toBeGreaterThan(0);
    expect(screen.getAllByText('تسجيل الدخول').length).toBeGreaterThan(0);
  });
});
