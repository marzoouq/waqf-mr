/**
 * Page hook: RolePermissionsTab
 */
import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useRolePermissions } from '@/hooks/data/settings/useRolePermissions';
import { defaultNotify } from '@/lib/notify';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';

export const useRolePermissionsTab = () => {
  const { updateJsonSetting, isLoading } = useAppSettings();
  const { rolePermissions: saved } = useRolePermissions();
  const [perms, setPerms] = useState<RolePerms>(DEFAULT_ROLE_PERMS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPerms(saved);
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
    setPerms(DEFAULT_ROLE_PERMS);
    defaultNotify.info('تم استعادة الإعدادات الافتراضية - اضغط حفظ للتطبيق');
  };

  return { perms, toggle, handleSave, handleReset, saving, isLoading };
};
