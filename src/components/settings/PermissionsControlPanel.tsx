/**
 * لوحة إدارة الصلاحيات الموحدة — منظّم (Orchestrator)
 * المكونات الفرعية في src/components/settings/permissions/
 */
import { useState, useEffect, useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { defaultNotify } from '@/lib/notify';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS, ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS, makeDefaults } from '@/constants/sections';
import { BENEFICIARY_WIDGET_KEYS, BENEFICIARY_WIDGET_LABELS, makeWidgetDefaults } from '@/constants/beneficiaryWidgets';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { useAuth } from '@/hooks/auth/useAuthContext';
import AdminCapabilitiesSummary from './AdminCapabilitiesSummary';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PermissionsSummaryCards,
  RolePermissionsMatrix,
  SectionVisibilityCard,
  PermissionsActionBar,
} from './permissions';

const ROLES = [
  { key: 'accountant', label: 'المحاسب', color: 'text-info dark:text-info' },
  { key: 'beneficiary', label: 'المستفيد', color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'waqif', label: 'الواقف', color: 'text-amber-600 dark:text-amber-400' },
];

const defaultAdminSections = makeDefaults(ADMIN_SECTION_KEYS);
const defaultBeneficiarySections = makeDefaults(BENEFICIARY_SECTION_KEYS);
const defaultWidgets = makeWidgetDefaults();

const PermissionsControlPanel = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const { user } = useAuth();

  const savedRolePerms = getJsonSetting<RolePerms>('role_permissions', DEFAULT_ROLE_PERMS);
  const savedAdminSections = getJsonSetting<Record<string, boolean>>('sections_visibility', defaultAdminSections);
  const savedBeneficiarySections = getJsonSetting<Record<string, boolean>>('beneficiary_sections', defaultBeneficiarySections);
  const savedWidgets = getJsonSetting<Record<string, boolean>>('beneficiary_widgets', defaultWidgets);
  const [perms, setPerms] = useState<RolePerms>(DEFAULT_ROLE_PERMS);
  const [adminSections, setAdminSections] = useState<Record<string, boolean>>(defaultAdminSections);
  const [beneficiarySections, setBeneficiarySections] = useState<Record<string, boolean>>(defaultBeneficiarySections);
  const [widgets, setWidgets] = useState<Record<string, boolean>>(defaultWidgets);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const merged: RolePerms = {};
    for (const role of ROLES) {
      merged[role.key] = { ...DEFAULT_ROLE_PERMS[role.key], ...savedRolePerms[role.key] };
    }
    setPerms(merged);
    setAdminSections({ ...defaultAdminSections, ...savedAdminSections });
    setBeneficiarySections({ ...defaultBeneficiarySections, ...savedBeneficiarySections });
    setWidgets({ ...defaultWidgets, ...savedWidgets });
  }, [savedRolePerms, savedAdminSections, savedBeneficiarySections, savedWidgets]);

  const toggleRolePerm = (role: string, section: string) => {
    setPerms(prev => ({ ...prev, [role]: { ...prev[role], [section]: !prev[role]?.[section] } }));
  };

  const selectAllForRole = (roleKey: string, value: boolean) => {
    const sections = ROLE_SECTION_DEFS.filter(s => s.roles.includes(roleKey));
    setPerms(prev => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], ...Object.fromEntries(sections.map(s => [s.key, value])) },
    }));
  };

  const summaries = useMemo(() => {
    return ROLES.map(role => {
      const sections = ROLE_SECTION_DEFS.filter(s => s.roles.includes(role.key));
      const enabled = sections.filter(s => perms[role.key]?.[s.key] !== false).length;
      return { ...role, total: sections.length, enabled, percent: Math.round((enabled / sections.length) * 100) };
    });
  }, [perms]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateJsonSetting('role_permissions', perms),
        updateJsonSetting('sections_visibility', adminSections),
        updateJsonSetting('beneficiary_sections', beneficiarySections),
        updateJsonSetting('beneficiary_widgets', widgets),
      ]);
      logAccessEvent({
        event_type: 'diagnostics_run',
        user_id: user?.id ?? undefined,
        metadata: { action: 'permissions_updated', role_permissions: perms, admin_sections: adminSections, beneficiary_sections: beneficiarySections },
      });
      defaultNotify.success('تم حفظ الصلاحيات بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPerms(DEFAULT_ROLE_PERMS);
    setAdminSections(defaultAdminSections);
    setBeneficiarySections(defaultBeneficiarySections);
    setWidgets(defaultWidgets);
    defaultNotify.info('تم استعادة الإعدادات الافتراضية — اضغط حفظ للتطبيق');
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <AdminCapabilitiesSummary />
      <PermissionsSummaryCards summaries={summaries} />
      <RolePermissionsMatrix roles={ROLES} perms={perms} onToggle={toggleRolePerm} onSelectAll={selectAllForRole} />
      <SectionVisibilityCard
        title="أقسام لوحة التحكم"
        description="إظهار/إخفاء أقسام من القائمة الجانبية للناظر والمحاسب"
        sectionKeys={ADMIN_SECTION_KEYS}
        values={adminSections}
        onToggle={key => setAdminSections(prev => ({ ...prev, [key]: !prev[key] }))}
      />
      <SectionVisibilityCard
        title="أقسام واجهة المستفيد"
        description="التحكم بالأقسام الظاهرة للمستفيدين والواقف"
        sectionKeys={BENEFICIARY_SECTION_KEYS}
        values={beneficiarySections}
        onToggle={key => setBeneficiarySections(prev => ({ ...prev, [key]: !prev[key] }))}
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">عناصر لوحة المستفيد</CardTitle>
          <CardDescription>التحكم بإظهار/إخفاء بطاقات وعناصر الصفحة الرئيسية للمستفيد</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFICIARY_WIDGET_KEYS.map(key => (
            <label key={key} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
              <Checkbox checked={widgets[key] ?? true} onCheckedChange={() => setWidgets(prev => ({ ...prev, [key]: !prev[key] }))} />
              <span className="text-sm">{BENEFICIARY_WIDGET_LABELS[key]}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <PermissionsActionBar saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  );
};

export default PermissionsControlPanel;
