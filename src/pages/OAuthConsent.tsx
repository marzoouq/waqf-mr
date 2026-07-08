/**
 * صفحة موافقة OAuth الخاصة بـ MCP — يستهلكها Supabase Auth بعد
 * تسجيل الدخول. تعرض اسم العميل والتفاصيل ثم توافق/ترفض.
 * المسار: /.lovable/oauth/consent?authorization_id=...
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

// وصول typed لواجهة supabase.auth.oauth (beta) بدون تعديل ملف العميل التلقائي.
type OAuthClient = { name?: string; client_name?: string; client_uri?: string; logo_uri?: string };
type OAuthDetails = { client?: OAuthClient; redirect_uri?: string; scope?: string; redirect_url?: string; redirect_to?: string };
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

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
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

  async function decide(approve: boolean) {
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
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'التطبيق الخارجي';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>ربط تطبيق خارجي بحسابك</CardTitle>
          <CardDescription>مصادقة MCP — وقف مرزوق بن علي الثبيتي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!details && !error && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {details && (
            <>
              <div className="space-y-2 text-sm">
                <p>
                  سيتمكّن <span className="font-semibold">{clientName}</span> من استدعاء
                  أدوات MCP الخاصة بهذا التطبيق نيابةً عنك، وبنفس صلاحياتك.
                </p>
                {details.client?.client_uri && (
                  <a href={details.client.client_uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    {details.client.client_uri} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <p className="text-xs text-muted-foreground pt-2">
                  لا يتجاوز هذا الربط سياسات الصلاحيات (RLS) — يبقى وصول التطبيق مقيّداً بدورك.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'الموافقة والربط'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={busy}>
                  رفض
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
