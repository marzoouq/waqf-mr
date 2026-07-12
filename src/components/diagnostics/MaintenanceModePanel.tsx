/**
 * MaintenanceModePanel — تبويب تفعيل/إيقاف وضع الصيانة
 */
import { useEffect, useState } from 'react';
import { Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMaintenanceMode } from '@/hooks/application/useMaintenanceMode';
import { fmtDateTime } from '@/utils/format/format';
import { uiNotify } from '@/lib/notify';

export default function MaintenanceModePanel() {
  const { isActive, message, startedAt, saving, toggle } = useMaintenanceMode();
  const [draftMessage, setDraftMessage] = useState(message);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة نص محلي مع مصدر خارجي
    setDraftMessage(message);
  }, [message]);

  const handleToggle = async () => {
    try {
      await toggle(!isActive, draftMessage);
      uiNotify.success(!isActive ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
    } catch {
      uiNotify.error('فشل تحديث وضع الصيانة');
    }
  };

  const handleSaveMessage = async () => {
    try {
      await toggle(isActive, draftMessage);
      uiNotify.success('تم حفظ رسالة الصيانة');
    } catch {
      uiNotify.error('فشل حفظ الرسالة');
    }
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          وضع الصيانة
          {isActive ? (
            <Badge className="bg-amber-500 text-amber-950 mr-auto">مفعّل الآن</Badge>
          ) : (
            <Badge variant="secondary" className="mr-auto">متوقف</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-medium">عند تفعيل الصيانة:</p>
              <ul className="list-disc pr-5 space-y-0.5 text-muted-foreground">
                <li>المستفيدون والواقفون والمحاسبون يُوجَّهون فوراً إلى شاشة الصيانة.</li>
                <li>الناظر والدعم الفني يدخلان بشكل طبيعي مع بانر علوي.</li>
                <li>التحديث فوري لكل الجلسات النشطة عبر Realtime.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="maintenance-switch" className="text-base font-medium">
              تفعيل وضع الصيانة
            </Label>
            {isActive && startedAt && (
              <p className="text-xs text-muted-foreground">
                بدأ منذ: {fmtDateTime(startedAt)}
              </p>
            )}
          </div>
          <Switch
            id="maintenance-switch"
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="تبديل وضع الصيانة"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maintenance-message">رسالة الصيانة المعروضة للمستخدمين</Label>
          <Textarea
            id="maintenance-message"
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="مثال: صيانة مجدولة حتى الساعة 22:00"
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{draftMessage.length} / 500 حرف</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveMessage}
              disabled={saving || draftMessage === message}
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              حفظ الرسالة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
