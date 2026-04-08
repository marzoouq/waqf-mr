import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { reportClientError } from '@/lib/errorReporter';

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

    try {
      // في الإنتاج: إرسال رسالة الخطأ فقط بدون مسارات الملفات الداخلية
      const sanitizeStack = (stack: string | undefined): string | null => {
        if (!stack) return null;
        if (import.meta.env.PROD) {
          return stack.split('\n').slice(0, 1).join('').slice(0, 200);
        }
        return stack.slice(0, 1000);
      };

      reportClientError({
        error_name: error.name,
        error_message: error.message,
        error_stack: sanitizeStack(error.stack),
        component_stack: import.meta.env.PROD ? null : errorInfo.componentStack?.slice(0, 500) ?? null,
        url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
        timestamp: new Date().toISOString(),
      });
    } catch { /* silent — don't break the error boundary */ }
  }

  private resetAttempts = 0;
  private resetTimerId: ReturnType<typeof setTimeout> | null = null;

  // كشف أخطاء تحميل الملفات المجزأة (chunk errors)
  private isChunkError(): boolean {
    const msg = this.state.error?.message ?? '';
    return msg.includes('Failed to fetch dynamically imported module') ||
           msg.includes('Loading chunk') ||
           msg.includes('Importing a module script failed') ||
           msg.includes('Unable to preload CSS');
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
    if (this.resetTimerId) clearTimeout(this.resetTimerId);
    this.resetTimerId = setTimeout(() => { this.resetAttempts = 0; this.resetTimerId = null; }, 30_000);
  };

  componentWillUnmount() {
    if (this.resetTimerId) clearTimeout(this.resetTimerId);
  }

  render() {
    if (this.state.hasError) {
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
