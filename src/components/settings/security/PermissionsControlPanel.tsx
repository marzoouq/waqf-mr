/**
 * لوحة إدارة الصلاحيات الموحدة — منظّم (Orchestrator)
 * المكونات الفرعية في src/components/settings/permissions/
 */
import { useState, useEffect, useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useSectionsVisibility } from '@/hooks/data/settings/useSectionsVisibility';
import { useRolePermissions } from '@/hooks/data/settings/useRolePermissions';
import { useBeneficiaryWidgets } from '@/hooks/data/settings/useBeneficiaryWidgets';
import { useNotificationSettings, type NotificationSettings } from '@/hooks/data/settings/useNotificationSettings';
import { defaultNotify } from '@/lib/notify';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS, ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS, makeDefaults } from '@/constants/sections';
import { defaultAdminSections, defaultBeneficiarySections } from '@/constants/navigation';
import { BENEFICIARY_WIDGET_KEYS, BENEFICIARY_WIDGET_LABELS } from '@/constants/beneficiaryWidgets';
import { useLogAccessEvent } from '@/hooks/data/audit/useLogAccessEvent';
import { useAuth } from '@/hooks/auth/useAuthContext';
import AdminCapabilitiesSummary from './AdminCapabilitiesSummary';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PermissionsSummaryCards,
  RolePermissionsMatrix,
  SectionVisibilityCard,
  PermissionsActionBar,
} from '../permissions';

const ROLES = [
  { key: 'accountant', label: 'المحاسب', color: 'text-info dark:text-info' },
  { key: 'beneficiary', label: 'المستفيد', color: 'text-success' },
  { key: 'waqif', label: 'الواقف', color: 'text-warning' },
];

const defaultWidgets = makeDefaults(BENEFICIARY_WIDGET_KEYS);

const PermissionsControlPanel = () => {
  const { updateJsonSetting, isLoading } = useAppSettings();
  const { rolePermissions: savedRolePerms } = useRolePermissions();
  const { adminSections: savedAdminSections, beneficiarySections: savedBeneficiarySections } = useSectionsVisibility();
  const { widgets: savedWidgets } = useBeneficiaryWidgets();
  const { notificationSettings: savedNotifSettings } = useNotificationSettings();
  const { user } = useAuth();
  const logAccess = useLogAccessEvent();

  const [perms, setPerms] = useState<RolePerms>(DEFAULT_ROLE_PERMS);
  const [adminSections, setAdminSections] = useState<Record<string, boolean>>(defaultAdminSections);
  const [beneficiarySections, setBeneficiarySections] = useState<Record<string, boolean>>(defaultBeneficiarySections);
  const [widgets, setWidgets] = useState<Record<string, boolean>>(defaultWidgets);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(savedNotifSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // جميع المصادر مدموجة مسبقاً مع defaults عبر hooks متخصصة
    setPerms(savedRolePerms);
    setAdminSections(savedAdminSections);
    setBeneficiarySections(savedBeneficiarySections);
    setWidgets(savedWidgets);
    setNotifSettings(savedNotifSettings);
  }, [savedRolePerms, savedAdminSections, savedBeneficiarySections, savedWidgets, savedNotifSettings]);

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
        updateJsonSetting('notification_settings', notifSettings),
      ]);
      logAccess({
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
    setNotifSettings({
      ...notifSettings,
      notify_beneficiary_contract_expiry: false,
      notify_beneficiary_expired_contracts: false,
    });
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
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">إشعارات المستفيدين</CardTitle>
          <CardDescription>
            تحكّم بإرسال إشعارات العقود إلى المستفيدين. الناظر يستمر باستلامها دائماً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-start gap-2 py-2 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
            <Checkbox
              checked={notifSettings.notify_beneficiary_contract_expiry}
              onCheckedChange={() => setNotifSettings(prev => ({
                ...prev,
                notify_beneficiary_contract_expiry: !prev.notify_beneficiary_contract_expiry,
              }))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">إشعار المستفيدين عند اقتراب انتهاء العقد</span>
              <p className="text-xs text-muted-foreground">يُفضّل إيقافه لأن المستفيد لا يملك صلاحية التجديد.</p>
            </div>
          </label>
          <label className="flex items-start gap-2 py-2 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
            <Checkbox
              checked={notifSettings.notify_beneficiary_expired_contracts}
              onCheckedChange={() => setNotifSettings(prev => ({
                ...prev,
                notify_beneficiary_expired_contracts: !prev.notify_beneficiary_expired_contracts,
              }))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">تذكير أسبوعي للمستفيدين بالعقود المنتهية</span>
              <p className="text-xs text-muted-foreground">يُرسل أيام الأحد فقط عند وجود عقود منتهية.</p>
            </div>
          </label>
        </CardContent>
      </Card>
      <PermissionsActionBar saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  );
};

export default PermissionsControlPanel;
