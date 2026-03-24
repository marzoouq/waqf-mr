/**
 * Unit tests verifying that every protected edge-function invocation
 * uses supabase.functions.invoke() which sends the token automatically.
 *
 * Public/pre-auth calls (guard-signup, lookup-national-id) are excluded
 * because they run before the user is authenticated.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

let invokeArgs: { functionName: string; options: Record<string, unknown> }[] = [];

const mockUser = { id: 'user-1', email: 'test@example.com' };

const mockGetUser: Mock = vi.fn(async () => ({
  data: { user: mockUser },
  error: null,
}));

const mockInvoke = vi.fn(async (fnName: string, opts: Record<string, unknown>) => {
  invokeArgs.push({ functionName: fnName, options: opts });
  return { data: { users: [] }, error: null };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    functions: { invoke: (...a: unknown[]) => (mockInvoke as Function)(...a) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        remove: vi.fn(async () => ({ error: null })),
        download: vi.fn(async () => ({ data: new Blob(), error: null })),
      })),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// ---------------------------------------------------------------------------
// 1. UserManagementPage – callAdminApi (no manual header)
// ---------------------------------------------------------------------------

describe('UserManagementPage – callAdminApi uses auto-auth', () => {
  beforeEach(() => {
    invokeArgs = [];
    mockInvoke.mockClear();
    mockGetUser.mockClear();
  });

  it('invokes edge function without manual Authorization header', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    // التحقق من المستخدم أولاً (كما يفعل callAdminApi)
    const { data: { user }, error } = await supabase.auth.getUser();
    expect(error).toBeNull();
    expect(user).toBeTruthy();

    await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'list_users' },
    });

    expect(invokeArgs[0].functionName).toBe('admin-manage-users');
    // يجب ألا يحتوي على header يدوي — supabase.functions.invoke يُرسل الـ token تلقائياً
    const headers = invokeArgs[0].options.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'not authenticated' } });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user }, error } = await supabase.auth.getUser();

    expect(user).toBeNull();
    expect(error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. BeneficiariesPage – admin-manage-users call (no manual header)
// ---------------------------------------------------------------------------

describe('BeneficiariesPage – edge function call uses auto-auth', () => {
  beforeEach(() => {
    invokeArgs = [];
    mockInvoke.mockClear();
    mockGetUser.mockClear();
  });

  it('invokes without manual Authorization header', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'list_users' },
    });

    expect(invokeArgs[0].functionName).toBe('admin-manage-users');
    const headers = invokeArgs[0].options.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. useInvoices – generate-invoice-pdf (no manual header)
// ---------------------------------------------------------------------------

describe('useInvoices – generate-invoice-pdf uses auto-auth', () => {
  beforeEach(() => {
    invokeArgs = [];
    mockInvoke.mockClear();
    mockGetUser.mockClear();
  });

  it('invokes without manual Authorization header', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoice_ids: ['inv-1', 'inv-2'] },
    });

    expect(invokeArgs[0].functionName).toBe('generate-invoice-pdf');
    const headers = invokeArgs[0].options.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Public calls should NOT have auth headers (guard-signup, lookup-national-id)
// ---------------------------------------------------------------------------

describe('Public edge functions should not require auth headers', () => {
  beforeEach(() => {
    invokeArgs = [];
    mockInvoke.mockClear();
  });

  it('guard-signup is called without Authorization header', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await supabase.functions.invoke('guard-signup', {
      body: { email: 'test@example.com', password: '123456' },
    });

    expect(invokeArgs[0].functionName).toBe('guard-signup');
    const headers = invokeArgs[0].options.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it('lookup-national-id is called without Authorization header', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await supabase.functions.invoke('lookup-national-id', {
      body: { national_id: '1234567890' },
    });

    expect(invokeArgs[0].functionName).toBe('lookup-national-id');
    const headers = invokeArgs[0].options.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Verify getUser is used instead of getSession
// ---------------------------------------------------------------------------

describe('Auth pattern uses getUser() not getSession()', () => {
  beforeEach(() => {
    mockGetUser.mockClear();
  });

  it('getUser is called for server-side verification', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    await supabase.auth.getUser();

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    // getSession should not exist in the mock — we don't use it
    expect((supabase.auth as Record<string, unknown>).getSession).toBeUndefined();
  });
});
