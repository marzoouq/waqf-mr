import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Play } from 'lucide-react';
import { TONE_OPTIONS, VOLUME_OPTIONS, previewTone, type ToneId, type VolumeLevel } from '@/hooks/data/useNotifications';
import { useNotificationPreferences } from '@/hooks/data/useNotificationPreferences';
import { useAppSettings } from '@/hooks/page/useAppSettings';

const NotificationsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const defaults = { contract_expiry: true, contract_expiry_days: 30, payment_delays: true, email_notifications: false };
  const settings = getJsonSetting('notification_settings', defaults);

  const [expiryDays, setExpiryDays] = useState(settings.contract_expiry_days);
  useEffect(() => { setExpiryDays(settings.contract_expiry_days); }, [settings.contract_expiry_days]);

  const { soundEnabled, selectedTone, volume, handleSoundChange, handleToneChange, handleVolumeChange } = useNotificationPreferences();

  const toggleField = (key: string) => {
    updateJsonSetting('notification_settings', { ...settings, [key]: !(settings as Record<string, boolean | number>)[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">إعدادات الإشعارات</CardTitle>
        <CardDescription>التحكم بأنواع الإشعارات التي يتم إرسالها</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">تنبيهات انتهاء العقود</p>
            <p className="text-xs text-muted-foreground">تنبيه قبل انتهاء العقد بفترة محددة</p>
          </div>
          <Switch checked={settings.contract_expiry} onCheckedChange={() => toggleField('contract_expiry')} />
        </div>
        {settings.contract_expiry && (
          <div className="space-y-1.5 pr-4">
            <Label htmlFor="notifications-tab-field-1">عدد الأيام قبل الانتهاء</Label>
            <Input id="notifications-tab-field-1"
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
              onBlur={() => updateJsonSetting('notification_settings', { ...settings, contract_expiry_days: expiryDays })}
              className="w-32"
              min={1}
              max={365}
            />
          </div>
        )}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">تنبيهات المتأخرات</p>
            <p className="text-xs text-muted-foreground">تنبيه عند تأخر السداد من المستأجرين</p>
          </div>
          <Switch checked={settings.payment_delays} onCheckedChange={() => toggleField('payment_delays')} />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">إشعارات بالبريد الإلكتروني</p>
            <p className="text-xs text-muted-foreground">إرسال نسخة من الإشعارات إلى بريدك</p>
          </div>
          <Switch checked={settings.email_notifications} onCheckedChange={() => toggleField('email_notifications')} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">صوت التنبيه</p>
              <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول إشعار جديد</p>
            </div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleSoundChange} />
        </div>

        {soundEnabled && (
          <>
          <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">نغمة التنبيه</p>
            </div>
            <div className="flex items-center gap-2">
              <Select dir="rtl" value={selectedTone} onValueChange={(v) => handleToneChange(v as ToneId)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => previewTone(selectedTone, VOLUME_OPTIONS.find(v => v.id === volume)?.gain)} aria-label="تشغيل النغمة">
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">مستوى الصوت</p>
            </div>
            <Select dir="rtl" value={volume} onValueChange={(v) => handleVolumeChange(v as VolumeLevel)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOLUME_OPTIONS.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsTab;
