import type { ReactNode } from 'react';
import { RouteGuard } from './RouteErrorBoundary';

/** دالة مساعدة تلف عنصر JSX بـ RouteGuard */
export function withRouteErrorBoundary(element: ReactNode): ReactNode {
  return <RouteGuard>{element}</RouteGuard>;
}
