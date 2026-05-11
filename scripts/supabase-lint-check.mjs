#!/usr/bin/env node
/**
 * Supabase Linter Gate
 * ---------------------
 * يفشل البنية إذا ظهرت تحذيرات أمنية من Supabase Linter
 * (مثل 0028 و 0029) لم تُدرَج في قائمة الاستثناءات الموثّقة.
 *
 * متطلبات البيئة:
 *   - SUPABASE_ACCESS_TOKEN  (Personal Access Token)
 *   - SUPABASE_PROJECT_REF   (project ref)
 *
 * الاستثناءات الموثّقة موجودة في:
 *   docs/security/security-definer-allowlist.md
 *   ومُكوَّدة في ALLOWLIST أدناه.
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.warn('⚠️ SUPABASE_ACCESS_TOKEN أو SUPABASE_PROJECT_REF غير مضبوط — تخطّي فحص Supabase Linter.');
  process.exit(0);
}

// قائمة دوال SECURITY DEFINER المسموح لها بالاستدعاء من المستخدمين المسجلين.
// كل دالة هنا تتحقق من الدور أو ملكية الصف داخلياً قبل تنفيذ أي عملية حساسة.
const ALLOWLIST_0029 = new Set([
  // RLS helpers — تُستدعى من سياسات RLS لكل المستخدمين المصادقين
  'has_role',
  'is_fiscal_year_accessible',
  'get_total_beneficiary_percentage',

  // Dashboards / Reports — تتحقق من الدور وتفلتر بـ auth.uid()
  'get_dashboard_full_summary',
  'get_dashboard_kpis',
  'get_beneficiary_dashboard',
  'get_beneficiary_decrypted',
  'get_expense_summary_by_type',
  'get_income_summary_by_source',
  'get_year_comparison_summary',
  'get_multi_year_summary',
  'get_max_advance_amount',
  'get_public_stats',
  'get_support_analytics',
  'get_support_stats',

  // Workflow RPCs — تتحقق من admin/accountant داخلياً
  'close_fiscal_year',
  'reopen_fiscal_year',
  'execute_distribution',
  'pay_invoice_and_record_collection',
  'unpay_invoice_and_revert_collection',
  'upsert_tenant_payment',
  'upsert_contract_allocations',
  'generate_contract_invoices',
  'generate_all_active_invoices',
  'reorder_bylaws',
  'notify_admins',
  'notify_all_beneficiaries',
  'log_access_event',
  'check_rate_limit',

  // ZATCA chain — تحمي تسلسل ICV، تُستدعى من Edge Functions باسم المستخدم
  'allocate_icv_and_chain',
  'commit_icv_chain',
  'reserve_icv',
  'get_next_icv',
  'get_active_zatca_certificate',
  'clear_zatca_otp',
]);

// قائمة الدوال العامة (anon-callable) المسموح استدعاؤها بدون تسجيل دخول.
// كل دالة هنا موسومة في DB بـ COMMENT يحمل '[anon-callable]'، والـ event trigger
// auto_revoke_anon_execute يحترم هذا الوسم ولا يسحب EXECUTE من anon.
const ALLOWLIST_ANON = new Set([
  'get_public_stats',     // إحصائيات صفحة الهبوط (مفلترة بـ app_settings)
  'log_access_event',     // تسجيل أخطاء العميل قبل تسجيل الدخول
]);

// نوع تحذير Supabase Linter — راجع docs/security/security-definer-allowlist.md
const FAIL_LINTS = new Set([
  '0028_anon_security_definer_function_executable',
  '0029_authenticated_security_definer_function_executable',
]);

const url = `https://api.supabase.com/v1/projects/${REF}/database/lints`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});

if (!res.ok) {
  console.error(`❌ فشل استدعاء Supabase API: ${res.status} ${await res.text()}`);
  process.exit(2);
}

const lints = await res.json();
const offenders = [];

for (const lint of lints) {
  const name = lint.name || '';
  if (!FAIL_LINTS.has(name)) continue;

  // استخراج اسم الدالة من metadata أو detail
  const fnName =
    lint?.metadata?.name ||
    lint?.metadata?.functions?.[0]?.name ||
    (lint.detail || '').match(/function\s+[\w.]*\.?(\w+)/i)?.[1] ||
    null;

  if (name.startsWith('0029') && fnName && ALLOWLIST_0029.has(fnName)) {
    continue; // مسموح وموثّق
  }
  if (name.startsWith('0028') && fnName && ALLOWLIST_ANON.has(fnName)) {
    continue; // anon-callable موثّق ومُعلَّم بـ [anon-callable]
  }

  offenders.push({ lint: name, fn: fnName, detail: lint.detail });
}

// فحص تكميلي: التأكد من أن الدوال anon-callable لم تفقد صلاحية EXECUTE من anon
// (يمنع تكرار انحدار 42501 الذي حدث بعد REVOKE الجماعي السابق)
try {
  const sqlUrl = `https://api.supabase.com/v1/projects/${REF}/database/query`;
  const sqlRes = await fetch(sqlUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        SELECT p.proname,
               has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY(ARRAY[${[...ALLOWLIST_ANON].map((n) => `'${n}'`).join(',')}]);
      `,
    }),
  });
  if (sqlRes.ok) {
    const rows = await sqlRes.json();
    for (const row of rows) {
      if (!row.anon_can_execute) {
        offenders.push({
          lint: 'anon-callable-missing-grant',
          fn: row.proname,
          detail: `الدالة موسومة كـ anon-callable لكن anon لا يملك EXECUTE — انحدار محتمل!`,
        });
      }
    }
  } else {
    console.warn(`⚠️ تعذّر التحقق من صلاحيات anon-callable: ${sqlRes.status}`);
  }
} catch (e) {
  console.warn(`⚠️ خطأ في فحص anon-callable: ${e.message}`);
}

if (offenders.length) {
  console.error(`❌ تحذيرات أمنية غير موثّقة (${offenders.length}):`);
  for (const o of offenders) {
    console.error(`  - [${o.lint}] ${o.fn ?? '(unknown)'} — ${o.detail}`);
  }
  console.error('\nأضف الدالة إلى docs/security/security-definer-allowlist.md و ALLOWLIST_0029 في scripts/supabase-lint-check.mjs بعد المراجعة، أو أصلح المشكلة.');
  process.exit(1);
}

console.log('✅ لا توجد تحذيرات أمنية غير موثّقة (0028/0029).');
