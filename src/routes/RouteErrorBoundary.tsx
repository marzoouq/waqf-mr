/**
 * غلاف ErrorBoundary على مستوى المسار — يعزل أخطاء كل صفحة
 * بحيث لا يسقط التطبيق بالكامل عند حدوث خطأ في صفحة واحدة.
 */
import { ErrorBoundary } from '@/components/common';
import { ReactNode } from 'react';

export function RouteGuard({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
