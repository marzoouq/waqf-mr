import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteGuard } from './RouteErrorBoundary';

// مكوّن يرمي خطأ عمداً للاختبار
function BrokenComponent() {
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
    expect(screen.queryByText('محتوى سليم')).not.toBeInTheDocument();
  });

  it('يعرض زر إعادة المحاولة', () => {
    render(<RouteGuard><BrokenComponent /></RouteGuard>);
    expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeInTheDocument();
  });

  it('لا يؤثر خطأ في صفحة على صفحة أخرى', () => {
    const { unmount } = render(
      <div>
        <RouteGuard><BrokenComponent /></RouteGuard>
        <RouteGuard><HealthyComponent /></RouteGuard>
      </div>
    );
    // الصفحة المكسورة تعرض خطأ
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    // الصفحة السليمة تبقى تعمل
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
    unmount();
  });

  it('يعرض تفاصيل الخطأ في وضع التطوير', () => {
    render(<RouteGuard><BrokenComponent /></RouteGuard>);
    // في بيئة الاختبار (DEV=true) يجب أن تظهر رسالة الخطأ
    expect(screen.getByText(/Test route explosion/)).toBeInTheDocument();
  });
});
