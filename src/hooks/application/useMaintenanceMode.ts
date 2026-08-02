/**
 * useMaintenanceMode — قراءة/تبديل وضع الصيانة مع realtime
 *
 * يعتمد على `app_settings` (المفاتيح: maintenance_mode, maintenance_message, maintenance_started_at).
 * التحديث الفوري عبر Realtime على جدول app_settings.
 */
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';
import { logger } from '@/lib/logger';

export interface MaintenanceState {
  isActive: boolean;
  message: string;
  startedAt: string | null;
  isLoading: boolean;
  saving: boolean;
  toggle: (active: boolean, message?: string) => Promise<void>;
  updateMessage: (message: string) => Promise<void>;
}

const DEFAULT_MESSAGE = 'النظام تحت الصيانة، سنعود قريباً بإذن الله';

const MAINTENANCE_KEYS = ['maintenance_mode', 'maintenance_message', 'maintenance_started_at'];

/**
 * قناة Realtime واحدة مشتركة بين كل نسخ الهوك (refcount).
 * سبب مهم: الهوك يُستخدم في أكثر من مكان (حارس المسار + البانر + لوحة التحكم)،
 * وإنشاء قناة بنفس الاسم مرتين يرفع الخطأ:
 * "cannot add `postgres_changes` callbacks ... after `subscribe()`".
 */
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let subscribers = 0;
const listeners = new Set<() => void>();

const ensureChannel = (onChange: () => void) => {
  listeners.add(onChange);
  subscribers += 1;
  if (!sharedChannel) {
    sharedChannel = supabase
      .channel('maintenance-mode-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          const key = (payload.new as { key?: string } | null)?.key
            ?? (payload.old as { key?: string } | null)?.key;
          if (key && MAINTENANCE_KEYS.includes(key)) {
            listeners.forEach((fn) => fn());
          }
        }
      )
      .subscribe();
  }
  return () => {
    listeners.delete(onChange);
    subscribers -= 1;
    if (subscribers <= 0) {
      subscribers = 0;
      if (sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
      }
    }
  };
};

export const useMaintenanceMode = (): MaintenanceState => {
  const { data: settings, isLoading, updateSettingsBatch, updateSetting } = useAppSettings();
  const queryClient = useQueryClient();

  const isActive = settings?.maintenance_mode === 'true';
  const message = settings?.maintenance_message || DEFAULT_MESSAGE;
  const startedAt = settings?.maintenance_started_at || null;

  // Realtime subscription لمزامنة الحالة عبر كل الجلسات (قناة مشتركة)
  useEffect(() => {
    return ensureChannel(() => {
      queryClient.invalidateQueries({ queryKey: appSettingsKeys.all() });
    });
  }, [queryClient]);


  const toggle = useCallback(async (active: boolean, msg?: string) => {
    try {
      await updateSettingsBatch.mutateAsync([
        { key: 'maintenance_mode', value: active ? 'true' : 'false' },
        ...(msg !== undefined ? [{ key: 'maintenance_message', value: msg || DEFAULT_MESSAGE }] : []),
        { key: 'maintenance_started_at', value: active ? new Date().toISOString() : '' },
      ]);
    } catch (err) {
      logger.error('[maintenance] toggle failed:', err);
      throw err;
    }
  }, [updateSettingsBatch]);

  const updateMessage = useCallback(async (msg: string) => {
    await updateSetting.mutateAsync({ key: 'maintenance_message', value: msg || DEFAULT_MESSAGE });
  }, [updateSetting]);

  return {
    isActive,
    message,
    startedAt,
    isLoading,
    saving: updateSettingsBatch.isPending || updateSetting.isPending,
    toggle,
    updateMessage,
  };
};
