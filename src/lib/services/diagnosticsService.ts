/**
 * خدمة استعلامات التشخيص — تجريد لطبقة قاعدة البيانات
 * تُستخدم من lib/diagnostics/checks/ بدلاً من استيراد Supabase مباشرة
 */
import { supabase } from '@/integrations/supabase/client';
import { fromView } from '@/integrations/supabase/viewHelper';

/* ─── قاعدة البيانات ─── */

export const checkDbConnection = async () => {
  return supabase.from('app_settings').select('key').limit(1);
};

export const getAuthUser = async () => {
  return supabase.auth.getUser();
};

export const getRealtimeChannels = () => {
  return supabase.getChannels();
};

export const refreshAuthSession = async () => {
  return supabase.auth.refreshSession();
};

/** يغلق كل قنوات Realtime ويُرجع عددها */
export const removeAllRealtimeChannels = async (): Promise<number> => {
  const channels = supabase.getChannels();
  for (const c of channels) await supabase.removeChannel(c);
  return channels.length;
};

export const deleteClientErrorsBefore = async (cutoffIso: string) => {
  return supabase
    .from('access_log')
    .delete({ count: 'exact' })
    .eq('event_type', 'client_error')
    .lt('created_at', cutoffIso);
};

export const getUserRoleRows = async (userId: string) => {
  return supabase.from('user_roles').select('role').eq('user_id', userId);
};

export const getActiveFiscalYearRow = async () => {
  return supabase.from('fiscal_years').select('id, label, status').eq('status', 'active').limit(1).maybeSingle();
};

export const listStorageBuckets = async () => {
  return supabase.storage.listBuckets();
};

export const probeStorageBucket = async (bucket: string) => {
  return supabase.storage.from(bucket).list('', { limit: 1 });
};

/* ─── ZATCA ─── */

export const getActiveCertificate = async () => {
  const { data, error } = await fromView('zatca_certificates_safe')
    .select('certificate_type, is_active, expires_at')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return { data: data as { certificate_type: string; is_active: boolean; expires_at: string | null } | null, error };
};

export const getInvoiceChainRecords = async (limit = 500) => {
  return supabase
    .from('invoice_chain')
    .select('icv, invoice_hash, previous_hash')
    .neq('invoice_hash', 'PENDING')
    .order('icv', { ascending: true })
    .limit(limit);
};

export const countPendingChainRecords = async () => {
  return supabase
    .from('invoice_chain')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_hash', 'PENDING');
};

export const countUnsubmittedInvoices = async () => {
  return supabase
    .from('payment_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid')
    .eq('zatca_status', 'not_submitted');
};

export const getRequiredSettings = async (keys: string[]) => {
  return supabase
    .from('app_settings')
    .select('key')
    .in('key', keys);
};

export const getOtpSettings = async () => {
  return supabase
    .from('app_settings')
    .select('key')
    .in('key', ['zatca_otp_1', 'zatca_otp_2']);
};

export const getInvoiceChainCompleteness = async () => {
  const [invoicesRes, chainRes] = await Promise.all([
    supabase.from('payment_invoices').select('id', { count: 'exact', head: true }).not('icv', 'is', null),
    supabase.from('invoice_chain').select('id', { count: 'exact', head: true }).eq('source_table', 'payment_invoices'),
  ]);
  return { invoicesRes, chainRes };
};
