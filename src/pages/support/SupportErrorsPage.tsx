/**
 * SupportErrorsPage — الأخطاء الحيّة (client_error) لدور الدعم الفني
 */
import { lazy, Suspense } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { AlertTriangle, Loader2 } from 'lucide-react';

const RuntimeErrorsPanel = lazy(() => import('@/components/diagnostics/RuntimeErrorsPanel'));

export default function SupportErrorsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="الأخطاء الحيّة"
          icon={AlertTriangle}
          description="سجل أخطاء العميل (client_error) مع إمكانية التصدير والتنظيف"
        />
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          <RuntimeErrorsPanel />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
