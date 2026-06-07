/**
 * AuditModeOverlay — overlay قابل للطي يظهر فقط في وضع التدقيق (?audit=1).
 * يعرض حالة Realtime/SW/QueryClient/PDF chunks بشكل حي.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { collectAuditSignals, type AuditSignals } from '@/lib/diagnostics/collectAuditSignals';

const REFRESH_MS = 1500;

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`}
      aria-hidden
    />
  );
}

export default function AuditModeOverlay() {
  const [signals, setSignals] = useState<AuditSignals | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const tick = () => setSignals(collectAuditSignals());
    tick();
    const id = window.setInterval(tick, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!signals?.auditActive) return null;

  const totalPdfKb = signals.pdfChunks.reduce((s, c) => s + c.sizeKb, 0);

  return (
    <div
      dir="rtl"
      className="fixed bottom-3 left-3 z-[60] max-w-xs rounded-lg border border-border bg-card/95 backdrop-blur shadow-lg text-xs"
      role="status"
      aria-label="مؤشر وضع التدقيق"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          وضع التدقيق نشط
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 text-muted-foreground border-t border-border/50 pt-2">
          <div className="flex items-center gap-2">
            <StatusDot ok={signals.realtime.disabled} />
            <span>Realtime: <span className="text-foreground">{signals.realtime.reason}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={!signals.sw.registered} />
            <span>SW: <span className="text-foreground">{signals.sw.refusalReason ?? 'مسجَّل'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={signals.queryClient.elevated} />
            <span>QueryClient stale: <span className="text-foreground">{signals.queryClient.staleMinutes} دقيقة</span></span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={signals.polling.stopped} />
            <span>Polling: <span className="text-foreground">{signals.polling.reason}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={signals.pdfChunks.length === 0} />
            <span>PDF chunks: <span className="text-foreground">{signals.pdfChunks.length} ({totalPdfKb}KB)</span></span>
          </div>
          <Link
            to="/dashboard/diagnostics"
            className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
          >
            افتح مركز التشخيص <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
