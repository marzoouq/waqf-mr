/**
 * إثبات إغلاق الفجوة: حارس حجب IP يعرض شاشة المنع ويُسجّل الخروج فوراً.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import IpBlockGuard from './IpBlockGuard';

const resolveClientContext = vi.fn();
const signOut = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/monitoring/clientContext', () => ({
  resolveClientContext: (force?: boolean) => resolveClientContext(force),
}));

vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => ({ signOut }),
}));

describe('IpBlockGuard', () => {
  beforeEach(() => {
    resolveClientContext.mockReset();
    signOut.mockClear();
  });

  it('لا يعرض شيئاً عندما يكون العنوان غير محجوب', async () => {
    resolveClientContext.mockResolvedValue({ ip: '1.2.3.4', blocked: false, blockReason: null });
    const { container } = render(<IpBlockGuard />);
    await waitFor(() => expect(resolveClientContext).toHaveBeenCalled());
    expect(container.textContent).toBe('');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('يعرض شاشة المنع مع السبب ويُسجّل الخروج عند الحجب', async () => {
    resolveClientContext.mockResolvedValue({
      ip: '9.9.9.9',
      blocked: true,
      blockReason: 'محاولات دخول متكررة',
    });
    render(<IpBlockGuard />);

    expect(await screen.findByText('تم إيقاف الوصول من هذا الجهاز')).toBeInTheDocument();
    expect(screen.getByText(/محاولات دخول متكررة/)).toBeInTheDocument();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('فشل الاتصال لا يحجب المستخدم (fail-open)', async () => {
    resolveClientContext.mockResolvedValue({ ip: null, blocked: false, blockReason: null });
    const { container } = render(<IpBlockGuard />);
    await waitFor(() => expect(resolveClientContext).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
