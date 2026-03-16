import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);

    // Report to server via logAccessEvent RPC + structured metadata
    try {
      const metadata = {
        error_name: error.name,
        error_message: error.message,
        component_stack: errorInfo.componentStack?.slice(0, 500),
        url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
        timestamp: new Date().toISOString(),
      };

      supabase.rpc('log_access_event', {
        p_event_type: 'client_error',
        p_target_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        p_device_info: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
        p_metadata: metadata,
      }).then(() => { /* reported */ }, () => {
        // Supabase unavailable — persist locally as fallback
        try {
          const queue = JSON.parse(localStorage.getItem('error_log_queue') || '[]');
          queue.push({ ...metadata, logged_at: new Date().toISOString() });
          if (queue.length > 20) queue.shift();
          localStorage.setItem('error_log_queue', JSON.stringify(queue));
        } catch { /* storage full or unavailable */ }
      });
    } catch { /* silent — don't break the error boundary */ }
  }

  private resetAttempts = 0;

  // كشف أخطاء تحميل الملفات المجزأة (chunk errors)
  private isChunkError(): boolean {
    const msg = this.state.error?.message ?? '';
    return msg.includes('Failed to fetch dynamically imported module') ||
           msg.includes('Loading chunk');
  }

  // تحديث التطبيق: مسح كاش الأصول + إعادة تحميل
  handleForceRefresh = async () => {
    try {
      await caches.delete('static-assets');
    } catch { /* الكاش غير متاح */ }
    window.location.reload();
  };

  handleReset = () => {
    this.resetAttempts++;
    if (this.resetAttempts >= 2) {
      window.location.href = '/';
      return;
    }
    this.setState({ hasError: false, error: null });
    // إعادة ضبط العداد بعد 30 ثانية لتجنب الحظر الدائم
    setTimeout(() => { this.resetAttempts = 0; }, 30_000);
  };

  render() {
    if (this.state.hasError) {
      // واجهة مخصصة لأخطاء تحميل الملفات (تحديث جديد متاح)
      if (this.isChunkError()) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">يوجد تحديث جديد للتطبيق</h1>
              <p className="text-muted-foreground">
                تم إصدار نسخة جديدة من التطبيق. يرجى تحديث الصفحة للحصول على أحدث إصدار.
              </p>
              <Button onClick={this.handleForceRefresh} className="gradient-primary">
                <RefreshCw className="w-4 h-4 ml-2" />
                تحديث التطبيق
              </Button>
            </div>
          </div>
        );
      }

      // الواجهة العامة للأخطاء الأخرى
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">حدث خطأ غير متوقع</h1>
            {import.meta.env.DEV && this.state.error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-md p-3 font-mono break-all" dir="ltr">
                [{this.state.error.name}: {this.state.error.message}]
              </p>
            )}
            <p className="text-muted-foreground">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>
            <Button onClick={this.handleReset} className="gradient-primary">
              {this.resetAttempts >= 1 ? 'العودة للصفحة الرئيسية' : 'إعادة المحاولة'}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;