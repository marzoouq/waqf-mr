import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Smartphone, Trash2, Plus, Loader2, ShieldCheck, Info, Globe } from 'lucide-react';
import { useWebAuthn } from '@/hooks/useWebAuthn';

const SUPPORTED_BROWSERS = [
  { name: 'Chrome / Edge', version: '67+' },
  { name: 'Safari', version: '14+' },
  { name: 'Firefox', version: '60+' },
  { name: 'Samsung Internet', version: '12+' },
];

const BiometricSettings = () => {
  const {
    isSupported,
    isEnabled,
    isLoading,
    credentials,
    registerBiometric,
    removeCredential,
    fetchCredentials,
  } = useWebAuthn();

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  if (!isSupported) {
    return (
      <Card className="shadow-sm border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Fingerprint className="w-5 h-5" />
            تسجيل الدخول بالبصمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            متصفحك لا يدعم المصادقة البيومترية. يرجى استخدام متصفح حديث أو جهاز يدعم البصمة/التعرف على الوجه.
          </p>
          <Alert>
            <Globe className="w-4 h-4" />
            <AlertDescription className="text-xs">
              <strong>المتصفحات المدعومة:</strong>{' '}
              {SUPPORTED_BROWSERS.map((b, i) => (
                <span key={b.name}>
                  {b.name} ({b.version}){i < SUPPORTED_BROWSERS.length - 1 ? '، ' : ''}
                </span>
              ))}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Fingerprint className="w-5 h-5" />
          تسجيل الدخول بالبصمة
          {isEnabled && (
            <Badge className="bg-success/20 text-success text-[11px]">
              <ShieldCheck className="w-3 h-3 ml-1" />
              مفعّل
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          سجّل بصمة إصبعك أو وجهك لتسجيل الدخول بسرعة وأمان بدون كلمة مرور.
        </p>

        {/* تنبيهات مهمة */}
        <Alert variant="default" className="bg-muted/50">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs space-y-1">
            <p><strong>متطلبات التفعيل:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 mr-2">
              <li>تفعيل البصمة أو التعرف على الوجه في إعدادات جهازك</li>
              <li>استخدام اتصال آمن (HTTPS)</li>
              <li>متصفح حديث يدعم WebAuthn ({SUPPORTED_BROWSERS.map(b => b.name).join('، ')})</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* الأجهزة المسجلة */}
        {credentials.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">الأجهزة المسجلة:</p>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{cred.device_name || 'جهاز غير مسمى'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(cred.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeCredential(cred.id)}
                  aria-label="حذف الجهاز"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* زر إضافة بصمة جديدة */}
        <Button
          onClick={() => registerBiometric()}
          disabled={isLoading}
          className="w-full sm:w-auto gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {credentials.length > 0 ? 'إضافة جهاز آخر' : 'تسجيل البصمة'}
        </Button>

        {credentials.length === 0 && (
          <p className="text-xs text-muted-foreground">
            بعد التسجيل، ستتمكن من تسجيل الدخول مباشرة ببصمة إصبعك أو وجهك من شاشة تسجيل الدخول.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BiometricSettings;
