# مراجعة @security-memory ومزامنته مع الكود الحالي

## نتائج آخر فحص أمني (scan tool)

| # | الماسح | الخطورة | البند | الواقع |
|---|---|---|---|---|
| S1 | agent_security | 🔴 error | `isServiceRole_bypass` — `_shared/auth.ts` يفك JWT دون تحقق من التوقيع. `process-email-queue` و `check-contract-expiry` قابلة للاستدعاء بأي JWT مزيف يحوي `role=service_role` | **ثغرة حقيقية** |
| S2 | supabase_lov | 🔴 error | `invoices_bucket_broad_authenticated_read` — سياسة Storage `Authenticated users can view invoices` permissive تعطي أي مستخدم مسجّل قراءة الـ bucket الخاص (XML/ZATCA/VAT) متجاوزةً السياسة المبنية على الأدوار | **ثغرة حقيقية** |
| S3 | supabase_lov | 🟡 warn | `webauthn_credentials_admin_read` — admin يقرأ `public_key`/`credential_id` لكل المستخدمين بما فيهم admins آخرين (fingerprinting) | **مقبول مع توثيق** |
| S4 | supabase_lov | 🟡 warn | `contracts_fiscal_year_null_bypass` — موصوف ذاتياً بأنه false alarm | **يُجاهَل** |

## تناقضات الذاكرة الحالية مع الواقع

1. `security/security-memory` السابقة وثّقت أن "raw PII queries محمية بـ RLS" لكنها **لم تذكر** أن:
   - `_shared/auth.ts.isServiceRole()` يثق بـ JWT غير موقّع — يحتاج تنبيه صريح.
   - bucket `invoices` يحتوي سياسة permissive مكرّرة يجب حذفها (تختلف عن `waqf-assets` العام عمداً).
2. لم تُذكر سياسة `webauthn_credentials` admin-read كمخاطرة مقبولة.
3. ذاكرة `Public Storage Rationale` تغطي `waqf-assets` فقط — لا تميّز عن `invoices` (private).

## الخطة المقترحة

### مرحلة 1 — تحديث `@security-memory` (الآن، لا كود)

استبدال محتوى security-memory بمحتوى يعكس بدقة:
- **What should never happen:**
  - ثقة بـ JWT دون تحقق توقيع (S1) — `isServiceRole()` الحالي مخالف، يجب استبداله بـ `CRON_SECRET` shared secret + `timingSafeEqual`.
  - سياسة Storage permissive تتجاوز فحص الدور (S2) — حذف `Authenticated users can view invoices`.
  - استخدام `getSession()` في Edge Functions — يجب `getUser()`.
  - تخزين الأدوار خارج `user_roles`.
  - تخزين `fiscal_year_id` في `localStorage`.
- **Accepted risks (موثّقة):**
  - `webauthn_credentials` admin read across users (S3) — مقبول لأن admin مالك العمليات؛ التهديد fingerprinting داخلي محدود.
  - bucket `waqf-assets` عام عمداً (PDFs + email templates) — موثّق في `mem://security/storage/waqf-assets-public-bucket-rationale`.
  - 69 دالة `SECURITY DEFINER` callable من `authenticated` — كل واحدة تتحقق من الدور داخلياً أو تفلتر بـ `auth.uid()`، موثّقة في `docs/security/security-definer-allowlist.md`.
  - `contracts.fiscal_year_id IS NULL` للأدوار غير admin/accountant — مرفوض بالفعل عبر `is_fiscal_year_accessible()`.
- **Not vulnerabilities (لا تنشَأ تنبيهات لها):**
  - استعلامات `from('contracts')` / `from('beneficiaries')` بأعمدة PII من hooks الإدارية — محميّة بـ RLS تمنع الأدوار الخارجية كلياً.
  - استعلامات `dataFetcher.ts` تستبعد `national_id` و `bank_account` بشكل صريح.
  - `EmailMonitorPage` ADMIN_ONLY عمداً (PII البريد + diagnostic + retry/DLQ).

### مرحلة 2 — تنفيذ إصلاحات الثغرات الحقيقية (جولة منفصلة، تتطلب موافقة)

**S1 — Cron JWT bypass:**
- إضافة secret `CRON_SECRET` عبر secrets tool.
- استبدال `isServiceRole()` في `supabase/functions/_shared/auth.ts` بدالة جديدة `isCronAuthorized(req)` تقارن `Authorization: Bearer <CRON_SECRET>` بـ `timingSafeEqual`.
- تحديث `process-email-queue` و `check-contract-expiry` لاستخدامها.
- تحديث pg_cron jobs لتمرير الـ secret في الـ header.

**S2 — Invoices bucket permissive policy:**
- migration: `DROP POLICY "Authenticated users can view invoices" ON storage.objects;`
- الاعتماد على `Role-based users can view invoices` فقط.
- اختبار تكاملي يتحقق أن beneficiary لا يستطيع تنزيل invoices.

### مرحلة 3 — تأكيد لا تراجع

- إعادة تشغيل `security--run_security_scan` بعد التنفيذ.
- التأكد من اختفاء S1 و S2 من نتائج الفحص.

---

## ما سأفعله فور الموافقة

1. استدعاء `security--update_memory` بمحتوى محدّث يعكس البنود أعلاه (مرحلة 1 فقط).
2. **لن أعدّل أي كود مصدر** في هذه الجولة — أنت في plan mode.

هل تريد:
- (أ) تنفيذ **مرحلة 1 فقط** (تحديث security-memory الآن)؟
- (ب) تنفيذ **مرحلة 1 + مرحلة 2** (تحديث الذاكرة + إصلاح S1 و S2 الفعلي)؟
- (ج) إضافة إصلاح P1/P2/P3 من التقرير السابق لنفس الجولة؟
