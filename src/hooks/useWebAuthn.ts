import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BIOMETRIC_ENABLED_KEY = 'waqf_biometric_enabled';

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
    setIsEnabled(localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true');
  }, []);

  // جلب بيانات الاعتماد المسجلة
  const fetchCredentials = useCallback(async () => {
    const { data } = await supabase
      .from('webauthn_credentials')
      .select('id, device_name, created_at')
      .order('created_at', { ascending: false });
    setCredentials(data || []);
    return data || [];
  }, []);

  // تسجيل بصمة جديدة
  const registerBiometric = useCallback(async (deviceName?: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('يرجى تسجيل الدخول أولاً');
        return false;
      }

      // 1. طلب خيارات التسجيل من الخادم
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (optErr || !options) {
        console.error('WebAuthn register-options error:', optErr, options);
        toast.error('فشل في بدء عملية التسجيل');
        return false;
      }

      // التحقق من وجود خطأ في الاستجابة
      if (options.error) {
        console.error('WebAuthn register-options server error:', options.error);
        toast.error(options.error || 'فشل في بدء عملية التسجيل');
        return false;
      }

      // 2. تشغيل مطالبة البصمة في المتصفح
      const credential = await startRegistration({ optionsJSON: options });

      // 3. إرسال النتيجة للتحقق
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-verify', credential, deviceName: deviceName || getDeviceName() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (verErr || !result?.verified) {
        toast.error('فشل في تسجيل البصمة');
        return false;
      }

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      await fetchCredentials();
      toast.success('تم تسجيل البصمة بنجاح! يمكنك الآن تسجيل الدخول بها');
      return true;
    } catch (err: any) {
      console.error('WebAuthn registration error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('تم إلغاء عملية البصمة من قبل المستخدم');
      } else if (err.name === 'SecurityError') {
        toast.error('خطأ أمني: تأكد من استخدام اتصال آمن (HTTPS)');
      } else if (err.name === 'InvalidStateError') {
        toast.error('هذا الجهاز مسجل مسبقاً');
      } else {
        toast.error(`حدث خطأ أثناء تسجيل البصمة: ${err.message || 'خطأ غير معروف'}`);
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
        toast.error('فشل في بدء عملية المصادقة');
        return false;
      }

      // 2. تشغيل مطالبة البصمة
      const credential = await startAuthentication({ optionsJSON: options });

      // 3. التحقق من البصمة
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential },
      });

      if (verErr || !result?.verified) {
        toast.error('فشل في التحقق من البصمة');
        return false;
      }

      // 4. تسجيل الدخول باستخدام OTP من الرابط السحري
      if (result.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: 'magiclink',
        });

        if (otpError) {
          toast.error('فشل في إنشاء الجلسة');
          return false;
        }
      }

      toast.success('تم تسجيل الدخول بالبصمة بنجاح');
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast.error('تم إلغاء عملية البصمة');
      } else {
        toast.error('حدث خطأ أثناء المصادقة بالبصمة');
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
