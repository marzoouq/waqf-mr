import "@testing-library/jest-dom";
import { vi } from 'vitest';

// ─── قمع تحذيرات معروفة في بيئة الاختبار ───

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('React Router Future Flag Warning')) return;
  originalWarn(...args);
};

// قمع تحذير data-state على React.Fragment (مشكلة معروفة في Radix UI)
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('Invalid prop `data-state` supplied to `React.Fragment`')) return;
  originalError(...args);
};

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
