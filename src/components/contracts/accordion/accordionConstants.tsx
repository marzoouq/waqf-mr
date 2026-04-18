/**
 * ثوابت/أيقونات حالة العقود والفواتير — مُستخرَجة من AccordionParts لـ HMR
 * (.tsx لأن invoiceStatusIcon يحتوي JSX)
 */
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-success/20 text-success border-success/30' },
  expired: { label: 'منتهي', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  pending: { label: 'معلق', className: 'bg-warning/20 text-warning border-warning/30' },
};

export const invoiceStatusIcon: Record<string, React.ReactNode> = {
  paid: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  pending: <Clock className="w-3.5 h-3.5 text-warning" />,
  overdue: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  partially_paid: <Clock className="w-3.5 h-3.5 text-info" />,
};

export const invoiceStatusLabel: Record<string, string> = {
  paid: 'مسددة',
  pending: 'معلقة',
  overdue: 'متأخرة',
  partially_paid: 'جزئية',
};
