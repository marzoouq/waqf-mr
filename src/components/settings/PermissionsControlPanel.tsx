/**
 * لوحة إدارة الصلاحيات الموحدة — تدمج صلاحيات الأدوار + الأقسام + واجهة المستفيد
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Save, RotateCcw, Shield, CheckSquare, XSquare } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { toast } from 'sonner';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS, ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS, makeDefaults } from '@/constants/sections';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { useAuth } from '@/hooks/auth/useAuthContext';
import AdminCapabilitiesSummary from './AdminCapabilitiesSummary';
const ROLES = [
  { key: 'accountant', label: 'المحاسب', color: 'text-info dark:text-info' },
  { key: 'beneficiary', label: 'المستفيد', color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'waqif', label: 'الواقف', color: 'text-amber-600 dark:text-amber-400' },
];

const defaultAdminSections = makeDefaults(ADMIN_SECTION_KEYS);
const defaultBeneficiarySections = makeDefaults(BENEFICIARY_SECTION_KEYS);

const PermissionsControlPanel = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const { user } = useAuth();

  // — قراءة الإعدادات المحفوظة —
  const savedRolePerms = getJsonSetting<RolePerms>('role_permissions', DEFAULT_ROLE_PERMS);
  const savedAdminSections = getJsonSetting<Record<string, boolean>>('sections_visibility', defaultAdminSections);
  const savedBeneficiarySections = getJsonSetting<Record<string, boolean>>('beneficiary_sections', defaultBeneficiarySections);

  // — حالة محلية —
  const [perms, setPerms] = useState<RolePerms>(DEFAULT_ROLE_PERMS);
  const [adminSections, setAdminSections] = useState<Record<string, boolean>>(defaultAdminSections);
  const [beneficiarySections, setBeneficiarySections] = useState<Record<string, boolean>>(defaultBeneficiarySections);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const merged: RolePerms = {};
    for (const role of ROLES) {
      merged[role.key] = { ...DEFAULT_ROLE_PERMS[role.key], ...savedRolePerms[role.key] };
    }
    setPerms(merged);
    setAdminSections({ ...defaultAdminSections, ...savedAdminSections });
    setBeneficiarySections({ ...defaultBeneficiarySections, ...savedBeneficiarySections });
  }, [savedRolePerms, savedAdminSections, savedBeneficiarySections]);

  // — تبديل صلاحية دور —
  const toggleRolePerm = (role: string, section: string) => {
    setPerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [section]: !prev[role]?.[section] },
    }));
  };

  // — تبديل قسم ناظر/محاسب —
  const toggleAdminSection = (key: string) => {
    setAdminSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // — تبديل قسم مستفيد —
  const toggleBeneficiarySection = (key: string) => {
    setBeneficiarySections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // — تحديد/إلغاء الكل لدور —
  const selectAllForRole = (roleKey: string, value: boolean) => {
    const sections = ROLE_SECTION_DEFS.filter(s => s.roles.includes(roleKey));
    setPerms(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        ...Object.fromEntries(sections.map(s => [s.key, value])),
      },
    }));
  };

  // — ملخص الصلاحيات —
  const summaries = useMemo(() => {
    return ROLES.map(role => {
      const sections = ROLE_SECTION_DEFS.filter(s => s.roles.includes(role.key));
      const enabled = sections.filter(s => perms[role.key]?.[s.key] !== false).length;
      return { ...role, total: sections.length, enabled, percent: Math.round((enabled / sections.length) * 100) };
    });
  }, [perms]);

  // — حفظ —
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateJsonSetting('role_permissions', perms),
        updateJsonSetting('sections_visibility', adminSections),
        updateJsonSetting('beneficiary_sections', beneficiarySections),
      ]);
      // تسجيل في سجل المراجعة
      logAccessEvent({
        event_type: 'diagnostics_run',
        user_id: user?.id ?? undefined,
        metadata: {
          action: 'permissions_updated',
          role_permissions: perms,
          admin_sections: adminSections,
          beneficiary_sections: beneficiarySections,
        },
      });
      toast.success('تم حفظ الصلاحيات بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  // — استعادة الافتراضي —
  const handleReset = () => {
    setPerms(DEFAULT_ROLE_PERMS);
    setAdminSections(defaultAdminSections);
    setBeneficiarySections(defaultBeneficiarySections);
    toast.info('تم استعادة الإعدادات الافتراضية — اضغط حفظ للتطبيق');
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* ── ملخص صلاحيات الناظر ── */}
      <AdminCapabilitiesSummary />

      {/* ── ملخص الصلاحيات ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaries.map(s => (
          <Card key={s.key} className="border-border/60">
            <CardContent className="pt-4 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-sm ${s.color}`}>{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.enabled}/{s.total} قسم</span>
              </div>
              <Progress value={s.percent} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── مصفوفة صلاحيات الأدوار ── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            مصفوفة الصلاحيات
          </CardTitle>
          <CardDescription>
            تحكم بالأقسام الظاهرة لكل دور — الناظر يرى كل شيء دائماً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* أزرار تحديد/إلغاء الكل */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
            {ROLES.map(role => (
              <div key={role.key} className="flex items-center gap-1">
                <span className={`text-xs font-medium ${role.color}`}>{role.label}:</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => selectAllForRole(role.key, true)}>
                  <CheckSquare className="w-3 h-3" /> الكل
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => selectAllForRole(role.key, false)}>
                  <XSquare className="w-3 h-3" /> لا شيء
                </Button>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {ROLE_SECTION_DEFS.map(section => (
              <div key={section.key} className="p-3 rounded-lg border bg-card space-y-2">
                <p className="font-medium text-sm text-foreground">{section.label}</p>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map(role => {
                    if (!section.roles.includes(role.key)) return null;
                    return (
                      <label key={role.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={perms[role.key]?.[section.key] ?? false}
                          onCheckedChange={() => toggleRolePerm(role.key, section.key)}
                        />
                        <span className="text-muted-foreground">{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-3 px-2 font-medium text-foreground">القسم</th>
                  {ROLES.map(r => (
                    <th key={r.key} className={`text-center py-3 px-2 font-medium min-w-[80px] ${r.color}`}>{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_SECTION_DEFS.map(section => (
                  <tr key={section.key} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium text-foreground">{section.label}</td>
                    {ROLES.map(role => (
                      <td key={role.key} className="text-center py-3 px-2">
                        {section.roles.includes(role.key) ? (
                          <Checkbox
                            checked={perms[role.key]?.[section.key] ?? false}
                            onCheckedChange={() => toggleRolePerm(role.key, section.key)}
                          />
                        ) : (
                          <span className="text-muted-foreground">─</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── إظهار/إخفاء أقسام لوحة التحكم (ناظر + محاسب) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">أقسام لوحة التحكم</CardTitle>
          <CardDescription>إظهار/إخفاء أقسام من القائمة الجانبية للناظر والمحاسب</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADMIN_SECTION_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
              <Checkbox checked={adminSections[key] ?? true} onCheckedChange={() => toggleAdminSection(key)} />
              <span className="text-sm">{ROLE_SECTION_DEFS.find(s => s.key === key)?.label ?? key}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* ── إظهار/إخفاء أقسام واجهة المستفيد ── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">أقسام واجهة المستفيد</CardTitle>
          <CardDescription>التحكم بالأقسام الظاهرة للمستفيدين والواقف</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFICIARY_SECTION_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
              <Checkbox checked={beneficiarySections[key] ?? true} onCheckedChange={() => toggleBeneficiarySection(key)} />
              <span className="text-sm">{ROLE_SECTION_DEFS.find(s => s.key === key)?.label ?? key}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* ── أزرار الحفظ ── */}
      <div className="flex flex-wrap gap-3 sticky bottom-4 bg-background/95 p-3 rounded-lg border shadow-sm">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ جميع الصلاحيات'}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          استعادة الافتراضي
        </Button>
      </div>
    </div>
  );
};

export default PermissionsControlPanel;
