import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ResizeObserver polyfill
beforeAll(() => {
  (globalThis as Record<string, unknown>).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(), signUp: vi.fn(), user: null, role: null, loading: false, signOut: vi.fn(),
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
  },
}));
vi.mock('@/hooks/useAccessLog', () => ({ logAccessEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

import Auth from './Auth';

describe('Auth page', () => {
  it('يرندر بنجاح بدون أخطاء', () => {
    const { container } = render(<Auth />);
    expect(container).not.toBeNull();
  });
});
