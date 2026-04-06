import { AlertTriangle, X } from 'lucide-react';

interface ServerErrorAlertProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * تنبيه بارز يعرض أخطاء الخادم أعلى نموذج المصادقة
 */
export default function ServerErrorAlert({ message, onDismiss }: ServerErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
        aria-label="إغلاق التنبيه"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
