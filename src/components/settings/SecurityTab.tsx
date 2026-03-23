import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { useAppSettings } from '@/hooks/page/useAppSettings';

const SecurityTab = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('15');

  useEffect(() => {
    if (settings?.idle_timeout_minutes) setIdleMinutes(settings.idle_timeout_minutes);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('app_settings').upsert({ key: 'idle_timeout_minutes', value: idleMinutes, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم حفظ إعدادات الأمان');
    } catch { toast.error('حدث خطأ أثناء الحفظ'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">إعدادات الأمان</CardTitle>
        <CardDescription>التحكم بأمان الجلسات وتسجيل الخروج التلقائي</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">مدة الخمول قبل تسجيل الخروج</p>
            <p className="text-xs text-muted-foreground">يتم تسجيل الخروج تلقائياً بعد هذه المدة من عدم النشاط</p>
          </div>
          <Select value={idleMinutes} onValueChange={setIdleMinutes}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 دقائق</SelectItem>
              <SelectItem value="15">15 دقيقة</SelectItem>
              <SelectItem value="30">30 دقيقة</SelectItem>
              <SelectItem value="60">60 دقيقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الأمان'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SecurityTab;
