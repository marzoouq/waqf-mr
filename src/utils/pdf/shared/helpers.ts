/**
 * دوال مساعدة بسيطة (تسميات الحالة، تنظيف المسار)
 */
import { reshapeArabic as rs } from '../core/core';

export const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return rs('مسددة');
    case 'pending': return rs('قيد الانتظار');
    case 'overdue': return rs('متأخرة');
    case 'partially_paid': return rs('مسددة جزئياً');
    default: return rs(s);
  }
};

// INV-CRIT-1: sanitize مسار الملف لمنع path traversal
export const sanitizePath = (name: string) => name.replace(/[./\\]+/g, '_');
