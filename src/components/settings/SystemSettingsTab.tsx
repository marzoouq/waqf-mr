/**
 * SystemSettingsTab — تبويب إعدادات النظام المتقدمة
 *
 * يدير المفاتيح التي لا تظهر في WaqfSettingsTab (مثل auth_hook_custom_access_token)
 * ويعرض سجل تغييرات لكل تعديلات `app_settings` المحفوظة في `audit_log`.
 *
 * ملاحظة: zakat_percentage و fiscal_year يُداران من تبويب "بيانات الوقف".
 */
import { useState, useEffect, useMemo } from 'react';
import { defaultNotify } from '@/lib/notify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, History, ShieldAlert } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useAppSettingsHistory, type AppSettingHistoryEntry } from '@/hooks/data/settings/useAppSettingsHistory';

interface AdvancedField {
  key: string;
  label: string;
  description: string;
  placeholder?: string;
}

const ADVANCED_FIELDS: AdvancedField[] = [
  {
    key: 'auth_hook_custom_access_token',
    label: 'مُعالج JWT المخصص (Custom Access Token Hook)',
    description: 'تفعيل أو تعطيل إضافة بيانات الدور إلى الرمز المميز للمصادقة. القيمة المعتادة: enabled',
    placeholder: 'enabled',
  },
];

const operationStyles: Record<AppSettingHistoryEntry['operation'], string> = {
  INSERT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  UPDATE: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-destructive/10 text-destructive',
};

const operationLabels: Record<AppSettingHistoryEntry['operation'], string> = {
  INSERT: 'إضافة',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
};

const formatValue = (v: string | null): string => {
  if (v === null || v === undefined) return '—';
  if (v === '') return '(فارغ)';
  return v.length > 80 ? `${v.slice(0, 80)}…` : v;
};

const SystemSettingsTab = () => {
  const { data: settings, isLoading, updateSettingsBatch } = useAppSettings();
  const { data: history, isLoading: isHistoryLoading } = useAppSettingsHistory(undefined, 50);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const initial: Record<string, string> = {};
    ADVANCED_FIELDS.forEach((f) => {
      initial[f.key] = settings[f.key] ?? '';
    });
    setFormData(initial);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = ADVANCED_FIELDS.map((f) => ({
        key: f.key,
        value: (formData[f.key] ?? '').trim(),
        updated_at: now,
      }));
      await updateSettingsBatch.mutateAsync(rows);
      defaultNotify.success('تم حفظ الإعدادات بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const sortedHistory = useMemo(() => history ?? [], [history]);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            إعدادات النظام المتقدمة
          </CardTitle>
          <CardDescription>
            مفاتيح حساسة تتحكم في سلوك المصادقة والبنية التحتية. عدّل بحذر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ADVANCED_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`system-settings-${f.key}`}>{f.label}</Label>
              <Input
                id={`system-settings-${f.key}`}
                name={f.key}
                value={formData[f.key] ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                maxLength={500}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            سجل تغييرات الإعدادات
          </CardTitle>
          <CardDescription>
            آخر 50 تعديل على جميع مفاتيح <code className="text-xs">app_settings</code>. القيم
            الحساسة (مفاتيح OTP وتشفير PII) محجوبة تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? (
            <div className="text-center text-muted-foreground py-6">جارٍ تحميل السجل...</div>
          ) : sortedHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">لا توجد تعديلات بعد.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-right">
                    <th className="px-3 py-2 font-medium">العملية</th>
                    <th className="px-3 py-2 font-medium">المفتاح</th>
                    <th className="px-3 py-2 font-medium">القيمة السابقة</th>
                    <th className="px-3 py-2 font-medium">القيمة الجديدة</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className={operationStyles[entry.operation]}>
                          {operationLabels[entry.operation]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                        {entry.setting_key}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground" dir="ltr">
                        {formatValue(entry.old_value)}
                      </td>
                      <td className="px-3 py-2 text-xs" dir="ltr">
                        {formatValue(entry.new_value)}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsTab;
