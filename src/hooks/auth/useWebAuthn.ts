import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import {
  logBiometricEvent,
  handleRegistrationError,
  handleAuthenticationError,
  getDeviceName,
} from './webAuthnErrors';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const BIOMETRIC_ENABLED_KEY = STORAGE_KEYS.BIOMETRIC_ENABLED;

interface WebAuthnCredential { id: string; device_name: string; created_at: string; }

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
    try {
      const localEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
      setIsEnabled(localEnabled);
    } catch { setIsEnabled(false); }
    
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { count } = await supabase
        .from('webauthn_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (cancelled) return;
      const dbEnabled = (count ?? 0) > 0;
      setIsEnabled(dbEnabled);
      if (dbEnabled) {
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        const { data: creds } = await supabase
          .from('webauthn_credentials')
          .select('id, device_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!cancelled && creds) setCredentials(creds.map(c => ({ ...c, device_name: c.device_name ?? '' })));
      } else {
        localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchCredentials = useCallback(async (knownUserId?: string) => {
    const uid = knownUserId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) { setCredentials([]); return []; }

    const { data, error } = await supabase
      .from('webauthn_credentials')
      .select('id, device_name, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Failed to fetch credentials:', error.message);
      defaultNotify.error('تعذر جلب بيانات الاعتماد');
      return [];
    }

    const mapped = (data || []).map(c => ({ ...c, device_name: c.device_name ?? '' }));
    setCredentials(mapped);
    return mapped;
  }, []);

  const registerBiometric = useCallback(async (deviceName?: string) => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        defaultNotify.error('يرجى تسجيل الدخول أولاً');
        return false;
      }

      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
      });

      if (optErr || !options) {
        logger.error('WebAuthn register-options error:', optErr);
        logBiometricEvent('login_failed', 'register-options', { reason: 'server_error' });
        defaultNotify.error('فشل في بدء عملية التسجيل. تحقق من اتصالك بالإنترنت وأعد المحاولة');
        return false;
      }

      if (options.error) {
        logger.error('WebAuthn register-options server error');
        logBiometricEvent('login_failed', 'register-options', { reason: options.error });
        defaultNotify.error(options.error || 'فشل في بدء عملية التسجيل');
        return false;
      }

      const credential = await startRegistration({ optionsJSON: options });

      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-verify', credential, deviceName: (deviceName || getDeviceName()).slice(0, 100), challenge_id: options.challenge_id },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'register-verify', { reason: 'verification_failed' });
        defaultNotify.error('فشل في تسجيل البصمة');
        return false;
      }

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      await fetchCredentials();
      defaultNotify.success('تم تسجيل البصمة بنجاح! يمكنك الآن تسجيل الدخول بها');
      return true;
    } catch (err: unknown) {
      handleRegistrationError(err, () => registerBiometric(deviceName));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials]);

  const authenticateWithBiometric = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options' },
      });

      if (optErr || !options) {
        logBiometricEvent('login_failed', 'auth-options', { reason: 'server_error' });
        defaultNotify.error('فشل في بدء عملية المصادقة. تحقق من اتصالك بالإنترنت');
        return false;
      }

      const credential = await startAuthentication({ optionsJSON: options });

      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential, challenge_id: options.challenge_id },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'auth-verify', { reason: 'verification_failed' });
        defaultNotify.error('فشل في التحقق من البصمة');
        return false;
      }

      if (!result.access_token || !result.refresh_token) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'no_tokens' });
        defaultNotify.error('لم يتم استلام بيانات الجلسة. أعد المحاولة');
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'session_set_error' });
        defaultNotify.error('فشل في إنشاء الجلسة');
        return false;
      }

      logBiometricEvent('login_success', 'authenticate', {});
      defaultNotify.success('تم تسجيل الدخول بالبصمة بنجاح');
      return true;
    } catch (err: unknown) {
      handleAuthenticationError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeCredential = useCallback(async (credentialId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      defaultNotify.error('يجب تسجيل الدخول أولاً');
      return false;
    }
    const { error } = await supabase
      .from('webauthn_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', user.id);

    if (error) {
      defaultNotify.error('فشل في حذف البصمة');
      return false;
    }

    const remaining = await fetchCredentials();
    if (remaining.length === 0) {
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    }

    defaultNotify.success('تم حذف البصمة بنجاح');
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

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
  } catch { return false; }
}
