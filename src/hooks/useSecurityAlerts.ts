/**
 * تنبيهات أمنية فورية عند تسجيل الدخول من جهاز جديد
 * يقارن بصمة الجهاز الحالي بسجلات الدخول السابقة
 */
import { supabase } from '@/integrations/supabase/client';
import { notifyUser, notifyAdmins } from '@/utils/notifications';
import { logger } from '@/lib/logger';

/**
 * استخلاص بصمة مختصرة للجهاز من User-Agent
 * تُستخدم للمقارنة مع سجلات الدخول السابقة
 */
const getDeviceFingerprint = (): string => {
  const ua = navigator.userAgent || '';
  // استخلاص نظام التشغيل والمتصفح فقط للمقارنة
  const osMatch = ua.match(/(Windows NT [\d.]+|Mac OS X [\d_.]+|Linux|Android [\d.]+|iPhone OS [\d_]+|iPad)/);
  const browserMatch = ua.match(/(Chrome\/[\d.]+|Firefox\/[\d.]+|Safari\/[\d.]+|Edge\/[\d.]+|OPR\/[\d.]+)/);
  return `${osMatch?.[1] || 'unknown-os'}|${browserMatch?.[1] || 'unknown-browser'}`;
};

/**
 * فحص ما إذا كان الجهاز الحالي جديداً بالنسبة للمستخدم
 * يُستدعى بعد تسجيل الدخول بنجاح
 */
export const checkNewDeviceLogin = async (userId: string, userEmail?: string): Promise<void> => {
  try {
    const currentFingerprint = getDeviceFingerprint();

    // جلب بصمات الأجهزة السابقة من سجل الوصول
    const { data: previousLogins, error } = await supabase
      .from('access_log')
      .select('device_info')
      .eq('user_id', userId)
      .eq('event_type', 'login_success')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('فشل جلب سجلات الدخول السابقة:', error);
      return;
    }

    // استخلاص بصمات الأجهزة السابقة
    const previousFingerprints = new Set(
      (previousLogins || [])
        .filter(log => log.device_info)
        .map(log => {
          const ua = log.device_info || '';
          const osMatch = ua.match(/(Windows NT [\d.]+|Mac OS X [\d_.]+|Linux|Android [\d.]+|iPhone OS [\d_]+|iPad)/);
          const browserMatch = ua.match(/(Chrome\/[\d.]+|Firefox\/[\d.]+|Safari\/[\d.]+|Edge\/[\d.]+|OPR\/[\d.]+)/);
          return `${osMatch?.[1] || 'unknown-os'}|${browserMatch?.[1] || 'unknown-browser'}`;
        })
    );

    // إذا لم تكن هناك سجلات سابقة (أول تسجيل دخول)، لا نرسل تنبيه
    if (previousFingerprints.size === 0) return;

    // إذا كان الجهاز موجوداً في السجلات السابقة، لا تنبيه
    if (previousFingerprints.has(currentFingerprint)) return;

    // جهاز جديد — إرسال تنبيه للمستخدم
    const [os, browser] = currentFingerprint.split('|');
    const deviceDesc = `${os} - ${browser}`.replace(/[/|_]/g, ' ');

    notifyUser(
      userId,
      '🔒 تسجيل دخول من جهاز جديد',
      `تم تسجيل الدخول من جهاز جديد: ${deviceDesc}. إذا لم تكن أنت، يرجى تغيير كلمة المرور فوراً.`,
      'warning',
      '/beneficiary/settings',
    );

    // إشعار الناظر أيضاً
    notifyAdmins(
      '🔒 تسجيل دخول مشبوه',
      `المستخدم ${userEmail || userId} سجّل الدخول من جهاز جديد: ${deviceDesc}`,
      'warning',
      '/dashboard/audit',
    );

    logger.info('[Security] تم اكتشاف تسجيل دخول من جهاز جديد:', currentFingerprint);
  } catch (err) {
    // فشل صامت — لا يجب أن يعيق تسجيل الدخول
    logger.error('[Security] فشل فحص الجهاز الجديد:', err);
  }
};
