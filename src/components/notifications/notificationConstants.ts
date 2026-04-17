/**
 * ثوابت وإعدادات أنواع الإشعارات
 */
import { Bell, CheckCheck, Mail, Wallet, Info, AlertTriangle, AlertCircle, FileText } from 'lucide-react';

export const NOTIFICATION_CATEGORIES: { id: string; label: string; types: string[] }[] = [
  { id: 'all', label: 'الكل', types: [] },
  { id: 'financial', label: 'مالية', types: ['payment', 'distribution', 'success'] },
  { id: 'contracts', label: 'عقود', types: ['contract', 'warning'] },
  { id: 'system', label: 'نظام', types: ['system', 'error', 'info'] },
  { id: 'messages', label: 'رسائل', types: ['message'] },
];

export const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; category: string }> = {
  info: { label: 'معلومات', icon: Info, color: 'text-info', bg: 'bg-info/10', category: 'system' },
  payment: { label: 'مالي', icon: Wallet, color: 'text-success', bg: 'bg-success/10', category: 'financial' },
  message: { label: 'رسالة', icon: Mail, color: 'text-accent-foreground', bg: 'bg-accent/10', category: 'messages' },
  warning: { label: 'تنبيه', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', category: 'contracts' },
  contract: { label: 'عقود', icon: FileText, color: 'text-info', bg: 'bg-info/10', category: 'contracts' },
  system: { label: 'نظام', icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted/30', category: 'system' },
  distribution: { label: 'توزيع', icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', category: 'financial' },
  success: { label: 'نجاح', icon: CheckCheck, color: 'text-success', bg: 'bg-success/10', category: 'financial' },
  error: { label: 'خطأ', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', category: 'system' },
};
