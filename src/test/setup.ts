import "@testing-library/jest-dom";
import { vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// ─── ResizeObserver polyfill ───
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// ─── موك افتراضي لـ useAuth — قابل للتجاوز بـ mockReturnValue ───
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

/** دالة useAuth العالمية — يمكن تجاوزها في أي اختبار عبر mockReturnValue */
export const mockUseAuth = vi.fn(() => defaultAuthMock);

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── matchMedia polyfill ───
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

// ─── Test helpers ───

/** إنشاء QueryClient للاختبارات بدون retry */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

/** wrapper يوفر QueryClientProvider + MemoryRouter */
export function createTestWrapper({
  queryClient,
}: { queryClient?: QueryClient } = {}) {
  const qc = queryClient ?? createTestQueryClient();
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}
