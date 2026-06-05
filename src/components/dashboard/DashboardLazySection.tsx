/**
 * #M10 — مكوّن مشترك يلفّ النمط المتكرر:
 * ViewportRender > [print:hidden] > ErrorBoundary > Suspense > children
 *
 * يُستخدم في `AdminDashboard` للأقسام الـ lazy المعتمدة على viewport.
 * يُستثنى من هذا النمط: أقسام `DeferredRender` (تأخير زمني لا viewport).
 */
import { Suspense, type ReactNode } from 'react';
import ErrorBoundary from '@/components/common/feedback/ErrorBoundary';
import ViewportRender from '@/components/common/ViewportRender';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardLazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  printHidden?: boolean;
}

const DashboardLazySection = ({
  children,
  fallback,
  minHeight = 200,
  rootMargin,
  printHidden = false,
}: DashboardLazySectionProps) => {
  const defaultFallback = <Skeleton className="w-full rounded-lg" style={{ height: minHeight }} />;
  const inner = (
    <ErrorBoundary>
      <Suspense fallback={fallback ?? defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
  return (
    <ViewportRender minHeight={minHeight} rootMargin={rootMargin}>
      {printHidden ? <div className="print:hidden">{inner}</div> : inner}
    </ViewportRender>
  );
};

export default DashboardLazySection;
