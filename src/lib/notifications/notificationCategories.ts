/**
 * فئات تصنيف الإشعارات (نص فقط — لا أيقونات JSX)
 *
 * مُستخرَج من `components/notifications/notificationConstants.ts` ليكون
 * متاحاً لطبقة hooks دون استيراد من components.
 */

export interface NotificationCategory {
  id: string;
  label: string;
  types: string[];
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { id: 'all', label: 'الكل', types: [] },
  { id: 'financial', label: 'مالية', types: ['payment', 'distribution', 'success'] },
  { id: 'contracts', label: 'عقود', types: ['contract', 'warning'] },
  { id: 'system', label: 'نظام', types: ['system', 'error', 'info'] },
  { id: 'messages', label: 'رسائل', types: ['message'] },
];
