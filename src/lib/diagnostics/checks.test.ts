import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───

const mockFrom = vi.fn();
const mockGetChannels = vi.fn(() => []);
const mockGetUser = vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    getChannels: () => mockGetChannels(),
    auth: { getUser: () => mockGetUser() },
  },
}));

vi.mock('@/components/layout/constants', () => ({
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

vi.mock('@/lib/monitoring', () => ({
  getPagePerfSummaries: vi.fn(() => []),
}));

// دالة مساعدة لمحاكاة supabase.from(...).select(...)...
const mockChain = (result: { data?: unknown; error?: unknown; count?: number | null }) => {
  const terminal = () => Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  const proxy = () =>
    new Proxy(chain, {
      get: (_t, prop) => {
        if (prop === 'then') return undefined; // ليس Promise
        return (..._args: unknown[]) => {
          // إذا كان آخر استدعاء يُنتج النتيجة
          return new Proxy({}, {
            get: (_t2, p2) => {
              if (p2 === 'then') return terminal().then.bind(terminal());
              return () => new Proxy({}, {
                get: (_t3, p3) => {
                  if (p3 === 'then') return terminal().then.bind(terminal());
                  return () => new Proxy({}, {
                    get: (_t4, p4) => {
                      if (p4 === 'then') return terminal().then.bind(terminal());
                      return () => terminal();
                    },
                  });
                },
              });
            },
          });
        };
      },
    });
  return proxy();
};

beforeEach(() => {
  vi.clearAllMocks();
  // افتراضي: supabase.from() يرجع بيانات ناجحة
  mockFrom.mockReturnValue(mockChain({ data: [{ key: 'test' }], error: null }));
});

// ════════════════════════════════════════════════
// بطاقة 1 — قاعدة البيانات
// ════════════════════════════════════════════════

describe('checks — قاعدة البيانات', () => {
  it('checkSupabaseConnection يُرجع pass عند النجاح', async () => {
    const { checkSupabaseConnection } = await import('./checks');
    const result = await checkSupabaseConnection();
    expect(result.status).toBe('pass');
    expect(result.id).toBe('db_connection');
  });

  it('checkSupabaseConnection يُرجع fail عند وجود خطأ', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null, error: { message: 'timeout' } }));
    const { checkSupabaseConnection } = await import('./checks');
    const result = await checkSupabaseConnection();
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('timeout');
  });

  it('checkAuthSession يُرجع pass عند وجود مستخدم', async () => {
    const { checkAuthSession } = await import('./checks');
    const result = await checkAuthSession();
    expect(result.status).toBe('pass');
  });

  it('checkAuthSession يُرجع fail بدون مستخدم', async () => {
    mockGetUser.mockReturnValueOnce(Promise.resolve({ data: { user: null }, error: null }) as any);
    const { checkAuthSession } = await import('./checks');
    const result = await checkAuthSession();
    expect(result.status).toBe('fail');
  });

  it('checkRealtimeChannels يُرجع info عند 0 قناة', async () => {
    mockGetChannels.mockReturnValueOnce([] as any);
    const { checkRealtimeChannels } = await import('./checks');
    const result = await checkRealtimeChannels();
    expect(result.status).toBe('info');
  });

  it('checkRealtimeChannels يُرجع pass مع عدد القنوات', async () => {
    mockGetChannels.mockReturnValueOnce(['ch1', 'ch2'] as any);
    const { checkRealtimeChannels } = await import('./checks');
    const result = await checkRealtimeChannels();
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('2');
  });
});

// ════════════════════════════════════════════════
// بطاقة 2 — المتصفح والأداء
// ════════════════════════════════════════════════

describe('checks — المتصفح والأداء', () => {
  it('checkDomNodesCount يُرجع عدد عناصر DOM', async () => {
    const { checkDomNodesCount } = await import('./checks');
    const result = await checkDomNodesCount();
    expect(result.id).toBe('perf_dom');
    expect(result.detail).toContain('عنصر');
  });

  it('checkScrollPerformance يُرجع نتيجة', async () => {
    const { checkScrollPerformance } = await import('./checks');
    const result = await checkScrollPerformance();
    expect(result.id).toBe('perf_scroll');
    expect(['pass', 'warn', 'info']).toContain(result.status);
  });

  it('checkPagePerformance يُرجع info بدون بيانات', async () => {
    const { checkPagePerformance } = await import('./checks');
    const result = await checkPagePerformance();
    expect(result.status).toBe('info');
    expect(result.detail).toContain('سيتوفر');
  });

  it('checkPagePerformance يكشف الصفحات البطيئة', async () => {
    const { getPagePerfSummaries } = await import('@/lib/monitoring');
    vi.mocked(getPagePerfSummaries).mockReturnValueOnce([
      { path: '/slow', label: 'بطيئة', avgMs: 3000, count: 5, maxMs: 3500, minMs: 2500, lastMs: 3000 },
    ]);
    const { checkPagePerformance } = await import('./checks');
    const result = await checkPagePerformance();
    expect(result.status).toBe('warn');
    expect(result.detail).toContain('بطيئة');
  });
});

// ════════════════════════════════════════════════
// بطاقة 3 — التخزين
// ════════════════════════════════════════════════

describe('checks — التخزين', () => {
  it('checkLocalStorage يُرجع pass', async () => {
    const { checkLocalStorage } = await import('./checks');
    const result = await checkLocalStorage();
    expect(result.status).toBe('pass');
    expect(result.id).toBe('storage_local');
  });

  it('checkSessionStorage يُرجع pass', async () => {
    const { checkSessionStorage } = await import('./checks');
    const result = await checkSessionStorage();
    expect(result.status).toBe('pass');
  });

  it('checkStorageIntegrity يتحقق من القراءة/الكتابة', async () => {
    const { checkStorageIntegrity } = await import('./checks');
    const result = await checkStorageIntegrity();
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('تعمل');
  });

  it('checkErrorLogQueue يُرجع pass عندما الطابور فارغ', async () => {
    localStorage.removeItem('error_log_queue');
    const { checkErrorLogQueue } = await import('./checks');
    const result = await checkErrorLogQueue();
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('فارغ');
  });

  it('checkErrorLogQueue يُرجع warn عند وجود أخطاء', async () => {
    localStorage.setItem('error_log_queue', JSON.stringify([
      { error_message: 'خطأ ما', logged_at: new Date().toISOString() },
    ]));
    const { checkErrorLogQueue } = await import('./checks');
    const result = await checkErrorLogQueue();
    expect(result.status).toBe('warn');
    expect(result.detail).toContain('1');
    localStorage.removeItem('error_log_queue');
  });

  it('checkErrorLogQueue يُنظف أخطاء الاختبارات', async () => {
    localStorage.setItem('error_log_queue', JSON.stringify([
      { error_message: 'Test explosion', logged_at: new Date().toISOString() },
    ]));
    const { checkErrorLogQueue } = await import('./checks');
    const result = await checkErrorLogQueue();
    expect(result.status).toBe('pass');
    localStorage.removeItem('error_log_queue');
  });
});

// ════════════════════════════════════════════════
// بطاقة 4 — الأمان
// ════════════════════════════════════════════════

describe('checks — الأمان', () => {
  it('checkClipboardAPI يُرجع pass/info', async () => {
    const { checkClipboardAPI } = await import('./checks');
    const result = await checkClipboardAPI();
    expect(['pass', 'info']).toContain(result.status);
  });

  it('checkNotificationPermission يُرجع نتيجة', async () => {
    const { checkNotificationPermission } = await import('./checks');
    const result = await checkNotificationPermission();
    expect(['pass', 'warn', 'info']).toContain(result.status);
  });
});

// ════════════════════════════════════════════════
// بطاقة 5 — إعدادات التطبيق
// ════════════════════════════════════════════════

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

// ════════════════════════════════════════════════
// الهيكل العام
// ════════════════════════════════════════════════

describe('diagnosticCategories', () => {
  it('يحتوي 7 بطاقات و29 فحصاً (بعد الموجة 12)', async () => {
    const { diagnosticCategories } = await import('./checks');
    expect(diagnosticCategories).toHaveLength(7);
    const totalChecks = diagnosticCategories.reduce((sum, cat) => sum + cat.checks.length, 0);
    expect(totalChecks).toBe(29);
  });

  it('كل بطاقة لها عنوان وفحوصات', async () => {
    const { diagnosticCategories } = await import('./checks');
    for (const cat of diagnosticCategories) {
      expect(cat.title).toBeTruthy();
      expect(cat.checks.length).toBeGreaterThan(0);
      expect(cat.checks.every(fn => typeof fn === 'function')).toBe(true);
    }
  });
});

describe('runCategoryDiagnostics', () => {
  it('يُرجع null لبطاقة غير موجودة', async () => {
    const { runCategoryDiagnostics } = await import('./checks');
    const result = await runCategoryDiagnostics('غير موجودة');
    expect(result).toBeNull();
  });

  it('يُشغّل فحوصات بطاقة واحدة', async () => {
    const { runCategoryDiagnostics } = await import('./checks');
    const result = await runCategoryDiagnostics('إعدادات التطبيق');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('إعدادات التطبيق');
    expect(result!.results.length).toBe(3);
  });
});
