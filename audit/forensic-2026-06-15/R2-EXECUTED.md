# R2 — الجولة المالية (P1) — منجزة

تاريخ التنفيذ: 2026-06-15
المرجع: `00-FINAL-CONSOLIDATED-REPORT.md` (الثغرات العالية 🟠)

## الإصلاحات المُنفّذة

| # | الكود | الموقع | الإصلاح |
|---|---|---|---|
| 1 | W6-019/020 + W7-PERF | migration | فهرسان مركّبان: `idx_payment_invoices_contract_due (contract_id, due_date)` و `idx_invoices_status_date (status, date DESC)` — يُسرّعان عمليات حساب التأخر ولوحة الناظر |
| 2 | W6-015 | migration | دالة مساعدة `assert_fiscal_year_open(uuid)` SECURITY DEFINER ترفع استثناءً عند محاولة عملية على سنة مُقفَلة من غير الناظر |
| 3 | W6-016 | migration | إضافة `FOR UPDATE` على `SELECT * FROM accounts` داخل `execute_distribution` لمنع race condition + استدعاء `assert_fiscal_year_open` |
| 4 | تنظيف | migration | حذف نسخة مكرّرة قديمة من `execute_distribution(uuid, uuid, numeric, jsonb)` (4-arguments بترتيب قديم) — كانت تسبب التباساً في تحميل الزائد |
| 5 | W7-010 | migration + `useAdvanceRequests.ts` | RPC جديد `update_advance_status(p_id, p_status, p_rejection_reason)` بصلاحيات (ناظر/محاسب) + قفل صفي + تحقق تحوّل صالح + حارس السنة المفتوحة. الواجهة الآن تستدعيه بدل `UPDATE` مباشر |
| 6 | W7-015 | migration + `annualReportService.ts` | RPC جديد `set_annual_report_publish(p_fiscal_year_id, p_publish)` بصلاحية الناظر حصراً. خدمة الواجهة الآن تستدعيه بدل `upsert` مباشر — يمنع المحاسب من النشر |

## التحقق

- ✅ Migration نجح بدون أخطاء جديدة
- ✅ Linter: 44 تحذيراً، جميعها سابقة لـ R2 (SECURITY DEFINER warnings على دوال موجودة من قبل، و ERROR الوحيد على `contracts_safe` الموثّق عمداً)
- ✅ Build TypeScript أخضر — الاستيرادات نُظِّفت وعقد الدالة في الواجهة محفوظ
- ✅ الـ RPCs الجديدة استخدمت `REVOKE FROM PUBLIC` + GRANT صريح لـ `authenticated, service_role`
- ✅ الفهارس الجديدة `CREATE INDEX IF NOT EXISTS` — آمنة لإعادة التشغيل

## ما لم يُنفَّذ في R2 (مؤجَّل لجولات لاحقة)

- **W5-003/004/012 + W6-003 (vault.secrets)**: نقل `pii_encryption_key` و ZATCA OTP/private key و `recipient_email` إلى Supabase Vault — يحتاج تأكيد إعداد `vault` على المشروع وخطة rotation. مؤجَّل لـ R4 (التكاملات الخارجية).
- **W6-004 (FK لـ auth.users)**: استبدال المراجع المباشرة بـ `profiles.id` — يتطلب data migration و backfill. مؤجَّل لـ R4 مع خطة rollback.
- **W5-021 (IP hashing)**: تغيير عمود `access_log.ip_address` إلى hash مع salt دوّار — مؤجَّل لـ R4.

## بوابة القبول R2

- [x] Build TypeScript أخضر
- [x] Migration مُطبَّق وفهارس مُنشأة
- [x] `execute_distribution` تستخدم `FOR UPDATE` على الحساب
- [x] `update_advance_status` و `set_annual_report_publish` متاحان عبر RPC وتستدعيهما الواجهة
- [ ] **مطلوب من المستخدم**: تجربة اعتماد/رفض/صرف طلب سلفة من واجهة الناظر
- [ ] **مطلوب من المستخدم**: تجربة نشر تقرير سنوي ثم محاولة نشره من حساب محاسب (يجب أن يُرفَض)

## التالي

قل **"نفّذ R3"** للجولة المعمارية (ESLint rules لمنع `from('contracts')` خارج طبقة admin، توحيد query keys المتبقية، Page Hook pattern للصفحات المخالفة، `scripts/audit-all.mjs` أخضر).
