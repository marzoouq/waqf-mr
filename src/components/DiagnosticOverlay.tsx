/**
 * زر عائم لتشخيص النظام — يظهر فقط للمسؤول
 */
import { lazy, Suspense, useState } from 'react';
import { Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const SystemDiagnosticsPage = lazy(() => import('@/pages/dashboard/SystemDiagnosticsPage'));

export default function DiagnosticOverlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* زر عائم */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 left-4 z-[60] rounded-full w-10 h-10 shadow-lg bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary/10 print:hidden"
        onClick={() => setOpen(true)}
        title="تشخيص النظام"
      >
        <Activity className="w-5 h-5 text-primary" />
      </Button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              تشخيص النظام
            </DialogTitle>
          </DialogHeader>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }>
              {open && <SystemDiagnosticsPage autoRun={false} />}
            </Suspense>
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    </>
  );
}
