/**
 * غلاف ErrorBoundary على مستوى المسار — يعزل أخطاء كل صفحة
 * بحيث لا يسقط التطبيق بالكامل عند حدوث خطأ في صفحة واحدة.
 */
import { ReactNode } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export function RouteGuard({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
