/**
 * منطق معالجة أخطاء WebAuthn.
 * موضوع في constants/auth لأنه يمثل سلوكًا/ثوابت مشتركة خارج دورة حياة hooks.
 */
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { logAccessEvent } from '@/lib/accessLog';

const getErrorDetails = (err: unknown) => ({
  name: err instanceof DOMException || err instanceof Error ? err.name : '',
  message: err instanceof Error ? err.message : '',
});

const hasNavigator = () => typeof navigator !== 'undefined';

/** تسجيل حدث بصمة في سجل الوصول */
export const logBiometricEvent = (
  eventType: 'login_success' | 'login_failed',
  action: string,
  metadata?: Record<string, unknown>,
) => {
  logAccessEvent({
    event_type: eventType,
    metadata: { login_method: 'biometric', action, ...metadata },
  });
};

/** معالجة أخطاء التسجيل */
export const handleRegistrationError = (
  err: unknown,
  retryFn?: () => void,
) => {
  const { name, message } = getErrorDetails(err);
  const errMessage = message || 'خطأ غير معروف';
  logger.error('WebAuthn registration error:', errMessage, err);

  if (name === 'NotAllowedError') {
    if (errMessage.toLowerCase().includes('timeout')) {
      logBiometricEvent('login_failed', 'register', { reason: 'timeout' });
      toast.error('انتهت مهلة تسجيل البصمة. أعد المحاولة وثبّت الإصبع/الوجه حتى الاكتمال', {
        action: retryFn ? { label: 'إعادة المحاولة', onClick: retryFn } : undefined,
      });
    } else {
      logBiometricEvent('login_failed', 'register', { reason: 'not_allowed' });
      toast.error('تعذّر إكمال تسجيل البصمة. تأكد من:\n• تفعيل البصمة/الوجه في إعدادات جهازك\n• السماح للمتصفح بالوصول للمستشعر البيومتري');
    }
  } else if (name === 'SecurityError') {
    logBiometricEvent('login_failed', 'register', { reason: 'security_error' });
    toast.error('خطأ أمني: تأكد من استخدام اتصال آمن (HTTPS)');
  } else if (name === 'InvalidStateError') {
    logBiometricEvent('login_failed', 'register', { reason: 'already_registered' });
    toast.error('هذا الجهاز مسجل مسبقاً');
  } else if (name === 'AbortError') {
    logBiometricEvent('login_failed', 'register', { reason: 'aborted' });
    toast.error('تم إلغاء عملية تسجيل البصمة');
  } else if (errMessage.toLowerCase().includes('network') || errMessage.toLowerCase().includes('fetch')) {
    logBiometricEvent('login_failed', 'register', { reason: 'network_error' });
    toast.error('خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت وأعد المحاولة', {
      action: retryFn ? { label: 'إعادة المحاولة', onClick: retryFn } : undefined,
    });
  } else {
    logBiometricEvent('login_failed', 'register', { reason: 'unknown', error_name: name });
    toast.error('حدث خطأ أثناء تسجيل البصمة. أعد المحاولة أو تواصل مع الدعم الفني');
  }
};

/** معالجة أخطاء المصادقة */
export const handleAuthenticationError = (err: unknown) => {
  const { name, message: errMessage } = getErrorDetails(err);
  logger.error('WebAuthn authentication error:', errMessage || 'خطأ غير معروف', err);

  if (name === 'NotAllowedError') {
    if (errMessage.toLowerCase().includes('timeout')) {
      logBiometricEvent('login_failed', 'authenticate', { reason: 'timeout' });
      toast.error('انتهت مهلة المصادقة بالبصمة. أعد المحاولة');
    } else {
      logBiometricEvent('login_failed', 'authenticate', { reason: 'cancelled' });
      toast.error('تم إلغاء عملية البصمة');
    }
  } else if (name === 'AbortError') {
    logBiometricEvent('login_failed', 'authenticate', { reason: 'aborted' });
    toast.error('تم إلغاء عملية المصادقة بالبصمة');
  } else if (errMessage.toLowerCase().includes('network') || errMessage.toLowerCase().includes('fetch')) {
    logBiometricEvent('login_failed', 'authenticate', { reason: 'network_error' });
    toast.error('خطأ في الاتصال. تحقق من الإنترنت وأعد المحاولة');
  } else {
    logBiometricEvent('login_failed', 'authenticate', { reason: 'unknown', error_name: name });
    toast.error('حدث خطأ أثناء المصادقة بالبصمة. أعد المحاولة أو سجّل الدخول بكلمة المرور');
  }
};

export function getDeviceName(): string {
  if (!hasNavigator()) return 'جهاز غير معروف';

  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'جهاز Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'جهاز غير معروف';
}
