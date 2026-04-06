/**
 * تبويب تفضيلات الإشعارات
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Volume2, Play } from 'lucide-react';
import { defaultNotify } from '@/lib/notify';
import { TONE_OPTIONS, NOTIF_PREFS_KEY, VOLUME_OPTIONS, previewTone, type ToneId, type VolumeLevel } from '@/hooks/data/notifications/useNotifications';
import { useNotificationPreferences } from '@/hooks/data/notifications/useNotificationPreferences';

const defaultPrefs = {
  distributions: true,
  contracts: true,
  messages: true,
};

const NotificationsTab = () => {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const { soundEnabled, selectedTone, volume, handleSoundChange, handleToneChange, handleVolumeChange } = useNotificationPreferences();

  const handlePrefChange = (key: keyof typeof defaultPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try { localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated)); } catch { /* ignored */ }
    defaultNotify.success('تم حفظ التفضيلات');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Bell className="w-5 h-5" />
          تفضيلات الإشعارات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="font-medium text-sm">إشعارات التوزيعات المالية</p>
            <p className="text-xs text-muted-foreground">تنبيهات عند صرف التوزيعات</p>
          </div>
          <Switch checked={prefs.distributions} onCheckedChange={v => handlePrefChange('distributions', v)} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="font-medium text-sm">إشعارات العقود</p>
            <p className="text-xs text-muted-foreground">تنبيهات تجديد وانتهاء العقود</p>
          </div>
          <Switch checked={prefs.contracts} onCheckedChange={v => handlePrefChange('contracts', v)} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="font-medium text-sm">إشعارات الرسائل</p>
            <p className="text-xs text-muted-foreground">تنبيهات الرسائل الجديدة</p>
          </div>
          <Switch checked={prefs.messages} onCheckedChange={v => handlePrefChange('messages', v)} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-sm">صوت التنبيه</p>
              <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول إشعار جديد</p>
            </div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleSoundChange} />
        </div>

        {soundEnabled && (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <p className="font-medium text-sm">نغمة التنبيه</p>
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
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <p className="font-medium text-sm">مستوى الصوت</p>
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
