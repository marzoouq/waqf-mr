/**
 * ثوابت موحَّدة لنظام الدعم الفني (status/priority/category/SLA)
 * مصدر الحقيقة الوحيد — لا تكرار في components/hooks
 */
import { Clock, ArrowUpCircle, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';

export interface StatusEntry { label: string; color: string; icon: LucideIcon; }
export interface PriorityEntry { label: string; color: string; }

export const STATUS_MAP: Record<string, StatusEntry> = {
  open: { label: 'مفتوح', color: 'bg-status-approved/20 text-status-approved-foreground', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning', icon: ArrowUpCircle },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

export const PRIORITY_MAP: Record<string, PriorityEntry> = {
  low: { label: 'منخفض', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'متوسط', color: 'bg-warning/20 text-warning' },
  high: { label: 'عالي', color: 'bg-caution/20 text-caution-foreground' },
  critical: { label: 'حرج', color: 'bg-destructive/20 text-destructive' },
};

export const CATEGORY_MAP: Record<string, string> = {
  general: 'عام', technical: 'تقني', financial: 'مالي', account: 'حساب', suggestion: 'اقتراح',
};

export const SLA_HOURS: Record<string, number> = { critical: 4, high: 12, medium: 24, low: 48 };

/** الأدوار التي تستلم التذكرة حسب القسم — مطابق لدالة الخادم ticket_recipient_roles */
export type TicketRecipientRole = 'admin' | 'accountant' | 'support';

export interface CategoryRoute { roles: TicketRecipientRole[]; label: string; }

export const CATEGORY_ROUTING: Record<string, CategoryRoute> = {
  financial: { roles: ['admin', 'accountant'], label: 'ناظر الوقف والمحاسب' },
  technical: { roles: ['admin', 'support'], label: 'ناظر الوقف وفريق الدعم الفني' },
  account: { roles: ['admin', 'support'], label: 'ناظر الوقف وفريق الدعم الفني' },
  general: { roles: ['admin'], label: 'ناظر الوقف' },
  suggestion: { roles: ['admin'], label: 'ناظر الوقف' },
};

export const getTicketRecipientRoles = (category: string): TicketRecipientRole[] =>
  CATEGORY_ROUTING[category]?.roles ?? ['admin'];

export const getTicketRecipientLabel = (category: string): string =>
  CATEGORY_ROUTING[category]?.label ?? 'ناظر الوقف';

/** تسميات أدوار مرسلي الردود */
export const SENDER_ROLE_LABEL: Record<string, string> = {
  admin: 'ناظر الوقف', accountant: 'المحاسب', support: 'الدعم الفني', beneficiary: 'المستفيد', waqif: 'الواقف',
};
