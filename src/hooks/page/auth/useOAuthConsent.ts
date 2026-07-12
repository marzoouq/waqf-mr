/**
 * Hook لصفحة موافقة OAuth (MCP) — يعزل استدعاءات supabase عن طبقة الصفحة
 * (CoreModV7). يوفر تفاصيل الطلب + دالة قرار (موافقة/رفض) + حالة تحميل/خطأ.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type OAuthClient = { name?: string; client_name?: string; client_uri?: string; logo_uri?: string };
export type OAuthDetails = { client?: OAuthClient; redirect_uri?: string; scope?: string; redirect_url?: string; redirect_to?: string };
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function oauthApi(): OAuthNamespace | null {
  const authObj = supabase.auth as unknown as { oauth?: OAuthNamespace };
  return authObj.oauth ?? null;
}

export interface UseOAuthConsentResult {
  details: OAuthDetails | null;
  error: string | null;
  busy: boolean;
  decide: (approve: boolean) => Promise<void>;
}

export function useOAuthConsent(authorizationId: string): UseOAuthConsentResult {
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) { setError('معرّف الطلب غير موجود'); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?from=' + encodeURIComponent(next);
        return;
      }
      const api = oauthApi();
      if (!api) { setError('واجهة OAuth غير متاحة في هذا الإصدار'); return; }
      const { data, error: err } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) { setError(err.message); return; }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })().catch((e) => {
      logger.error('OAuthConsent: getAuthorizationDetails failed', e);
      if (active) setError('تعذّر تحميل تفاصيل الطلب');
    });
    return () => { active = false; };
  }, [authorizationId]);

  const decide = useCallback(async (approve: boolean) => {
    const api = oauthApi();
    if (!api) return;
    setBusy(true);
    try {
      const { data, error: err } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (err) { setError(err.message); setBusy(false); return; }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setError('لم يُرجع الخادم عنوان إعادة توجيه'); setBusy(false); return; }
      window.location.href = target;
    } catch (e) {
      logger.error('OAuthConsent: decide failed', e);
      setError('فشل إرسال القرار');
      setBusy(false);
    }
  }, [authorizationId]);

  return { details, error, busy, decide };
}
