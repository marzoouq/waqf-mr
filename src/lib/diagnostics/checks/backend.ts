/**
 * فحوصات Backend & Edge — health-check و auth و storage و edge inventory.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CheckResult } from '../types';

const EXPECTED_EDGE_FUNCTIONS = [
  'admin-manage-users', 'ai-assistant', 'auth-email-hook', 'beneficiary-summary',
  'check-contract-expiry', 'dashboard-summary', 'email-admin', 'generate-invoice-pdf',
  'generate-voucher-pdf', 'guard-signup', 'health-check', 'lookup-national-id',
  'process-email-queue', 'webauthn', 'zatca-onboard', 'zatca-renew', 'zatca-report',
  'zatca-signer', 'zatca-xml-generator',
];

export async function checkBackendEdgeHealthPing(): Promise<CheckResult> {
  const id = 'backend_edge_health_ping';
  const t0 = performance.now();
  try {
    const { error } = await supabase.functions.invoke('health-check', { method: 'GET' });
    const ms = Math.round(performance.now() - t0);
    if (error) {
      // 401 = الدالة فعّالة لكنها محمية بسر مشترك (HEALTH_CHECK_SECRET) — نعتبرها سليمة
      const msg = error.message || String(error);
      if (/401|Unauthorized/i.test(msg)) {
        return { id, label: 'نداء health-check', status: 'pass', detail: `${ms}ms — محمية بسر (401 متوقع)` };
      }
      return { id, label: 'نداء health-check', status: 'warn', detail: `${ms}ms — ${msg}` };
    }
    return { id, label: 'نداء health-check', status: ms < 2000 ? 'pass' : 'warn', detail: `${ms}ms` };
  } catch (e) {
    return { id, label: 'نداء health-check', status: 'fail', detail: String(e) };
  }
}

export async function checkBackendEdgeInventory(): Promise<CheckResult> {
  const id = 'backend_edge_inventory';
  return {
    id,
    label: 'جرد Edge Functions',
    status: 'info',
    detail: `${EXPECTED_EDGE_FUNCTIONS.length} وظيفة متوقَّعة (لا اختبار ping فردي لتفادي ضوضاء الشبكة)`,
  };
}

export async function checkBackendAuthSession(): Promise<CheckResult> {
  const id = 'backend_auth_session_valid';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { id, label: 'صلاحية الجلسة', status: 'warn', detail: error?.message ?? 'لا يوجد user' };
    return { id, label: 'صلاحية الجلسة', status: 'pass', detail: 'الجلسة فعّالة' };
  } catch (e) {
    return { id, label: 'صلاحية الجلسة', status: 'fail', detail: String(e) };
  }
}

export async function checkBackendRoleResolved(): Promise<CheckResult> {
  const id = 'backend_role_resolved';
  try {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { id, label: 'دور المستخدم', status: 'info', detail: 'بدون جلسة' };
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userRes.user.id);
    if (error) return { id, label: 'دور المستخدم', status: 'warn', detail: error.message };
    const roles = (data ?? []).map(r => r.role).join('، ');
    return { id, label: 'دور المستخدم', status: roles ? 'pass' : 'warn', detail: roles || 'لا دور محدد' };
  } catch (e) {
    return { id, label: 'دور المستخدم', status: 'fail', detail: String(e) };
  }
}

export async function checkBackendFiscalYearActive(): Promise<CheckResult> {
  const id = 'backend_fiscal_year_active';
  try {
    const { data, error } = await supabase.from('fiscal_years').select('id, label, status').eq('status', 'active').limit(1).maybeSingle();
    if (error) return { id, label: 'سنة مالية نشطة', status: 'warn', detail: error.message };
    if (!data) return { id, label: 'سنة مالية نشطة', status: 'fail', detail: 'لا توجد سنة نشطة' };
    return { id, label: 'سنة مالية نشطة', status: 'pass', detail: `${data.label}` };
  } catch (e) {
    return { id, label: 'سنة مالية نشطة', status: 'fail', detail: String(e) };
  }
}

export async function checkBackendStorageBuckets(): Promise<CheckResult> {
  const id = 'backend_storage_buckets';
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) return { id, label: 'حاويات التخزين', status: 'warn', detail: error.message };
    const names = (data ?? []).map(b => b.name);
    const required = ['waqf-assets'];
    const missing = required.filter(r => !names.includes(r));
    if (missing.length) return { id, label: 'حاويات التخزين', status: 'fail', detail: `مفقود: ${missing.join('، ')}` };
    return { id, label: 'حاويات التخزين', status: 'pass', detail: `${names.length} حاوية` };
  } catch (e) {
    return { id, label: 'حاويات التخزين', status: 'fail', detail: String(e) };
  }
}

export function getExpectedEdgeFunctions(): string[] {
  return [...EXPECTED_EDGE_FUNCTIONS];
}
