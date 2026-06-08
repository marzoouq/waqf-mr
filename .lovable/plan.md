# مسار A — إغلاق التسريب فوراً عبر REVOKE + تحويل النداءات إلى Edge Functions

## 1. خريطة المستهلكين الفعليين (فحص جنائي للنداءات الحيّة)

| RPC | المستهلك اليوم | الحكم | الإجراء |
|---|---|---|---|
| `get_dashboard_full_summary` | Edge `dashboard-summary` (service_role + تحقق دور) | ✅ آمن | يبقى |
| `get_dashboard_full_summary` | عميل: `src/lib/services/diagnosticsReadService.ts:213` | ❌ تسريب | يتحوّل لاستدعاء Edge `dashboard-summary` |
| `get_multi_year_summary` | عميل: `useMultiYearSummary.ts:22` | ❌ تسريب | يتحوّل لـ Edge جديدة |
| `get_year_comparison_summary` | عميل: `useYearComparisonData.ts:46` | ❌ تسريب | يتحوّل لـ Edge جديدة |
| `get_income_summary_by_source` | Edge `ai-assistant/fetcher.ts:133` فقط | ✅ آمن | لا مستهلك عميل |
| `get_expense_summary_by_type` | Edge `ai-assistant/fetcher.ts:145` فقط | ✅ آمن | لا مستهلك عميل |

**جوهري:** كل دالة لها مستهلك Edge شرعي → نُبقي `GRANT … TO service_role` ونحذف فقط من `authenticated, anon, PUBLIC`.

---

## 2. التعديلات

### 2.1 Edge Functions جديدتان (نفس نمط `dashboard-summary`)

- `supabase/functions/multi-year-summary/index.ts`
  - `authenticate({ allowedRoles: ['admin','accountant','waqif'], rateLimitKey: 'multi-year-summary', parseJsonBody: true })`
  - Zod: `{ year_ids: z.array(z.string().uuid()).min(1).max(20) }`
  - `admin.rpc('get_multi_year_summary', { p_year_ids })`
- `supabase/functions/year-comparison-summary/index.ts`
  - أدوار `['admin','accountant']`، Zod: `{ year1_id: uuid, year2_id: uuid }` + رفض التساوي
  - `admin.rpc('get_year_comparison_summary', …)`

> سأتحقّق فعلياً من استخدام `waqif` لـ multi-year قبل التنفيذ؛ إن لم يُستخدم → تُقصر على admin/accountant.

### 2.2 تعديلات العميل (3 ملفات، بدون تغيير API الهوكات)

- `useMultiYearSummary.ts` → `invoke('multi-year-summary', { body: { year_ids: sortedIds } })`
- `useYearComparisonData.ts` → `invoke('year-comparison-summary', { body: { year1_id, year2_id } })`
- `diagnosticsReadService.getDashboardFullSummary` → `invoke('dashboard-summary', …)` ثم `result.aggregated`

### 2.3 Migration واحدة — REVOKE فقط (غير مدمّرة)

```sql
REVOKE EXECUTE ON FUNCTION public.get_dashboard_full_summary(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_multi_year_summary(uuid[])          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_year_comparison_summary(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_income_summary_by_source(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_expense_summary_by_type(uuid)       FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.get_dashboard_full_summary(uuid)        TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_multi_year_summary(uuid[])          TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_year_comparison_summary(uuid, uuid) TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_income_summary_by_source(uuid)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_expense_summary_by_type(uuid)       TO service_role;
```

تُطبَّق **بعد** نشر العميل + Edge الجديدتين لمنع نافذة كسر.

### 2.4 تحديث ذاكرة الأمن

«دوال الملخصات محصورة على `service_role`؛ تُستدعى حصراً عبر Edge موثَّقة الدور (`dashboard-summary`, `multi-year-summary`, `year-comparison-summary`, `ai-assistant`).»

---

## 3. ترتيب النشر الآمن

1. إنشاء Edge الجديدتين + تعديل 3 ملفات عميل → نشر.
2. التحقق عبر network على preview أن لا نداء RPC مباشر للدوال الخمس.
3. تشغيل Migration REVOKE.
4. اختبار سلبي: `supabase.rpc('get_multi_year_summary', …)` من العميل → `42501 permission denied`.
5. `vitest run` + `bun run audit:gate` + `supabase--linter`.

---

## 4. تفاصيل تقنية

- `authenticate(…)` موجود في `supabase/functions/_shared/auth.ts` — يُعاد استخدامه.
- `invoke` في `src/lib/api/invoke.ts` يتولى `onAuthError` و toast.
- لا تغيير في `supabase/config.toml` (الافتراضي `verify_jwt = false`، المصادقة يدوية).
- لا تعديل على `contracts_safe`, `get_public_stats`, `has_role`, Storage، أو أي ملف محمي.

## المخرجات

- ملفان Edge جديدان.
- 3 تعديلات عميل صغيرة.
- Migration واحد REVOKE/GRANT.
- تحديث ذاكرة الأمن.
