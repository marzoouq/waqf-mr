import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ key: 'test' }], error: null })),
      })),
    })),
    getChannels: vi.fn(() => []),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
    },
  },
}));

// Mock constants — يمنع استيراد lucide-react icons
vi.mock('@/components/dashboard-layout/constants', () => ({
  allAdminLinks: [
    { to: '/dashboard', label: 'الرئيسية' },
    { to: '/dashboard/properties', label: 'العقارات' },
  ],
  allBeneficiaryLinks: [
    { to: '/beneficiary', label: 'الرئيسية' },
  ],
  ROUTE_TITLES: {
    '/dashboard': 'الرئيسية',
    '/dashboard/properties': 'العقارات',
    '/beneficiary': 'الرئيسية',
  } as Record<string, string>,
}));

// Mock pagePerformanceTracker
vi.mock('@/lib/pagePerformanceTracker', () => ({
  getPagePerfSummaries: vi.fn(() => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checks — قاعدة البيانات', () => {
  it('checkSupabaseConnection يُرجع pass عند النجاح', async () => {
    const { checkSupabaseConnection } = await import('./checks');
    const result = await checkSupabaseConnection();
    expect(result.status).toBe('pass');
    expect(result.id).toBe('db_connection');
  });

  it('checkAuthSession يُرجع pass عند وجود مستخدم', async () => {
    const { checkAuthSession } = await import('./checks');
    const result = await checkAuthSession();
    expect(result.status).toBe('pass');
  });

  it('checkRealtimeChannels يُرجع info', async () => {
    const { checkRealtimeChannels } = await import('./checks');
    const result = await checkRealtimeChannels();
    expect(result.status).toBe('info');
    expect(result.detail).toContain('0');
  });
});

describe('checks — إعدادات التطبيق', () => {
  it('checkRegisteredRoutes يُرجع pass عند التطابق', async () => {
    const { checkRegisteredRoutes } = await import('./checks');
    const result = await checkRegisteredRoutes();
    expect(result.status).toBe('pass');
  });

  it('checkOnlineStatus يُرجع pass عند الاتصال', async () => {
    const { checkOnlineStatus } = await import('./checks');
    const result = await checkOnlineStatus();
    expect(result.status).toBe('pass');
  });
});

describe('diagnosticCategories', () => {
  it('يحتوي 6 بطاقات و26 فحص', async () => {
    const { diagnosticCategories } = await import('./checks');
    expect(diagnosticCategories).toHaveLength(6);
    const totalChecks = diagnosticCategories.reduce((sum, cat) => sum + cat.checks.length, 0);
    expect(totalChecks).toBe(26);
  });
});
