/**
 * خدمة عمليات ZATCA — Edge Functions + RPCs
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { rpc, ApiError } from '@/lib/api/rpc';
import { invoke } from '@/lib/api/invoke';

export const zatcaOnboard = async () => {
  // عملية حساسة تستهلك OTP — لا يجوز إعادة المحاولة تلقائياً.
  await invoke('zatca-onboard', { body: { action: 'onboard' } }, { maxAttempts: 1 });
};

export const zatcaRenew = async () => {
  // عملية حساسة تستهلك OTP — لا retry. الاستجابة قد تحوي { error } كحقل تقرير وليس فشل نقل.
  return await invoke<{ success?: boolean; error?: string }>(
    'zatca-renew',
    {},
    { maxAttempts: 1, treatDataErrorAsFailure: false },
  );
};

export const zatcaTestConnection = async () => {
  return await invoke<{ connected: boolean; url?: string; error?: string; tested_at?: string; status_code?: number }>(
    'zatca-onboard',
    { body: { action: 'test-connection' } },
    { treatDataErrorAsFailure: false },
  );
};

export const clearZatcaOtp = async () => {
  try {
    await rpc('clear_zatca_otp');
  } catch (e) {
    logger.error('[ZATCA] فشل مسح OTP:', (e as ApiError).message);
  }
};

export const saveZatcaSettings = async (rows: Array<{ key: string; value: string }>) => {
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
};
