# تنفيذ المراحل المتبقية (2 → 5)

المرحلتان 0 و 1 منفّذتان بالفعل (إصلاح `contracts_safe` + التوثيق + ignore الـ ERROR). هذه الخطة تكمل البقية.

---

## المرحلة 2 — شبكة تحكم الناظر للإظهار/الإخفاء (طبقة واجهة فقط)

**هدف**: يتحكم الناظر بإظهار/إخفاء عناصر واجهة المستفيد/الواقف/المحاسب من تبويب جديد في الإعدادات. **لا تغيير على RLS أو صلاحيات DB**.

**ملفات جديدة**:
- `src/constants/featureVisibilityRegistry.ts` — سجل مركزي لكل المفاتيح (key, scope, label عربي, lockable).
- `src/hooks/domain/settings/useFeatureVisibility.ts` — يقرأ من نفس استعلام `app-settings-all` الموجود.
- `src/components/common/FeatureGate.tsx` — مكوّن `<FeatureGate featureKey="…">{children}</FeatureGate>`.
- `src/components/settings/FeatureVisibilityGrid.tsx` — شبكة Switch مجمّعة بالنطاق (scope) مع بحث/فلترة وحفظ diff فقط.
- `src/components/settings/FeatureVisibilityGridRow.tsx` — صف داخل الشبكة.
- `src/test/featureVisibility.test.ts` — اختبار Vitest على القراءة والافتراض `visible`.

**تعديلات**:
- `src/pages/admin/SettingsPage.tsx` — إضافة تبويب جديد "إظهار/إخفاء الميزات" (Tab) مرئي للناظر فقط.
- تغليف عدد محدود من widgets المستفيد بـ `<FeatureGate>`: حصتي، السلف، الإفصاح، المرحّل، التوزيع — كل ما هو `lockable: false`. عنصر "الإفصاح القانوني" يبقى `lockable: true` ولا يمكن إخفاؤه.

**التخزين**: مفاتيح `app_settings` بصيغة `feature_visibility.<scope>.<key>` = `"visible"|"hidden"`. الافتراضي `visible` للتوافق الخلفي. سياسات RLS الحالية على `app_settings` تسمح للناظر بالإدارة فقط — لا migration.

**ضمانات**: طبقة عرض بحتة. لا تستبدل أي RLS. عناصر `lockable: true` تظهر في الشبكة معطّلة مع شرح "إلزامي قانونياً/تنظيمياً".

---

## المرحلة 3 — REVOKE لدوال trigger الداخلية فقط (Migration #2)

**خطوة فحص** (read-only) قبل كتابة Migration #2:
```sql
SELECT DISTINCT p.oid::regprocedure AS sig
FROM pg_trigger t
JOIN pg_proc p ON p.oid=t.tgfoid
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname='public'
ORDER BY sig;
```

**معيار الإدراج**: الدالة (أ) مرتبطة بـ trigger فعلياً، و(ب) **غير** مذكورة في `src/**` أو `supabase/functions/**` كـ `.rpc('name')` أو `rpc("name")`.

**استثناءات صريحة لا تُلمس**:
- `custom_access_token_hook`, `get_public_stats`, `log_access_event`.
- `has_role`, `is_fiscal_year_accessible`, `decrypt_pii`, `encrypt_pii`, `get_pii_key`, `get_total_beneficiary_percentage`.
- دوال email queue (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`) — مرحلة لاحقة.
- أي دالة في `docs/security/security-definer-allowlist.md` تحت "لوحات التحكم والتقارير" أو "عمليات Workflow حساسة".

**Migration #2** بتواقيع `regprocedure` حرفية:
```sql
REVOKE EXECUTE ON FUNCTION public.<sig> FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<sig> TO postgres, service_role;
```
مع `COMMENT ON FUNCTION` يشرح "internal trigger; revoked from public roles".

---

## المرحلة 4 — تنظيف allowlist + تحقق نهائي

**تعديلات**:
- `docs/security/security-definer-allowlist.md` — إزالة دوال trigger التي سُحبت من المرحلة 3، إضافة قسم "Trigger-only (REVOKED)".
- `scripts/supabase-lint-check.mjs` — تحديث `ALLOWLIST_0029` وفقاً للقائمة المتبقية.
- `src/test/contractsSafeAccess.test.ts` — اختبار Vitest يتحقق من سلوك التغليف على mocks (admin يرى الكل، beneficiary يرى `***` و `notes=null`).

**تحقق SQL مباشر** (يُجرى عبر `supabase--read_query` بعد كل migration):
- `pg_class.reloptions` لـ `contracts_safe`.
- `has_function_privilege('authenticated', sig, 'EXECUTE') = false` لكل دالة في Migration #2.
- `supabase--linter` ومقارنة العدّ قبل/بعد.

---

## المرحلة 5 — تحسينات `log_access_event` (اختياري ضمن نفس الدفعة)

Migration #3 صغير:
- إضافة truncation داخل الدالة (`left(payload::text, 4000)`).
- قيد event_type ضمن قائمة مغلقة عبر CHECK داخل الدالة.
- rate-limit بسيط: رفض إن تجاوز نفس `ip_address` 60 حدث/دقيقة (جدول صغير `access_event_throttle` مع cleanup).

إن فضّلت تأجيل المرحلة 5، أتوقف بعد المرحلة 4.

---

## الترتيب التنفيذي

1. كتابة ملفات المرحلة 2 (registry, hook, FeatureGate, Grid, tabs, اختبار) ثم تغليف widgets المستفيد.
2. تشغيل فحص `pg_trigger` ومطابقته مع `rg "\.rpc\('"` على `src/` و `supabase/functions/`.
3. Migration #2 (REVOKE trigger functions) — قائمة صريحة فقط.
4. تحديث allowlist + script + اختبار `contractsSafeAccess`.
5. `supabase--linter` مقارنة قبل/بعد + تحقق `has_function_privilege`.
6. (اختياري) Migration #3 لـ `log_access_event`.

## ما لن يتغيّر
- `client.ts`, `types.ts`, `config.toml`, `.env`.
- RLS أو صلاحيات قاعدة بيانات المستفيد/المحاسب/الواقف.
- منطق التوزيع/الإقفال/ZATCA.
- أي دالة في صفحات/Edge Functions.