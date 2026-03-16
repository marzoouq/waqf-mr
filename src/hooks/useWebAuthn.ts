import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { logAccessEvent } from '@/hooks/useAccessLog';

const BIOMETRIC_ENABLED_KEY = 'waqf_biometric_enabled';

interface WebAuthnCredential { id: string; device_name: string; created_at: string; }

/** تسجيل حدث بصمة في سجل الوصول */
const logBiometricEvent = (
  eventType: 'login_success' | 'login_failed',
  action: string,
  metadata?: Record<string, unknown>,
) => {
  logAccessEvent({
    event_type: eventType,
    metadata: { login_method: 'biometric', action, ...metadata },
  });
};

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
    // التحقق الأولي من localStorage ثم من DB
    const localEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    setIsEnabled(localEnabled);
    
    // التحقق من DB لضمان التزامن عبر الأجهزة/المتصفحات
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { count } = await supabase
        .from('webauthn_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      if (cancelled) return;
      const dbEnabled = (count ?? 0) > 0;
      setIsEnabled(dbEnabled);
      if (dbEnabled) {
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        const { data: creds } = await supabase
          .from('webauthn_credentials')
          .select('id, device_name, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!cancelled && creds) setCredentials(creds.map(c => ({ ...c, device_name: c.device_name ?? '' })));
      } else {
        localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // جلب بيانات الاعتماد المسجلة
  const fetchCredentials = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCredentials([]);
      return [];
    }

    const { data, error } = await supabase
      .from('webauthn_credentials')
      .select('id, device_name, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Failed to fetch credentials:', error.message);
      toast.error('تعذر جلب بيانات الاعتماد');
      return [];
    }

    const mapped = (data || []).map(c => ({ ...c, device_name: c.device_name ?? '' }));
    setCredentials(mapped);
    return mapped;
  }, []);

  // تسجيل بصمة جديدة
  const registerBiometric = useCallback(async (deviceName?: string) => {
    setIsLoading(true);
    try {
      // استخدام getUser بدلاً من getSession للتحقق من الخادم مباشرة (عملية حساسة)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('يرجى تسجيل الدخول أولاً');
        return false;
      }
      // جلب الجلسة للحصول على access_token فقط (بعد التحقق من صلاحية المستخدم)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول');
        return false;
      }

      // 1. طلب خيارات التسجيل من الخادم
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (optErr || !options) {
        logger.error('WebAuthn register-options error:', optErr);
        logBiometricEvent('login_failed', 'register-options', { reason: 'server_error' });
        toast.error('فشل في بدء عملية التسجيل. تحقق من اتصالك بالإنترنت وأعد المحاولة');
        return false;
      }

      // التحقق من وجود خطأ في الاستجابة
      if (options.error) {
        logger.error('WebAuthn register-options server error');
        logBiometricEvent('login_failed', 'register-options', { reason: options.error });
        toast.error(options.error || 'فشل في بدء عملية التسجيل');
        return false;
      }

      // 2. تشغيل مطالبة البصمة في المتصفح
      const credential = await startRegistration({ optionsJSON: options });

      // 3. إرسال النتيجة للتحقق — تمرير challenge_id لمنع race condition
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-verify', credential, deviceName: deviceName || getDeviceName(), challenge_id: options.challenge_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'register-verify', { reason: 'verification_failed' });
        toast.error('فشل في تسجيل البصمة');
        return false;
      }

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      await fetchCredentials();
      toast.success('تم تسجيل البصمة بنجاح! يمكنك الآن تسجيل الدخول بها');
      return true;
    } catch (err: unknown) {
      const name = err instanceof DOMException || err instanceof Error ? err.name : '';
      const errMessage = err instanceof Error ? err.message : 'خطأ غير معروف';
      logger.error('WebAuthn registration error:', errMessage, err);

      if (name === 'NotAllowedError') {
        if (errMessage.toLowerCase().includes('timeout')) {
          logBiometricEvent('login_failed', 'register', { reason: 'timeout' });
          toast.error('انتهت مهلة تسجيل البصمة. أعد المحاولة وثبّت الإصبع/الوجه حتى الاكتمال', {
            action: { label: 'إعادة المحاولة', onClick: () => registerBiometric(deviceName) },
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
          action: { label: 'إعادة المحاولة', onClick: () => registerBiometric(deviceName) },
        });
      } else {
        logBiometricEvent('login_failed', 'register', { reason: 'unknown', error_name: name });
        toast.error('حدث خطأ أثناء تسجيل البصمة. أعد المحاولة أو تواصل مع الدعم الفني');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials]);

  // تسجيل الدخول بالبصمة
  const authenticateWithBiometric = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. طلب خيارات المصادقة
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options' },
      });

      if (optErr || !options) {
        logBiometricEvent('login_failed', 'auth-options', { reason: 'server_error' });
        toast.error('فشل في بدء عملية المصادقة. تحقق من اتصالك بالإنترنت');
        return false;
      }

      // 2. تشغيل مطالبة البصمة
      const credential = await startAuthentication({ optionsJSON: options });

      // 3. التحقق من البصمة — تمرير challenge_id لمنع race condition
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential, challenge_id: options.challenge_id },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'auth-verify', { reason: 'verification_failed' });
        toast.error('فشل في التحقق من البصمة');
        return false;
      }

      // 4. تعيين الجلسة من الاستجابة مباشرة (الجلسة تُنشأ server-side)
      if (!result.access_token || !result.refresh_token) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'no_tokens' });
        toast.error('لم يتم استلام بيانات الجلسة. أعد المحاولة');
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'session_set_error' });
        toast.error('فشل في إنشاء الجلسة');
        return false;
      }

      logBiometricEvent('login_success', 'authenticate', {});
      toast.success('تم تسجيل الدخول بالبصمة بنجاح');
      return true;
    } catch (err: unknown) {
      const name = err instanceof DOMException || err instanceof Error ? err.name : '';
      const errMessage = err instanceof Error ? err.message : '';

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
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // حذف بيانات اعتماد
  const removeCredential = useCallback(async (credentialId: string) => {
    const { error } = await supabase
      .from('webauthn_credentials')
      .delete()
      .eq('id', credentialId);

    if (error) {
      toast.error('فشل في حذف البصمة');
      return false;
    }

    const remaining = await fetchCredentials();
    if (remaining.length === 0) {
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    }

    toast.success('تم حذف البصمة بنجاح');
    return true;
  }, [fetchCredentials]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    credentials,
    registerBiometric,
    authenticateWithBiometric,
    removeCredential,
    fetchCredentials,
  };
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'جهاز Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'جهاز غير معروف';
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
}
