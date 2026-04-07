/**
 * إعداد أنواع أحداث سجل الوصول — مشترك بين AccessLogTab و ArchiveLogTab
 */
import { AlertTriangle, CheckCircle, XCircle, LogOut } from 'lucide-react';

export const eventConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  login_failed: { label: 'فشل تسجيل الدخول', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  login_success: { label: 'تسجيل دخول ناجح', color: 'bg-success/15 text-success border-success/30', icon: CheckCircle },
  unauthorized_access: { label: 'وصول غير مصرح', color: 'bg-warning/15 text-warning border-warning/30', icon: AlertTriangle },
  idle_logout: { label: 'خروج تلقائي', color: 'bg-info/15 text-info border-info/30', icon: LogOut },
};
