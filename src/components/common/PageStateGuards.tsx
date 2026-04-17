/**
 * #DRY — مكونات حالة الصفحة الموحدة
 * تستبدل النمط المكرر "AlertCircle + h2 + Button retry" في 9 صفحات
 */
import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout';

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: LucideIcon;
  variant?: 'destructive' | 'warning';
  withLayout?: boolean;
}

/** بطاقة خطأ مع زر إعادة محاولة اختياري */
export function ErrorState({
  message = 'حدث خطأ أثناء تحميل البيانات',
  description,
  onRetry,
  retryLabel = 'إعادة المحاولة',
  icon: Icon = AlertCircle,
  variant = 'destructive',
  withLayout = true,
}: ErrorStateProps) {
  const colorClass = variant === 'warning' ? 'text-warning' : 'text-destructive';
  const content = (
    <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Icon className={`w-16 h-16 ${colorClass}`} />
      <h2 className="text-xl font-bold">{message}</h2>
      {description && (
        <p className="text-muted-foreground text-center max-w-md">{description}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" /> {retryLabel}
        </Button>
      )}
    </div>
  );
  return withLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}

interface EmptyPageStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  withLayout?: boolean;
}

/** بطاقة "لم يتم العثور على..." */
export function EmptyPageState({
  icon: Icon, title, description, action, withLayout = true,
}: EmptyPageStateProps) {
  const content = (
    <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Icon className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-xl font-bold">{title}</h2>
      {description && (
        <p className="text-muted-foreground text-center max-w-md">{description}</p>
      )}
      {action}
    </div>
  );
  return withLayout ? <DashboardLayout>{content}</DashboardLayout> : content;
}
