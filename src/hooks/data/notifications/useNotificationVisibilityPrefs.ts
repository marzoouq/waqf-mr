/**
 * useNotificationVisibilityPrefs
 *
 * يقرأ تفضيلات إخفاء أنواع الإشعارات للمستفيد من localStorage،
 * ويتزامن تلقائياً مع تغييرات النافذة والتبويبات الأخرى.
 *
 * مستخرج من useNotifications.ts ضمن خطة مراجعة المعمارية (M1).
 * يفصل مسؤولية التخزين/أحداث المتصفح عن طبقة بيانات Supabase.
 */
import { useEffect, useState } from 'react';
import { safeGet } from '@/lib/storage';
import { NOTIF_PREFS_KEY } from '@/constants/notificationTones';

/** ربط مفاتيح تفضيلات المستفيد بأنواع الإشعارات */
const PREF_TYPE_MAP: Record<string, string> = {
  distributions: 'payment',
  contracts: 'warning',
  messages: 'message',
};

/** يقرأ الأنواع المعطّلة من localStorage */
const readDisabledTypes = (): Set<string> => {
  try {
    const stored = safeGet<string>(NOTIF_PREFS_KEY, '');
    if (!stored) return new Set();
    const prefs = JSON.parse(stored);
    const disabled = new Set<string>();
    for (const [prefKey, notifType] of Object.entries(PREF_TYPE_MAP)) {
      if (prefs[prefKey] === false) disabled.add(notifType);
    }
    return disabled;
  } catch {
    return new Set();
  }
};

/**
 * يُعيد مجموعة أنواع الإشعارات المعطّلة حالياً للمستفيد،
 * ويتحدّث تلقائياً عند تغيير التفضيلات في أي تبويب.
 */
export const useNotificationVisibilityPrefs = (): Set<string> => {
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(() => readDisabledTypes());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === NOTIF_PREFS_KEY) setDisabledTypes(readDisabledTypes());
    };
    const handleCustom = () => setDisabledTypes(readDisabledTypes());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('notif-prefs-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('notif-prefs-changed', handleCustom);
    };
  }, []);

  return disabledTypes;
};
