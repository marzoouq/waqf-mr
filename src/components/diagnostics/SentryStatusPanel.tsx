/**
 * لوحة Sentry — حالة التكامل، ضبط DSN، وإرسال حدث تجريبي.
 * يُخزَّن DSN في `app_settings` بالمفتاح `sentry_dsn`.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bug, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { initSentry, isSentryActive, sendSentryTestEvent } from '@/lib/monitoring/sentry';
import { logger } from '@/lib/logger';

export default function SentryStatusPanel() {
  const { data: settings, updateSetting } = useAppSettings();
  const savedDsn = settings?.sentry_dsn ?? '';
  const [draft, setDraft] = useState<string | null>(null);
  const dsn = draft ?? savedDsn;
  const setDsn = (value: string) => setDraft(value);
  const [active, setActive] = useState(isSentryActive());

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'sentry_dsn', value: dsn.trim() });
      if (dsn.trim()) {
        const ok = await initSentry(dsn.trim());
        setActive(ok);
        toast.success(ok ? 'تم حفظ DSN وتفعيل Sentry' : 'تم الحفظ — سيُفعّل عند إعادة التحميل');
      } else {
        toast.success('تم إلغاء ربط Sentry (سيتوقف عند إعادة التحميل)');
      }
    } catch (e) {
      logger.error('[sentry] فشل حفظ DSN:', e);
      toast.error('فشل حفظ الإعداد');
    }
  };

  const handleTest = () => {
    if (sendSentryTestEvent()) {
      toast.success('أُرسل حدث تجريبي إلى Sentry');
    } else {
      toast.error('Sentry غير مفعّل — احفظ DSN صحيحاً أولاً');
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bug className="h-4 w-4" /> تكامل Sentry
        </CardTitle>
        <Badge variant={active ? 'default' : 'secondary'}>{active ? 'مفعّل' : 'غير مفعّل'}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="sentry-dsn">Sentry DSN</label>
          <Input
            id="sentry-dsn"
            className="font-mono text-xs"
            placeholder="https://xxxx@oXXXX.ingest.sentry.io/XXXX"
            value={dsn}
            onChange={(e) => setDsn(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void handleSave()} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 ml-1" /> حفظ وتفعيل
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={!active}>
            <Send className="h-4 w-4 ml-1" /> إرسال حدث تجريبي
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          عند التفعيل تُرسَل كل الاستثناءات غير المتوقعة تلقائياً إلى Sentry مع تنبيهات فورية،
          بدون أي بيانات شخصية (لا بريد ولا عنوان IP)، وتُسجَّل أيضاً في سجل الأخطاء الحيّة داخل النظام.
        </p>
      </CardContent>
    </Card>
  );
}
