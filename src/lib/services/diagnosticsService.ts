/**
 * خدمة استعلامات التشخيص — تجريد لطبقة قاعدة البيانات
 * تُستخدم من utils/diagnostics/checks/ بدلاً من استيراد Supabase مباشرة
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
