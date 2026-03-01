import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, RotateCcw, Shield } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type RolePerms = Record<string, Record<string, boolean>>;

const DEFAULT_PERMISSIONS: RolePerms = {
  accountant: {
    properties: true, contracts: true, income: true, expenses: true,
    beneficiaries: true, reports: true, accounts: true, invoices: true,
    bylaws: true, messages: true, audit_log: true,
  },
  beneficiary: {
    properties: true, contracts: true, disclosure: true, share: true,
    reports: true, accounts: true, invoices: true, bylaws: true, messages: true,
  },
  waqif: {
    properties: true, contracts: true, disclosure: false,
    reports: true, accounts: true, bylaws: true,
    notifications: true,
  },
};

// All sections with labels and which roles can potentially have them
const SECTIONS: { key: string; label: string; roles: string[] }[] = [
  { key: 'properties', label: 'العقارات', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'contracts', label: 'العقود', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'income', label: 'الدخل', roles: ['accountant'] },
  { key: 'expenses', label: 'المصروفات', roles: ['accountant'] },
  { key: 'beneficiaries', label: 'المستفيدين', roles: ['accountant'] },
  { key: 'reports', label: 'التقارير', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'accounts', label: 'الحسابات', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'invoices', label: 'الفواتير', roles: ['accountant', 'beneficiary'] },
  { key: 'bylaws', label: 'اللائحة التنظيمية', roles: ['accountant', 'beneficiary', 'waqif'] },
  { key: 'disclosure', label: 'الإفصاح السنوي', roles: ['beneficiary', 'waqif'] },
  { key: 'share', label: 'حصتي من الريع', roles: ['beneficiary'] },
  { key: 'messages', label: 'المراسلات', roles: ['accountant', 'beneficiary'] },
  { key: 'audit_log', label: 'سجل المراجعة', roles: ['accountant'] },
  { key: 'notifications', label: 'سجل الإشعارات', roles: ['beneficiary', 'waqif'] },
];

const ROLES = [
  { key: 'accountant', label: 'المحاسب' },
  { key: 'beneficiary', label: 'المستفيد' },
  { key: 'waqif', label: 'الواقف' },
];

const RolePermissionsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const saved = getJsonSetting<RolePerms>('role_permissions', DEFAULT_PERMISSIONS);
  const [perms, setPerms] = useState<RolePerms>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Merge saved with defaults to handle new sections
    const merged: RolePerms = {};
    for (const role of ROLES) {
      merged[role.key] = { ...DEFAULT_PERMISSIONS[role.key], ...saved[role.key] };
    }
    setPerms(merged);
  }, [saved]);

  const toggle = (role: string, section: string) => {
    setPerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [section]: !prev[role]?.[section] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateJsonSetting('role_permissions', perms);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPerms(DEFAULT_PERMISSIONS);
    toast.info('تم استعادة الإعدادات الافتراضية - اضغط حفظ للتطبيق');
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          صلاحيات الأدوار
        </CardTitle>
        <CardDescription>
          تخصيص الأقسام الظاهرة لكل دور في النظام — الناظر يرى كل شيء دائماً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 px-2 font-medium text-foreground">القسم</th>
                {ROLES.map(r => (
                  <th key={r.key} className="text-center py-3 px-2 font-medium text-foreground min-w-[80px]">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map(section => (
                <tr key={section.key} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2 font-medium text-foreground">{section.label}</td>
                  {ROLES.map(role => {
                    const available = section.roles.includes(role.key);
                    return (
                      <td key={role.key} className="text-center py-3 px-2">
                        {available ? (
                          <Checkbox
                            checked={perms[role.key]?.[section.key] ?? false}
                            onCheckedChange={() => toggle(role.key, section.key)}
                          />
                        ) : (
                          <span className="text-muted-foreground">─</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            استعادة الافتراضي
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RolePermissionsTab;
