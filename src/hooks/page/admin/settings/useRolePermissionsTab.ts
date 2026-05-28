/**
 * Page hook: RolePermissionsTab
 */
import { useState } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useRolePermissions } from '@/hooks/data/settings/permissions/useRolePermissions';
import { useSyncedFormState } from '@/hooks/ui/useSyncedFormState';
import { uiNotify } from '@/lib/notify';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';

export const useRolePermissionsTab = () => {
  const { updateJsonSetting, isLoading } = useAppSettings();
  const { rolePermissions: saved } = useRolePermissions();
  const [perms, setPerms] = useSyncedFormState<RolePerms>(saved);
  const [saving, setSaving] = useState(false);

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
    setPerms(DEFAULT_ROLE_PERMS);
    uiNotify.info('تم استعادة الإعدادات الافتراضية - اضغط حفظ للتطبيق');
  };

  return { perms, toggle, handleSave, handleReset, saving, isLoading };
};
