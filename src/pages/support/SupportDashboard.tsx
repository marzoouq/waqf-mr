/**
 * SupportDashboard — نظرة عامة للدعم الفني
 * يعيد استخدام SupportDashboardPage الموجود (نفس المكوّنات).
 */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const SupportDashboardPage = lazy(() => import('@/pages/dashboard/SupportDashboardPage'));

export default function SupportDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SupportDashboardPage />
    </Suspense>
  );
}
