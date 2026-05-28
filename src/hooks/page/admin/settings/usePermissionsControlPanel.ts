/**
 * Page hook: PermissionsControlPanel — orchestrator
 */
import { useState, useEffect, useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useSectionsVisibility } from '@/hooks/data/settings/permissions/useSectionsVisibility';
import { useRolePermissions } from '@/hooks/data/settings/permissions/useRolePermissions';
import { useBeneficiaryWidgets } from '@/hooks/data/settings/notifications/useBeneficiaryWidgets';
import { useNotificationSettings, type NotificationSettings } from '@/hooks/data/settings/notifications/useNotificationSettings';
import { uiNotify } from '@/lib/notify';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS, makeDefaults, PROTECTED_ADMIN_SECTIONS, isProtectedAdminSection } from '@/constants/sections';
import { defaultAdminSections, defaultBeneficiarySections } from '@/constants/navigation';
import { BENEFICIARY_WIDGET_KEYS } from '@/constants/beneficiaryWidgets';
import { useLogAccessEvent } from '@/hooks/data/audit/useLogAccessEvent';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

export const PERMISSIONS_ROLES = [
  { key: 'accountant', label: 'المحاسب', color: 'text-info dark:text-info' },
  { key: 'beneficiary', label: 'المستفيد', color: 'text-success' },
  { key: 'waqif', label: 'الواقف', color: 'text-warning' },
];

const defaultWidgets = makeDefaults(BENEFICIARY_WIDGET_KEYS);

export const usePermissionsControlPanel = () => {
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
    // مزامنة form state مع القيم المحفوظة في DB — تعمل عند كل تحديث للإعدادات المحفوظة
    /* eslint-disable react-hooks/set-state-in-effect -- مزامنة form state من useAppSettings (مصدر خارجي) */
    setPerms(savedRolePerms);
    setAdminSections(savedAdminSections);
    setBeneficiarySections(savedBeneficiarySections);
    setWidgets(savedWidgets);
    setNotifSettings(savedNotifSettings);
    /* eslint-enable react-hooks/set-state-in-effect */
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

  const toggleAdminSection = (key: string) => {
    if (isProtectedAdminSection(key)) return;
    setAdminSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  /** يضمن أن المفاتيح المحمية = true قبل أي كتابة لـ DB */
  const normalizeAdminSections = (s: Record<string, boolean>): Record<string, boolean> => {
    const out = { ...s };
    for (const k of PROTECTED_ADMIN_SECTIONS) out[k] = true;
    return out;
  };
  const toggleBeneficiarySection = (key: string) => setBeneficiarySections(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleWidget = (key: string) => setWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleNotifyExpiry = () => setNotifSettings(prev => ({
    ...prev,
    notify_beneficiary_contract_expiry: !prev.notify_beneficiary_contract_expiry,
  }));
  const toggleNotifyExpired = () => setNotifSettings(prev => ({
    ...prev,
    notify_beneficiary_expired_contracts: !prev.notify_beneficiary_expired_contracts,
  }));

  const summaries = useMemo(() => {
    return PERMISSIONS_ROLES.map(role => {
      const sections = ROLE_SECTION_DEFS.filter(s => s.roles.includes(role.key));
      const enabled = sections.filter(s => perms[role.key]?.[s.key] !== false).length;
      return { ...role, total: sections.length, enabled, percent: Math.round((enabled / sections.length) * 100) };
    });
  }, [perms]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const safeAdminSections = normalizeAdminSections(adminSections);
      await Promise.all([
        updateJsonSetting('role_permissions', perms),
        updateJsonSetting('sections_visibility', safeAdminSections),
        updateJsonSetting('beneficiary_sections', beneficiarySections),
        updateJsonSetting('beneficiary_widgets', widgets),
        updateJsonSetting('notification_settings', notifSettings),
      ]);
      logAccess({
        event_type: 'diagnostics_run',
        user_id: user?.id ?? undefined,
        metadata: { action: 'permissions_updated', role_permissions: perms, admin_sections: adminSections, beneficiary_sections: beneficiarySections },
      });
      uiNotify.success('تم حفظ الصلاحيات بنجاح');
    } catch {
      uiNotify.error('حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPerms(DEFAULT_ROLE_PERMS);
    setAdminSections(normalizeAdminSections(defaultAdminSections));
    setBeneficiarySections(defaultBeneficiarySections);
    setWidgets(defaultWidgets);
    setNotifSettings({
      ...notifSettings,
      notify_beneficiary_contract_expiry: false,
      notify_beneficiary_expired_contracts: false,
    });
    uiNotify.info('تم استعادة الإعدادات الافتراضية — اضغط حفظ للتطبيق');
  };

  return {
    perms, adminSections, beneficiarySections, widgets, notifSettings, saving, isLoading, summaries,
    toggleRolePerm, selectAllForRole, toggleAdminSection, toggleBeneficiarySection, toggleWidget,
    toggleNotifyExpiry, toggleNotifyExpired, handleSave, handleReset,
  };
};
