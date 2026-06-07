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

/**
 * Ping `health-check` عبر fetch مباشر — يتجنّب معترض أخطاء SDK
 * ويُتيح قراءة status/زمن/اسم بدقة. 401 = محمية بسر مشترك (متوقع).
 */
export async function checkBackendEdgeHealthPing(): Promise<CheckResult> {
  const id = 'backend_edge_health_ping';
  const fnName = 'health-check';
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}` },
    });
    // استهلاك الجسم لتفادي تسرّب الموارد
    await res.text().catch(() => '');
    const ms = Math.round(performance.now() - t0);
    const detail = `[GET /${fnName}] status=${res.status} ms=${ms}`;
    if (res.status === 200) return { id, label: 'نداء health-check', status: ms < 2000 ? 'pass' : 'warn', detail: `${detail} — سليمة` };
    if (res.status === 401) return { id, label: 'نداء health-check', status: 'pass', detail: `${detail} — محمية بسر (متوقع)` };
    if (res.status === 503) return { id, label: 'نداء health-check', status: 'warn', detail: `${detail} — degraded` };
    return { id, label: 'نداء health-check', status: 'fail', detail };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { id, label: 'نداء health-check', status: 'fail', detail: `[GET /${fnName}] ms=${ms} network_error=${String(e)}` };
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

/**
 * يفحص وجود الحاويات المطلوبة. `listBuckets()` قد يُرجع فارغًا تحت RLS — لذا fallback
 * عبر `from(bucket).list()` للتحقق من وصولية الحاوية فعلياً.
 */
export async function checkBackendStorageBuckets(): Promise<CheckResult> {
  const id = 'backend_storage_buckets';
  const required = ['waqf-assets'];
  try {
    const { data, error } = await supabase.storage.listBuckets();
    const names = (!error && data) ? data.map(b => b.name) : [];
    const missing: string[] = [];
    for (const r of required) {
      if (names.includes(r)) continue;
      // fallback: حاول الوصول للحاوية مباشرة — قد لا تظهر في listBuckets بسبب RLS
      const probe = await supabase.storage.from(r).list('', { limit: 1 });
      if (probe.error && /not found|does not exist/i.test(probe.error.message)) {
        missing.push(r);
      }
    }
    if (missing.length) return { id, label: 'حاويات التخزين', status: 'fail', detail: `مفقود: ${missing.join('، ')}` };
    const total = names.length || required.length;
    return { id, label: 'حاويات التخزين', status: 'pass', detail: `${total} حاوية متاحة` };
  } catch (e) {
    return { id, label: 'حاويات التخزين', status: 'fail', detail: String(e) };
  }
}

export function getExpectedEdgeFunctions(): string[] {
  return [...EXPECTED_EDGE_FUNCTIONS];
}
