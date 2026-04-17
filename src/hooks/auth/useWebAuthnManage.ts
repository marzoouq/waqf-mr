/**
 * هوك إدارة بيانات اعتماد WebAuthn (جلب/حذف)
 */
import { useState, useEffect, useCallback } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeGet, safeSet, safeRemove } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = STORAGE_KEYS.BIOMETRIC_ENABLED;

export interface WebAuthnCredential {
  id: string;
  device_name: string;
  created_at: string;
}

export function useWebAuthnManage() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
    const localEnabled = safeGet<string>(BIOMETRIC_ENABLED_KEY, 'false') === 'true';
    setIsEnabled(localEnabled);

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
        safeSet(BIOMETRIC_ENABLED_KEY, 'true');
        if (cancelled) return;
        const { data: creds } = await supabase
          .from('webauthn_credentials')
          .select('id, device_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (creds) setCredentials(creds.map(c => ({ ...c, device_name: c.device_name ?? '' })));
      } else {
        safeRemove(BIOMETRIC_ENABLED_KEY);
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
      safeRemove(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    }

    defaultNotify.success('تم حذف البصمة بنجاح');
    return true;
  }, [fetchCredentials]);

  return {
    isSupported, isEnabled, isLoading, credentials,
    setIsLoading, setIsEnabled,
    fetchCredentials, removeCredential,
  };
}
