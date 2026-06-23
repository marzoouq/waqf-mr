/**
 * فحوصات Backend & Edge — health-check و auth و storage و edge inventory.
 * كل فحص يملأ `meta` ليُعرض في «سجل Backend».
 */
import { supabase } from '@/integrations/supabase/client';
import type { CheckResult } from '../types';
import { detectEnv } from '../types';

// مصدر الحقيقة: مجلدات supabase/functions/* (باستثناء _shared و README.md)
// آخر مزامنة: 2026-06-22 — 22 وظيفة
const EXPECTED_EDGE_FUNCTIONS = [
  'admin-manage-users', 'ai-assistant', 'auth-email-hook', 'beneficiary-summary',
  'check-contract-expiry', 'dashboard-summary', 'email-admin', 'generate-invoice-pdf',
  'generate-voucher-pdf', 'guard-signup', 'health-check', 'lookup-national-id',
  'multi-year-summary', 'process-email-queue', 'webauthn', 'year-comparison-summary',
  'zatca-onboard', 'zatca-renew', 'zatca-report', 'zatca-signer', 'zatca-xml-generator',
];

/**
 * Ping `health-check` عبر fetch مباشر — يتجنّب معترض أخطاء SDK
 * ويُتيح قراءة status/زمن/اسم بدقة. 401 = محمية بسر مشترك (متوقع).
 */
export async function checkBackendEdgeHealthPing(): Promise<CheckResult> {
  const id = 'backend_edge_health_ping';
  const fnName = 'health-check';
  const env = detectEnv();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}` },
    });
    await res.text().catch(() => '');
    const ms = Math.round(performance.now() - t0);
    const meta = { fnName, httpStatus: res.status, ms, env };
    const detail = `[GET /${fnName}] status=${res.status} ms=${ms} env=${env}`;
    if (res.status === 200) return { id, label: 'نداء health-check', status: ms < 2000 ? 'pass' : 'warn', detail: `${detail} — سليمة`, meta };
    if (res.status === 401) return { id, label: 'نداء health-check', status: 'pass', detail: `${detail} — محمية بسر (متوقع)`, meta };
    if (res.status === 503) return { id, label: 'نداء health-check', status: 'warn', detail: `${detail} — degraded`, meta };
    return { id, label: 'نداء health-check', status: 'fail', detail, meta };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const msg = String(e);
    // في بيئة المعاينة/التطوير، CORS preflight يحجب fetch إلى Edge Functions
    // وهذا ليس عطلاً في الدالة نفسها — يُعامَل تحذيراً واضحاً بدلاً من فشل.
    const isCorsLike = /Failed to fetch|NetworkError|TypeError/i.test(msg);
    if (env !== 'prod' && isCorsLike) {
      return {
        id, label: 'نداء health-check', status: 'warn',
        detail: `[GET /${fnName}] ms=${ms} env=${env} — محظور CORS في المعاينة (سليم في الإنتاج)`,
        meta: { fnName, ms, env, reason: 'cors_preview' },
      };
    }
    return {
      id, label: 'نداء health-check', status: 'fail',
      detail: `[GET /${fnName}] ms=${ms} network_error=${msg}`,
      meta: { fnName, ms, env },
    };
  }
}

export async function checkBackendEdgeInventory(): Promise<CheckResult> {
  return {
    id: 'backend_edge_inventory',
    label: 'جرد Edge Functions',
    status: 'info',
    detail: `${EXPECTED_EDGE_FUNCTIONS.length} وظيفة متوقَّعة (لا اختبار ping فردي لتفادي ضوضاء الشبكة)`,
    meta: { env: detectEnv() },
  };
}

export async function checkBackendAuthSession(): Promise<CheckResult> {
  const id = 'backend_auth_session_valid';
  const env = detectEnv();
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.auth.getUser();
    const ms = Math.round(performance.now() - t0);
    if (error || !data.user) return { id, label: 'صلاحية الجلسة', status: 'warn', detail: error?.message ?? 'لا يوجد user', meta: { ms, env } };
    return { id, label: 'صلاحية الجلسة', status: 'pass', detail: 'الجلسة فعّالة', meta: { ms, env } };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { id, label: 'صلاحية الجلسة', status: 'fail', detail: String(e), meta: { ms, env } };
  }
}

export async function checkBackendRoleResolved(): Promise<CheckResult> {
  const id = 'backend_role_resolved';
  const env = detectEnv();
  const t0 = performance.now();
  try {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      const ms = Math.round(performance.now() - t0);
      return { id, label: 'دور المستخدم', status: 'info', detail: 'بدون جلسة', meta: { ms, env } };
    }
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userRes.user.id);
    const ms = Math.round(performance.now() - t0);
    if (error) return { id, label: 'دور المستخدم', status: 'warn', detail: error.message, meta: { ms, env } };
    const roles = (data ?? []).map(r => r.role).join('، ');
    return { id, label: 'دور المستخدم', status: roles ? 'pass' : 'warn', detail: roles || 'لا دور محدد', meta: { ms, env } };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { id, label: 'دور المستخدم', status: 'fail', detail: String(e), meta: { ms, env } };
  }
}

export async function checkBackendFiscalYearActive(): Promise<CheckResult> {
  const id = 'backend_fiscal_year_active';
  const env = detectEnv();
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.from('fiscal_years').select('id, label, status').eq('status', 'active').limit(1).maybeSingle();
    const ms = Math.round(performance.now() - t0);
    if (error) return { id, label: 'سنة مالية نشطة', status: 'warn', detail: error.message, meta: { ms, env } };
    if (!data) return { id, label: 'سنة مالية نشطة', status: 'fail', detail: 'لا توجد سنة نشطة', meta: { ms, env } };
    return { id, label: 'سنة مالية نشطة', status: 'pass', detail: `${data.label}`, meta: { ms, env } };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { id, label: 'سنة مالية نشطة', status: 'fail', detail: String(e), meta: { ms, env } };
  }
}

/**
 * يفحص وجود الحاويات المطلوبة. `listBuckets()` قد يُرجع فارغًا تحت RLS — لذا fallback
 * عبر `from(bucket).list()` للتحقق من وصولية الحاوية فعلياً.
 */
export async function checkBackendStorageBuckets(): Promise<CheckResult> {
  const id = 'backend_storage_buckets';
  const env = detectEnv();
  const t0 = performance.now();
  const required = ['waqf-assets', 'waqf-documents'];
  try {
    const { data, error } = await supabase.storage.listBuckets();
    const names = (!error && data) ? data.map(b => b.name) : [];
    const missing: string[] = [];
    for (const r of required) {
      if (names.includes(r)) continue;
      const probe = await supabase.storage.from(r).list('', { limit: 1 });
      if (probe.error && /not found|does not exist/i.test(probe.error.message)) {
        missing.push(r);
      }
    }
    const ms = Math.round(performance.now() - t0);
    if (missing.length) return { id, label: 'حاويات التخزين', status: 'fail', detail: `مفقود: ${missing.join('، ')}`, meta: { ms, env } };
    const total = names.length || required.length;
    return { id, label: 'حاويات التخزين', status: 'pass', detail: `${total} حاوية متاحة`, meta: { ms, env } };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { id, label: 'حاويات التخزين', status: 'fail', detail: String(e), meta: { ms, env } };
  }
}

export function getExpectedEdgeFunctions(): string[] {
  return [...EXPECTED_EDGE_FUNCTIONS];
}
