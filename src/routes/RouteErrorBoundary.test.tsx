import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteGuard } from './RouteErrorBoundary';
import type { ReactNode } from 'react';

// مكوّن يرمي خطأ عمداً للاختبار
function BrokenComponent(): ReactNode {
  throw new Error('Test route explosion');
}

// مكوّن سليم
function HealthyComponent() {
  return <div>محتوى سليم</div>;
}

// كتم أخطاء console.error المتوقعة من React ErrorBoundary
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

describe('RouteGuard (Route-level ErrorBoundary)', () => {
  it('يعرض المحتوى السليم بدون مشاكل', () => {
    render(<RouteGuard><HealthyComponent /></RouteGuard>);
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
  });

  it('يلتقط الخطأ ويعرض واجهة الخطأ بدلاً من سقوط التطبيق', () => {
    render(<RouteGuard><BrokenComponent /></RouteGuard>);
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
  });

  it('يعرض زر إعادة المحاولة', () => {
    render(<RouteGuard><BrokenComponent /></RouteGuard>);
    expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeInTheDocument();
  });

  it('لا يؤثر خطأ في صفحة على صفحة أخرى', () => {
    render(
      <div>
        <RouteGuard><BrokenComponent /></RouteGuard>
        <RouteGuard><HealthyComponent /></RouteGuard>
      </div>
    );
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
  });

  it('يعرض تفاصيل الخطأ في وضع التطوير', () => {
    render(<RouteGuard><BrokenComponent /></RouteGuard>);
    expect(screen.getByText(/Test route explosion/)).toBeInTheDocument();
  });
});
