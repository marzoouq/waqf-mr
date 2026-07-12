/**
 * صفحة موافقة OAuth الخاصة بـ MCP — يستهلكها Supabase Auth بعد تسجيل الدخول.
 * تعرض اسم العميل والتفاصيل ثم توافق/ترفض. المنطق كامل في useOAuthConsent
 * لعزل الصفحة عن استيراد عميل supabase مباشرة (CoreModV7).
 * المسار: /.lovable/oauth/consent?authorization_id=...
 */
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { useOAuthConsent } from '@/hooks/page/auth/useOAuthConsent';

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const { details, error, busy, decide } = useOAuthConsent(authorizationId);

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
