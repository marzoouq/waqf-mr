import "@testing-library/jest-dom";
import { vi } from 'vitest';

// ─── بيئة Supabase افتراضية للاختبارات ───
// تمنع فشل createClient عند استيراد وحدات تعتمد على client بشكل مبكر.
vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// ─── قمع تحذيرات معروفة في بيئة الاختبار ───

const suppressPatterns = [
  'React Router Future Flag Warning',
  'Invalid prop `data-state` supplied to `React.Fragment`',
  'useAuth called outside AuthProvider',
];

function shouldSuppress(args: unknown[]): boolean {
  const msg = args.map(a => (typeof a === 'string' ? a : '')).join(' ');
  return suppressPatterns.some(p => msg.includes(p));
}

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => { if (!shouldSuppress(args)) originalWarn(...args); };

const originalError = console.error;
console.error = (...args: unknown[]) => { if (!shouldSuppress(args)) originalError(...args); };

// ─── موك افتراضي لـ useAuth لمنع تحذير "useAuth called outside AuthProvider" ───
const defaultAuthMock = {
  user: null,
  session: null,
  role: null,
  loading: false,
  signIn: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => {}),
  refreshRole: vi.fn(async () => {}),
};

vi.mock('@/hooks/auth/useAuthContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/auth/useAuthContext')>();
  return {
    ...original,
    useAuth: () => defaultAuthMock,
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
