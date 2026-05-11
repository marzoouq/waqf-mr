/**
 * خدمة عمليات ZATCA — Edge Functions + RPCs
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { rpc, ApiError } from '@/lib/api/rpc';
import { invoke } from '@/lib/api/invoke';

export const zatcaOnboard = async () => {
  await invoke('zatca-onboard', { body: { action: 'onboard' } });
};

export const zatcaRenew = async () => {
  return await invoke('zatca-renew');
};

export const zatcaTestConnection = async () => {
  return await invoke('zatca-onboard', { body: { action: 'test-connection' } });
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
