/**
 * خدمة عمليات ZATCA — Edge Functions + RPCs
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const zatcaOnboard = async () => {
  const { error } = await supabase.functions.invoke('zatca-onboard', { body: { action: 'onboard' } });
  if (error) throw error;
};

export const zatcaRenew = async () => {
  const { data, error } = await supabase.functions.invoke('zatca-renew');
  if (error) throw error;
  return data;
};

export const zatcaTestConnection = async () => {
  const { data, error } = await supabase.functions.invoke('zatca-onboard', {
    body: { action: 'test-connection' },
  });
  if (error) throw error;
  return data;
};

export const clearZatcaOtp = async () => {
  const { error } = await supabase.rpc('clear_zatca_otp');
  if (error) logger.error('[ZATCA] فشل مسح OTP:', error);
};

export const saveZatcaSettings = async (rows: Array<{ key: string; value: string }>) => {
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
};
