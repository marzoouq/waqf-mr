# 🔍 الفحص الجنائي الشامل — نظام وقف مرزوق بن علي الثبيتي
تاريخ: 2026-06-08 · النطاق: كود + DB + Edge + اختبارات + CI

---

## 1) المؤشرات الحية (Forensic Snapshot)

| المؤشر | القيمة | الحكم |
|---|---|---|
| اختبارات Vitest | **2120 ✅ / 1 ❌** (246 ملف) | فشل واحد فقط |
| `audit:gate` (البوابة الحرجة) | **9/9 ✅** | مفتوحة |
| DB Linter | **1 ERROR + 41 WARN** | يحتاج مراجعة |
| دوال `SECURITY DEFINER` في `public` | **85 دالة** (بعضها مكرّر — overloads) | غالبيتها مقصودة |
| تكرار اسم دالة (overloads مشبوهة) | `allocate_icv_and_chain`, `execute_distribution`, `upsert_tenant_payment` | مرشّحات لتنظيف |
| الذاكرة | محدّثة (security memory v2) | متوافقة |
| Husky pre-push | يعمل | البوابة فعّالة |

---

## 2) المشاكل المكتشفة — جذرية ومرتّبة

### 🔴 P0 — فشل اختبار يكسر CI (Blocker)
**الموقع:** `src/lib/diagnostics/checks.test.ts:259-261`
**الجذر:** الاختبار يفترض `10 بطاقات / 44 فحصاً`، بينما `checks.ts` نما إلى **18 بطاقة**. أي إضافة بطاقة جديدة لم تُحدّث الاختبار → expected vs. actual drift.
**الأثر:** كل push يكسر `bun test` (لكن `audit:gate` يمر، لذا لم يُلاحَظ).
**الحل:** حساب العدد ديناميكياً من نفس المصدر بدل hard-coded.

### 🟠 P1 — DB Linter: 1 ERROR
**الموقع:** `contracts_safe` view (SECURITY DEFINER)
**الجذر:** متعمَّد لإخفاء PII (موثّق في `mem://security/views/contracts-safe-rationale` و`docs/security/views.md`).
**الحل:** لا تغيير في الكود — **توثيق التجاهل** في `security-memory` (موجود بالفعل بعد التحديث الأخير).

### 🟠 P1 — DB Linter: 41 WARN على `SECURITY DEFINER` functions
**التصنيف الجنائي:**
- **مقبول مقصود (~36 دالة)**: `has_role`, `get_public_stats`, `check_rate_limit`, `lookup_by_national_id`, triggers (`audit_*`, `prevent_*`, `validate_*`, `sync_*`, `enforce_*`)، cron jobs (`cron_*`).
- **يحتاج تحقق فعلي (~5 دوال)**: `get_dashboard_full_summary`, `get_dashboard_kpis`, `get_expense_summary_by_type`, `get_income_summary_by_source`, `get_year_comparison_summary` — هل تطبّق فلتر دور داخلي؟ إذا لا → تسريب بيانات مالية لأي authenticated.
- **Overloads مكرّرة (3 أسماء)**: `allocate_icv_and_chain`, `execute_distribution`, `upsert_tenant_payment` — تحتاج فحص نسخ قديمة محتملة.

### 🟡 P2 — Auth Linter (من السياق السابق)
- **Leaked Password Protection: OFF** → يجب تفعيل HIBP.
- **OTP expiry > 10m** → خفض لـ 10 دقائق.
*(تعديل لوحة Supabase Auth، ليس migration)*

### 🟡 P2 — دوال SECURITY DEFINER بدون REVOKE صريح
الـ migration السابقة عالجت `clear_zatca_otp` فقط. لم نطبّق نمط `REVOKE EXECUTE ... FROM PUBLIC, anon` على بقية الإدارية الحقيقية (مثل `close_fiscal_year`, `reopen_fiscal_year`, `delete_fiscal_year_cascade`, `approve_disbursement_voucher`, `void_disbursement_voucher`, `execute_distribution`).
**الأثر:** لا ثغرة فعلية (الدوال تتحقق من `has_role` داخلياً)، لكن defense-in-depth ناقصة.

### 🟢 P3 — صحة معمارية (من تقارير `audit/`)
- `pdfHelpers.ts` نظيف الآن (`getLastAutoTableY` يستخدم interface).
- `useContractForm.ts` (228 سطر) يتجاوز الحد 200.
- `aggregatedAnnualReport.ts` يتجاوز الحد.
- 3 `@ts-ignore` غير موثّقة.

### 🟢 P3 — Overloads المكرّرة في DB
- `execute_distribution(uuid)` و`execute_distribution(uuid, numeric)` — تحقق من أن النسخة القديمة لم تعد مستدعاة.
- نفس الأمر لـ `allocate_icv_and_chain` و`upsert_tenant_payment`.

---

## 3) ربط الجذور (Root-Cause Chain)

```text
فشل اختبار checks.test  ──┐
                          ├──> غياب اختبار يقرأ العدد ديناميكياً
نمو diagnosticCategories ─┘     (anti-pattern: hard-coded count)

41 WARN على SEC DEFINER ──┐
                          ├──> لا يوجد سكربت تلقائي يولّد REVOKE
عدد كبير من triggers ─────┘     لكل دالة جديدة → debt تراكمي

5 دوال dashboard مفتوحة ──> فلترة الدور تتم في الواجهة فقط
                            (client-side trust) — مخالف لمذكرة
                            "Server-Side Distribution"
```

---

## 4) خطة الإصلاح المقترَحة (مرتّبة حسب الأثر)

### المرحلة A — فك حظر CI (5 دقائق)
1. تحديث `checks.test.ts:257-262` لقراءة العدد من `diagnosticCategories.length` ومجموع الفحوصات ديناميكياً (الاختبار يصبح: `>=10 بطاقات`، و `كل فحص دالة`).

### المرحلة B — تحقّق أمني فعلي (30 دقيقة، قراءة فقط)
2. استخراج جسم الدوال الخمس (`get_dashboard_*`, `get_*_summary_by_*`, `get_year_comparison_summary`) عبر `pg_get_functiondef` والتحقق من وجود `has_role(...)` داخلياً.
   - إن وُجد → توثيق في security-memory كـ accepted.
   - إن **لم** يوجد → P0 جديدة + migration لإضافة guard.

### المرحلة C — Defense-in-Depth (migration واحدة)
3. تطبيق `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO service_role` على الدوال الإدارية الحقيقية فقط:
   - `close_fiscal_year`, `reopen_fiscal_year`, `delete_fiscal_year_cascade`
   - `approve_disbursement_voucher`, `void_disbursement_voucher`, `create_disbursement_voucher`
   - `execute_distribution` (كلا التوقيعين)
   - `notify_all_beneficiaries`

### المرحلة D — تنظيف Overloads (migration ثانية، اختيارية)
4. حذف النسخ القديمة من `execute_distribution`, `allocate_icv_and_chain`, `upsert_tenant_payment` بعد تأكيد عدم الاستخدام.

### المرحلة E — Auth Hardening (لوحة Supabase، يدوي)
5. تفعيل Leaked Password Protection.
6. خفض OTP expiry لـ 600 ثانية.

### المرحلة F — Tech Debt (اختيارية)
7. تقسيم `useContractForm.ts` و`aggregatedAnnualReport.ts` ليلتزم بحد 200 سطر.
8. توثيق `@ts-ignore` الثلاثة.

---

## 5) ما تم استبعاده عمداً (للحفاظ على السلوك الموثَّق)

- ❌ تعديل `contracts_safe` view → موثّق متعمَّد.
- ❌ تقييد `get_public_stats` → الناظر يتحكم فيها عبر `app_settings`.
- ❌ تقييد `has_role`, `check_rate_limit` → بنية أساسية مقصودة.
- ❌ تشفير الواجهة المرئية للمستفيد — السلوك مطابق للوثائق.

---

## 6) ما الذي يتطلب موافقتك قبل البدء؟

- **A فقط** (إصلاح اختبار) — بدون أثر سلوكي. → آمن.
- **B** (قراءة فقط من DB) — بدون migration. → آمن.
- **C** (migration REVOKE/GRANT) — لا يغيّر سلوك المستخدم، يقفل أبواباً خلفية. → يحتاج موافقة.
- **D/E/F** — كل واحدة قرار مستقل.

أخبرني بأي المراحل تريد البدء (A وحدها، A+B، أو الحزمة الكاملة A→C).
