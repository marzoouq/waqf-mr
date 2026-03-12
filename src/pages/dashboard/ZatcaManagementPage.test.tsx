import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: '1', email: 'admin@test.com' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    functions: { invoke: mockInvoke },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', email: 'admin@test.com' }, role: 'admin', loading: false }),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({ fiscalYear: { id: '1', label: '2025-2026', status: 'active' }, fiscalYearId: '1', isLoading: false }),
  FiscalYearProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
  useWaqfInfo: vi.fn(() => ({ waqfName: 'وقف تجريبي', nazirName: 'ناظر' })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

// Helper to build chainable supabase mock
function buildQuery(data: any[] = []) {
  const chain: any = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    limit: () => chain,
    then: (resolve: any) => resolve({ data, error: null }),
  };
  // Make it thenable for react-query
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve({ data, error: null }).then(onFulfilled),
  });
  return chain;
}

function setupMockFrom(certs: any[] = [], invoices: any[] = [], paymentInvoices: any[] = [], chain: any[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'zatca_certificates') return buildQuery(certs);
    if (table === 'invoices') return buildQuery(invoices);
    if (table === 'payment_invoices') return buildQuery(paymentInvoices);
    if (table === 'invoice_chain') return buildQuery(chain);
    return buildQuery([]);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Dynamic import to get fresh module
  return import('./ZatcaManagementPage').then(({ default: Page }) => {
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
}

describe('ZatcaManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tabs correctly', async () => {
    setupMockFrom();
    await renderPage();
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
    expect(screen.getByText('الشهادات')).toBeInTheDocument();
    expect(screen.getByText('سلسلة التوقيع')).toBeInTheDocument();
  });

  it('shows onboarding button when no certificates exist', async () => {
    setupMockFrom([], []);
    await renderPage();
    await userEvent.click(screen.getByText('الشهادات'));
    expect(await screen.findByText('بدء التسجيل (Onboarding)')).toBeInTheDocument();
  });

  it('shows production upgrade button only with compliance cert', async () => {
    const complianceCert = [{ id: '1', certificate_type: 'compliance', is_active: true, request_id: 'req1', created_at: '2026-01-01' }];
    setupMockFrom(complianceCert);
    await renderPage();
    await userEvent.click(screen.getByText('الشهادات'));
    expect(await screen.findByText('ترقية للإنتاج')).toBeInTheDocument();
  });

  it('hides production upgrade button with production cert', async () => {
    const prodCert = [{ id: '1', certificate_type: 'production', is_active: true, request_id: 'req1', created_at: '2026-01-01' }];
    setupMockFrom(prodCert);
    await renderPage();
    await userEvent.click(screen.getByText('الشهادات'));
    // Wait for table to render — multiple "إنتاج" elements exist (summary + table badge)
    await screen.findAllByText('إنتاج');
    expect(screen.queryByText('ترقية للإنتاج')).not.toBeInTheDocument();
  });

  it('shows compliance check button on signed invoices with compliance cert', async () => {
    const complianceCert = [{ id: '1', certificate_type: 'compliance', is_active: true, request_id: 'r', created_at: '2026-01-01' }];
    const signedInvoice = [{
      id: 'inv1', invoice_number: 'INV-001', invoice_type: 'standard', amount: 1000,
      vat_amount: 150, vat_rate: 15, date: '2026-01-15', zatca_status: 'not_submitted',
      zatca_uuid: null, zatca_xml: '<xml/>', invoice_hash: 'abc123', icv: 1,
    }];
    setupMockFrom(complianceCert, signedInvoice);
    await renderPage();
    expect(await screen.findByText('فحص')).toBeInTheDocument();
  });

  it('hides compliance check with production cert', async () => {
    const prodCert = [{ id: '1', certificate_type: 'production', is_active: true, request_id: 'r', created_at: '2026-01-01' }];
    const signedInvoice = [{
      id: 'inv1', invoice_number: 'INV-001', invoice_type: 'standard', amount: 1000,
      vat_amount: 150, vat_rate: 15, date: '2026-01-15', zatca_status: 'not_submitted',
      zatca_uuid: null, zatca_xml: '<xml/>', invoice_hash: 'abc123', icv: 1,
    }];
    setupMockFrom(prodCert, signedInvoice);
    await renderPage();
    // Should show إرسال but not فحص
    expect(await screen.findByText('إرسال')).toBeInTheDocument();
    expect(screen.queryByText('فحص')).not.toBeInTheDocument();
  });

  it('shows submit button only with production cert', async () => {
    const prodCert = [{ id: '1', certificate_type: 'production', is_active: true, request_id: 'r', created_at: '2026-01-01' }];
    const signedInvoice = [{
      id: 'inv1', invoice_number: 'INV-001', invoice_type: 'standard', amount: 1000,
      vat_amount: 150, vat_rate: 15, date: '2026-01-15', zatca_status: 'not_submitted',
      zatca_uuid: null, zatca_xml: '<xml/>', invoice_hash: 'abc123', icv: 1,
    }];
    setupMockFrom(prodCert, signedInvoice);
    await renderPage();
    expect(await screen.findByText('إرسال')).toBeInTheDocument();
  });

  it('shows certificate type badge correctly', async () => {
    const prodCert = [{ id: '1', certificate_type: 'production', is_active: true, request_id: 'r', created_at: '2026-01-01' }];
    setupMockFrom(prodCert);
    await renderPage();
    // Summary card should show "إنتاج"
    expect(await screen.findByText('إنتاج')).toBeInTheDocument();
  });

  it('shows compliance mode badge in invoices tab with compliance cert', async () => {
    const complianceCert = [{ id: '1', certificate_type: 'compliance', is_active: true, request_id: 'r', created_at: '2026-01-01' }];
    setupMockFrom(complianceCert);
    await renderPage();
    expect(await screen.findByText('وضع فحص الامتثال')).toBeInTheDocument();
  });
});
