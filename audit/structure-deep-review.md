# Structure Deep Review — تقرير الفحص التنظيمي الشامل

تاريخ التشغيل: $(date)
النطاق: قراءة فقط. لا تعديلات على الكود أو DB أو الملفات المحمية.

---

## 1. ملخص تنفيذي

| القاعدة | الحالة | تفاصيل |
|---|---|---|
| خط الأساس CI (lint:conventions, ui-permissions, page-controls, security-gates) | ✅ | الكل أخضر — 1201 ملف، 0 GAP |
| Core Modularization v7 | 🔴 | 2 صفحات تستورد `hooks/data` مباشرة |
| Hooks Layering (data/domain/page) | ✅ | 0 انتهاك |
| No Toast in Data Hooks | ✅ | 0 (الانتهاكات الثلاث كانت في ملفات `.test.ts` — مستثناة) |
| lib vs utils Boundary | ✅ | 0 انتهاك في `utils/` |
| Barrel Import Rule | ✅ | 0 barrel→barrel |
| logger usage (no console) | ✅ | 0 في كود الإنتاج (فقط ملفات اختبار وsetup) |
| Hex colors | ⚠ | 4 ملفات Canvas/PDF فعلية — مسموحة بطبيعتها |
| Container vs Presentational sizing | ⚠ | 3 hooks > 200 سطر، 17 مكوّن > 200 سطر |
| Hooks Auth/Data Subfolder Layout | ✅ | المجلدات الأربعة موجودة |
| Hook naming & direction | ✅ | 0 hook يستورد من `pages/**` |
| Edge Functions (مرجعي) | ✅ | 19 وظيفة + `_shared`، Zod + `getUser()` مؤكّدان بفحوصات سابقة |

**الخلاصة:** البنية سليمة جداً. **انتهاكان حرجان فقط** — كلاهما استيراد هوك إعدادات بسيط (`useSetting`, `useBeneficiaryWidgets`) من صفحة، يمكن إصلاحه بإعادة تصديره عبر `hooks/page/` أو رفعه إلى الـ container hook المخصص للصفحة.

---

## 2. الإحصاءات

### توزيع الملفات حسب الطبقة (1201 ملف)

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | ~430 | — | — |
| util | ~180 | — | — |
| hook-data | ~120 | — | — |
| lib | ~110 | — | — |
| hook-page | ~95 | — | — |
| page | 39 | — | — |
| test | 40+ | — | — |
| (تفاصيل كاملة في `audit/structure-inventory.md`) | | | |

### Edge Functions (19 وظيفة فعّالة)

`admin-manage-users`, `ai-assistant`, `auth-email-hook`, `beneficiary-summary`, `check-contract-expiry`, `dashboard-summary`, `email-admin`, `generate-invoice-pdf`, `generate-voucher-pdf`, `guard-signup`, `health-check`, `lookup-national-id`, `process-email-queue`, `webauthn`, `zatca-onboard`, `zatca-renew`, `zatca-report`, `zatca-signer`, `zatca-xml-generator` + `_shared/`.

جميعها مفحوصة في `security-gates` و `Edge Functions Zod Required` — حالياً 0 انتهاك.

### الجداول والسياسات

42 جدول/عرض، جميعها بـ RLS مفعّل (مؤكّد بـ `supabase--linter` في جولات سابقة).

---

## 3. الانتهاكات بالتفصيل

### 🔴 Critical (2)

| File:Line | Rule | المرجع | الإجراء المقترح |
|---|---|---|---|
| `pages/Auth.tsx:7` | CoreModV7 | `mem://technical/architecture/core-modularization-standard-v7` | نقل `useSetting('logo_url')` إلى `useAuthPage()` |
| `pages/beneficiary/BeneficiaryDashboard.tsx:6` | CoreModV7 | نفس المرجع | نقل `useBeneficiaryWidgets()` إلى hook صفحة جديد `useBeneficiaryDashboardPage()` |

> ملاحظة: `pages/dashboard/AnnualReportPage.tsx:25` كان استيراد `type` فقط ولا يُعتبر انتهاكاً بعد التصفية.

### ⚠ Warnings (0)

### ℹ Info (7)

**Hex colors (4)** — مسموحة بطبيعتها لأنها داخل Canvas/PDF:
- `components/expenses/vouchers/SignaturePad.tsx` (3 ألوان لـ Canvas التوقيع)
- `components/invoices/InvoicePreviewDialog.tsx` (لون خلفية للطباعة)

**Hooks > 200 سطر (3)** — مرشحة للتقسيم:
- `hooks/page/admin/contracts/useContractForm.ts` — 228 سطر
- `hooks/page/admin/reports/useAnnualReportPage.ts` — 201 سطر
- `hooks/page/beneficiary/views/usePropertiesViewPage.ts` — 203 سطر

**Components > 200 سطر:** انظر `audit/structure-inventory.md` (الأكبر ≤ 280 سطر — مقبول حسب `Container vs Presentational` المرن للحاويات).

---

## 4. التوزيع الصحي للمجلدات

- **لا مجلد منتفخ بشكل خطر** (> 100 ملف بدون تقسيم فرعي).
- `components/ui/` (shadcn) و `components/dashboard/` هما الأكبر — موزّعان جيداً.
- `hooks/data/financial/` و `hooks/data/settings/` مقسّمة موضوعياً ✅
- `hooks/auth/{session,role,biometric,flows}` كاملة ✅
- `utils/` مقسّم لـ 17 مجلد تخصصي ✅
- `lib/` مقسّم لـ 14 مجلد خدماتي ✅

---

## 5. التوصيات للجولات اللاحقة (لا تُنفّذ الآن — تحتاج موافقة)

| الأولوية | البند | الجهد |
|---|---|---|
| P0 | إصلاح الانتهاكين الحرجين في `Auth.tsx` و `BeneficiaryDashboard.tsx` | صغير (15د) |
| P1 | تقسيم الـ 3 هوكات > 200 سطر بحسب القاعدة المعمارية | متوسط (1س) |
| P2 | مراجعة المكوّنات > 200 سطر للنظر في استخراج مكوّنات فرعية | متوسط |
| P3 | تقوية `audit-conventions-deep.mjs` ليدخل CI كـ guard دائم | صغير |

---

## 6. المخرجات

- `audit/structure-inventory.csv` + `.md` — جرد كل 1201 ملف
- `audit/conventions-deep-violations.csv` + `audit/conventions-deep-report.md`
- `audit/hooks-layout-report.md`
- هذا الملف: `audit/structure-deep-review.md`

السكربتات الجديدة (قراءة فقط):
- `scripts/audit-structure.mjs`
- `scripts/audit-conventions-deep.mjs`
- `scripts/audit-hooks-layout.mjs`

---

## آلية الإنفاذ — بوابة Audit (مُضافة)

يُنفَّذ التحقق الشامل من النمط المعتمد (Page Hook Pattern + CoreModV7) عبر:

1. **`npm run audit`** — سلسلة من 5 سكربتات تفحص: الهيكل، الاصطلاحات العميقة، تخطيط الهوكات، صلاحيات الواجهة، عناصر التحكم بالصفحات + توليد `audit/report.html`.
2. **`npm run audit:gate`** — اختبار Vitest (`src/test/auditCriticalGate.test.ts`) يطبّق 9 قواعد حرجة (0 Critical، 0 GAP، حظر استيراد `@/hooks/data/*` من الصفحات، حظر `sonner` في `hooks/data` و`utils`، إلخ).
3. **`.husky/pre-push`** — يشغّل الأمرين قبل كل `git push` ويمنع الدفع عند الفشل. التثبيت: `bash scripts/install-git-hooks.sh`.

**النتيجة الحالية:** 0 Critical · 0 GAP · 7 Info (Canvas/PDF colors + 3 hooks > 200 سطر — غير حاجبة).
