# 🔍 التقرير الجنائي الشامل — Forensic Report 2026-06-22

> **التاريخ:** 2026-06-22 23:05 UTC  
> **النطاق:** قاعدة البيانات + Edge Functions + المسارات + الهوكات + المكونات + الترابط + الأسرار  
> **الطريقة:** أدوات Lovable (linter / security scan / db_health / fetch_secrets) + استعلامات psql مباشرة + 6 وكلاء جنائيين متوازيين  
> **القيد:** قراءة فقط — لم يُعدَّل أي ملف إنتاج

---

## 1) الملخص التنفيذي

| الخطورة | العدد | الوزن |
|---------|-------|-------|
| 🔴 **Critical** | **2** | يجب إصلاح فوراً |
| 🟠 **High** | **5** | إصلاح خلال 24-48 ساعة |
| 🟡 **Medium** | **9** | تخطيط للإصلاح خلال أسبوع |
| 🟢 **Low / Info** | **23+** | تنظيف/توثيق |

| الطبقة | الحالة العامة |
|--------|---------------|
| قاعدة البيانات (M1) | 🟡 جيدة مع 3 ثغرات حرجة/عالية يجب معالجتها |
| Edge Functions (M2) | 🟢 ممتازة — لا حرجات، عيوب تسجيل أخطاء فقط |
| التوجيه والصفحات (M3) | 🟢 سليمة — كل 41 مساراً محمياً، لا صفحات يتيمة |
| طبقات الهوكات (M4) | 🟢 سليمة — 3 انتهاكات صغيرة فقط |
| مكونات الواجهة (M5) | 🟢 جيدة — مخالفات tokens بسيطة (7) |
| الترابط (M6) | 🟡 7 hooks ميتة + Edge يتيمة + خطأ تبديل cache واحد |
| الأسرار والمفاتيح (M7) | 🔴 `.env` متعقَّب في git — يجب رفعه فوراً |

---

## 2) أبرز 10 ملاحظات حرجة (Top Findings)

### 🔴 F1 — سياسة storage عامة على bucket `invoices` (Critical)
- **الموقع:** `pg_policies` على `storage.objects`، اسم السياسة `Authenticated users can view invoices`
- **الدليل المباشر:** `cmd=SELECT, qual=(bucket_id='invoices' AND auth.role()='authenticated')`
- **الأثر:** أي مستخدم مسجَّل (شامل beneficiary / waqif غير المخوّلين) يستطيع تنزيل أي ملف فاتورة. RLS permissive ⇒ سياسة واحدة true تكفي.
- **⚠️ تصحيح R11:** التقرير السابق `R11-VERIFICATION.md` اعتبر السياسة "غير موجودة" — استعلام مباشر اليوم يُثبت وجودها فعلاً على Live. R11 كان خطأ، ليس scanner cache.
- **الإصلاح:** `DROP POLICY "Authenticated users can view invoices" ON storage.objects;`
- **التفصيل:** §M1/C1

### 🔴 F2 — `.env` متعقَّب في git (Critical)
- **الموقع:** `git ls-files .env` يُرجع الملف موجوداً في index
- **الأثر:** القيم الحالية anon (آمنة بطبيعتها) لكن أي مطور يضيف `SERVICE_ROLE_KEY` يكشفه فوراً. CI gate في `.github/workflows/ci.yml` يكتشف هذا.
- **الإصلاح:** `git rm --cached .env && git commit -m "security: untrack .env"` ثم تدقيق `git log --all -p -- .env`
- **التفصيل:** §M7/CRIT-1

### 🟠 F3 — كل SECURITY DEFINER functions قابلة للتنفيذ من anon (High)
- **العدد:** ≥70 دالة في `public.*` بينها: `decrypt_pii`, `get_pii_key`, `encrypt_zatca_private_key`, `consume_zatca_otp`, `delete_fiscal_year_cascade`, `close_fiscal_year`, `execute_distribution`
- **الدليل:** `has_function_privilege('anon', oid, 'EXECUTE') = true` لكل SECURITY DEFINER في public
- **الأثر:** يكشف سطح هجوم واسع حتى مع وجود `auth.uid()` داخل الدوال
- **الإصلاح:** `REVOKE EXECUTE ON FUNCTION public.<fn> FROM PUBLIC, anon;` لكل الدوال ثم GRANT صريح للـ roles المعنية. trigger `auto_revoke_anon_execute` موجود لكن لا يُفعَّل تلقائياً.
- **التفصيل:** §M1/C3

### 🟠 F4 — `useBylaws` queryKey mismatch ⇒ invalidation miss (High)
- **الموقع:** `src/hooks/data/content/useBylaws.ts`
- **المشكلة:** crudFactory مسجَّل بمفتاح `'waqf_bylaws'` بينما `invalidateQueries` يستخدم `contentKeys.bylaws = ['content','bylaws']` ⇒ مفاتيح متباينة ⇒ الـ mutations لا تُبطل cache القائمة
- **الأثر:** UI يعرض بيانات قديمة بعد التعديل
- **الإصلاح:** وحّد المفتاح في كلا الموضعين
- **التفصيل:** §M6/Query Keys

### 🟠 F5 — 1,162,697 معاملة مرتدة منذ آخر تشغيل (High)
- **المصدر:** `supabase--db_health`
- **الأثر:** trigger/constraint يفشل بشكل متكرر أو RLS rejects متراكمة
- **الإصلاح:** تحقق من `pg_stat_database.xact_rollback` و logs، احتمالاً قراءة فاشلة على `audit_log` أو `webauthn_challenges`

### 🟠 F6 — `auth-email-hook` يسجّل كائن الخطأ كاملاً (High)
- **الموقع:** `supabase/functions/auth-email-hook/index.ts:317`
- **الكود:** `console.error('Webhook handler error:', error)` — قد يكشف email/token/URL في السجلات
- **الإصلاح:** `error instanceof Error ? error.message : 'unknown'`

### 🟠 F7 — `email-admin` يعيد رسائل الخطأ الداخلية للعميل (High)
- **الموقع:** `supabase/functions/email-admin/index.ts:140,149`
- **الكود:** `JSON.stringify({ ok: true, moved: movedCount, error: lastError })` — تفاصيل pgmq schema تصل العميل
- **الإصلاح:** رسالة عامة بالعربية فقط

### 🟡 F8 — Edge Function `beneficiary-summary` يتيمة (Medium)
- **الموقع:** `supabase/functions/beneficiary-summary/`
- **المشكلة:** الدالة مُنشَرة لكن لا يوجد `invoke('beneficiary-summary')` في أي مكان في src
- **الإصلاح:** احذف الدالة أو اربطها بصفحة `BeneficiaryDashboard`

### 🟡 F9 — Toast داخل `hooks/data/` (Medium)
- **الملفات:** `useNotificationActions.ts:11`, ملف ثاني في data (تفاصيل في M4)
- **انتهاك:** memory rule "No Toast in Data Hooks"
- **الإصلاح:** انقل الإشعارات إلى wrapper في `hooks/page/`

### 🟡 F10 — تناقض توثيقي في `routeRoles.ts` (Medium)
- **الموقع:** `src/constants/routeRoles.ts:5-8`
- **التعليق يقول:** "39 مسار، 17 ADMIN_ROLES + 5 ADMIN_ONLY"
- **الواقع:** 41 مسار، 16 ADMIN_ROLES + 8 ADMIN_ONLY (يطابق `EXPECTED_ROUTE_COUNT=41`)
- **الإصلاح:** تحديث التعليق فقط — لا أثر وظيفي

---

## 3) ما تم التحقق منه وكان نظيفاً ✅

### قاعدة البيانات
- ✅ كل جداول `public` لديها RLS مفعّل
- ✅ كل جدول لديه ≥1 policy
- ✅ كل دالة SECURITY DEFINER لديها `set search_path`
- ✅ كل foreign key لديه index
- ✅ الأدوار في `user_roles` فقط (لا profile/localStorage)
- ✅ `contracts_safe` بـ `security_invoker=off` مقصود وموثَّق
- ✅ `invoices` و `disbursement-vouchers` buckets خاصة

### Edge Functions
- ✅ صفر استخدام لـ `getSession()` — كلها `getUser()`
- ✅ CORS موحّد عبر `_shared/auth.ts`
- ✅ Zod validation موجود في كل الدوال التي تقرأ body
- ✅ تحقق الدور (`allowedRoles`) مطبَّق في كل دالة حساسة
- ✅ SERVICE_ROLE_KEY يُستخدم فقط حيث مبرَّر (signup/cron/webhook)
- ✅ `lookup-national-id` محمي بـ rate-limit ثنائي + Luhn + SHA-256

### التوجيه
- ✅ كل 41 مساراً محمياً بالدور الصحيح
- ✅ NotFound (`*`) يعمل
- ✅ Lazy loading + Suspense مغطّى مركزياً في `RootLayout`
- ✅ صفر صفحات يتيمة
- ✅ صفر روابط مكسورة في `NavLink`/`Link`

### الهوكات
- ✅ صفر استخدام مباشر لـ supabase في `pages/` أو `components/`
- ✅ صفر `console.*` خارج `logger.ts`
- ✅ صفر barrel-of-barrels
- ✅ صفر استيراد `@/hooks/data` من `utils/`

### الواجهة
- ✅ `lang="ar"` و `dir="rtl"` في `index.html`
- ✅ كل `<img>` لديه `alt`
- ✅ صفحة واحدة H1
- ✅ كل Tabs مكتملة (Triggers ↔ Contents)

### الأسرار
- ✅ صفر JWT خارج `.env` و `client.ts`
- ✅ صفر مفاتيح خاصة (RSA/EC) في الكود
- ✅ صفر مفاتيح Stripe/payment
- ✅ صفر `console.log(Deno.env.get(...))`
- ✅ `auth-email-hook` يستخدم `maskEmail()` في السجلات
- ✅ `gitleaks-action` مفعّل في CI

### الترابط
- ✅ صفر تسريبات realtime — كل `.channel()` يمر بـ `useBfcacheSafeChannel`
- ✅ صفر invoke() باسم غير صحيح
- ✅ صفر FK مكسور

---

## 4) تفصيل الملاحظات حسب التقرير

| ID | Severity | Area | Location | Recommendation | Ref |
|----|----------|------|----------|----------------|-----|
| F1 | 🔴 Critical | Storage RLS | `storage.objects` | DROP loose policy | M1 |
| F2 | 🔴 Critical | Secrets | `.env` | `git rm --cached` | M7 |
| F3 | 🟠 High | DB Privileges | `public.*` SECURITY DEFINER | REVOKE EXECUTE from anon | M1 |
| F4 | 🟠 High | React Query | `useBylaws.ts` | Unify queryKey | M6 |
| F5 | 🟠 High | DB Health | DB-wide | Investigate rollback source | M1 |
| F6 | 🟠 High | Edge | `auth-email-hook/index.ts:317` | Sanitize error log | M2 |
| F7 | 🟠 High | Edge | `email-admin/index.ts:140` | Don't return raw error | M2 |
| F8 | 🟡 Medium | Edge | `beneficiary-summary/` | Delete or wire up | M6 |
| F9 | 🟡 Medium | Hooks | `useNotificationActions.ts` | Move toast to page hook | M4 |
| F10 | 🟡 Medium | Docs | `routeRoles.ts:5-8` | Fix header comment | M3 |
| F11 | 🟡 Medium | Edge | `generate-voucher-pdf:103` | Don't log stack trace | M2 |
| F12 | 🟡 Medium | Edge | `zatca-signer:249` + `zatca-onboard:126` + `zatca-renew:88` | Sanitize CSR/signing errors | M2 |
| F13 | 🟡 Medium | Edge | `beneficiary-summary/index.ts:46` | Drop PII columns from SELECT | M2 |
| F14 | 🟡 Medium | Edge | `health-check` | Use ANON_KEY not SERVICE_ROLE | M2 |
| F15 | 🟡 Medium | Storage | duplicate SELECT policies on `invoices` | Cleanup 5 overlapping policies | M1 |
| F16 | 🟡 Medium | Routes | `/waqif` hardcoded roles | Add `WAQIF_ROLES` constant | M3 |
| F17 | 🟢 Low | UI | `SignaturePad.tsx:61` `#0f172a` | Use `hsl(var(--foreground))` | M5 |
| F18 | 🟢 Low | UI | 7 hex colors total | Tokenize | M5 |
| F19 | 🟢 Low | Dead Code | 7 hooks/data files unused | Remove or document | M6 |
| F20 | 🟢 Low | Query Keys | 5 raw-string keys vs typed factories | Standardize | M6 |
| F21 | 🟢 Low | Edge | `auth.test.ts:4` `REAL_KEY` var name | Rename to `MOCK_KEY` | M7 |
| F22 | 🟢 Low | Edge | `guard-signup:135` HIBP error log | Reduce detail | M2 |
| F23 | 🟢 Low | Routes | `/dashboard/audit-report-final`, `/cleanup-report` lack icon | Add or document | M3 |
| F24 | 🟢 Low | Storage | `waqf-assets` bucket public | Intentional — documented | M1/M2 |
| F25 | 🟢 Low | Edge | `auth-email-hook` CORS `*` | Intentional + documented | M2 |
| F26 | 🟢 Info | DB | Memory 59%, disk 60% | Watch `access_log_archive` autovacuum | M1 |

---

## 5) الأولويات المقترحة

| الأولوية | المهمة | الموعد |
|----------|--------|--------|
| 🔥 الآن | F1: إسقاط policy "Authenticated users can view invoices" | فوراً |
| 🔥 الآن | F2: `git rm --cached .env` | فوراً |
| ⚡ اليوم | F3: REVOKE EXECUTE من anon على دوال PII الحساسة على الأقل | 24h |
| ⚡ اليوم | F4: إصلاح queryKey في useBylaws | 24h |
| ⚡ اليوم | F6, F7: تعقيم error logs في edge functions | 24h |
| 📅 الأسبوع | F5: تحقيق مصدر rolled-back transactions | 1 أسبوع |
| 📅 الأسبوع | F8-F16: تنظيف Medium | 1 أسبوع |
| 🧹 جولة تنظيف | F17-F26: Low/Info | حسب الإمكان |

---

## 6) ملفات تفصيلية

- 📄 [M1 — Database & RLS](./M1-database-rls.md)
- 📄 [M2 — Edge Functions](./M2-edge-functions.md)
- 📄 [M3 — Routes & Pages](./M3-routes-pages.md)
- 📄 [M4 — Hooks Layering](./M4-hooks-layering.md)
- 📄 [M5 — Components & UI](./M5-components-ui.md)
- 📄 [M6 — Integration Matrix](./M6-integration-matrix.md)
- 📄 [M7 — Secrets & Keys](./M7-secrets-keys.md)

## 7) تأكيد ما لم يُنفَّذ

- لم يُعدَّل أي ملف إنتاج
- لم يُنشأ أي migration
- لم تُعدَّل أي سياسة RLS أو دالة
- لم يُحذف/يُنشر/يُعدَّل أي Edge Function
- لم تُحدَّث Security Memory
- جميع الإصلاحات أعلاه **اقتراحات** تنتظر موافقتك لتُنفَّذ في جولة لاحقة

---
*تم توليد التقرير بواسطة 6 وكلاء explore متوازيين + استعلامات DB مباشرة + linter/scan.*
