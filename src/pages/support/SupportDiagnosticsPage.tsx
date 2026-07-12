/**
 * SupportDiagnosticsPage — مركز التشخيص المتاح لدور الدعم الفني
 * يعيد استخدام SystemDiagnosticsPage نفسه (لا نسخ).
 */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';

const SystemDiagnosticsPage = lazy(() => import('@/pages/dashboard/SystemDiagnosticsPage'));

export default function SupportDiagnosticsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <SystemDiagnosticsPage autoRun={false} />
      </Suspense>
    </DashboardLayout>
  );
}
