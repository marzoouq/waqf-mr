# تقرير فحص شامل + خطة معالجة مُحكَمة

تمّ فحص الهوكات، الصفحات، التوجيه، الأزرار، Edge Functions، الـ DB، والإشعارات. **150+ ملاحظة** موزّعة على 4 محاور. ما يلي تلخيص مع تصنيف حدّة، ثم خطة على 4 مراحل.

---

## ملخص النتائج (المُرصد فعلياً)

### A. مخالفات معمارية — Hooks (53 ملاحظة)

| فئة | عدد |
|---|---|
| **toast داخل `hooks/data/**`** (خرق no-toast-in-data-hooks) | 22 ملفاً |
| **supabase خام داخل `hooks/page/**`** | ملفان (`useVoucherActions`, `useAggregatedAnnualReport`) |
| **هوكات بوظيفة مكررة** (يجلبان نفس البيانات) | 6 أزواج |
| **ملفات تتجاوز 200 سطر** | `useContractForm.ts` (202)، `usePropertiesViewPage.ts` (201) + 3 ملفات اختبار |
| **خلط واجهة+منطق+supabase** | 4 ملفات |

### B. التوجيه والصفحات والأزرار (8 محاور رئيسية)

- **رابط مكسور حقيقي**: `PropertiesViewPage.tsx:88 → /dashboard/my-share` (المسار الصحيح `/beneficiary/my-share`).
- **رابط معطل بصمت**: `ContractsPage.tsx:76 → /dashboard/income?tab=collection` — لا tabs في IncomePage.
- **رابط لمسار محجوب للمحاسب**: `PendingActionsTable` يولّد روابط إلى `/dashboard/zatca` (ADMIN_ONLY) وهو معروض في AdminDashboard للمحاسب.
- **4 حوارات حذف مكررة** بدل `ConfirmDeleteDialog` الموحد (Property/Unit/Bylaw/Contract).
- **CTA متكرر** لـ "التقارير المالية" في 3 مكونات مختلفة، و"الوصول السريع" في 3 أماكن.
- **صفحتان متوازيتان بنفس البيانات** بحسابات منفصلة: `ReportsPage` vs `FinancialReportsPage`, `AnnualReportPage` vs `AnnualReportViewPage`.
- **`window.confirm` في `invoiceSync.ts`** (2 موضع) بدل AlertDialog.

### C. التوست والمعايير (9 محاور)

- **نص توست متطابق** في 8 ملفات: `'حدث خطأ أثناء تصدير PDF'`.
- **نص توست متطابق** في 5 ملفات: `'تم تحميل ملف PDF بنجاح'`، `'حدث خطأ أثناء الحفظ'`.
- **تناقض UX**: 3 صياغات مختلفة لنجاح "حفظ الإعدادات"، شرطتان مختلفتان `—` vs `-` لنفس الرسالة.
- **منطق دور مكرر** بين `ProtectedRoute` + `RequirePermission` + `useRoleRedirect` + `useAuthListener` + `AuthContext`.
- **`getSession()` في `useAuthListener.ts:140`** — fallback مقبول لكن يقبل دور JWT دون تحقق DB في المسار السعيد.
- ✅ لا خرق في utils، console، localStorage، hex colors.

### D. Edge Functions و DB (~55 ملاحظة)

- **5 functions تقرأ body بدون Zod**: guard-signup, lookup-national-id, generate-invoice-pdf, admin-manage-users, auth-email-hook (`/preview`).
- **2 functions عامة بـ SERVICE_ROLE بدون auth**: guard-signup, lookup-national-id (محميتان فقط بـ rate limit).
- **2 ثنائيات مكررة**: generate-invoice-pdf/generate-voucher-pdf، zatca-onboard/zatca-renew.
- **`ai-assistant` يُستدعى بـ `fetch` مباشر بـ URL** بدل `invoke()`.
- **3 جداول بدون GRANTs صريحة**: `zatca_certificates`, `invoice_chain`, `disbursement_vouchers`، و 4 جداول email infra.
- **migration كامل (`20260403210830`) يستخدم `jwt_role()`** في 30+ policy بدل `has_role()`.
- **5 FKs إلى `auth.users`** في `user_roles`, `beneficiaries`, `support_tickets`, `support_ticket_replies`.
- **10 triggers مُعرَّفة 2–3 مرات** في migrations متتالية (audit_*, prevent_closed_fy_*, encrypt_*, validate_*, trg_validate_invoice_chain_ref).

---

## خطة المعالجة على 4 مراحل

كل مرحلة منفصلة وقابلة للتنفيذ مستقلة. اقترحت ترتيباً حسب نسبة **(أثر/مخاطرة)**.

### المرحلة 1 — إصلاحات فورية منخفضة المخاطرة (P0)
1. **إصلاح الرابط المكسور** `PropertiesViewPage.tsx:88` → `/beneficiary/my-share`.
2. **حذف رابط `?tab=collection` من `ContractsPage.tsx:76`** (أو إضافة tabs فعلية لاحقاً).
3. **إخفاء روابط `/dashboard/zatca` من `PendingActionsTable` للمحاسب** (تطبيق `ACCOUNTANT_EXCLUDED_ROUTES`).
4. **توحيد صياغة 4 رسائل توست متناقضة** (شرطة موحدة، نجاح حفظ الإعدادات بصيغة واحدة).
5. **استخراج ثوابت الرسائل المكررة** (PDF success/error) إلى `src/lib/messages/pdfMessages.ts`.

**النتيجة**: لا تكرار نصي، روابط نظيفة، تجربة متسقة. صفر مخاطر تراجع.

### المرحلة 2 — تنظيف معماري للهوكات (P1)
1. **نقل التوست من 22 ملف `hooks/data/**` إلى wrappers في `hooks/page/**`** (نفس النمط المُطبَّق على usePaymentInvoices/useInvoices).
2. **نقل supabase الخام من** `useVoucherActions.ts` و `useAggregatedAnnualReport.ts` إلى `hooks/data/`.
3. **توحيد 4 حوارات الحذف** على `ConfirmDeleteDialog` + إزالة التعليق المُبرّر في `ConfirmDeleteDialog.tsx:3`.
4. **استبدال `window.confirm` في `invoiceSync.ts`** بـ AlertDialog (يتطلب رفع التأكيد من lib إلى hook + component).
5. **تقسيم الملفات > 200 سطر** (useContractForm إلى createFlow/editFlow، usePropertiesViewPage إلى pdf+page).

### المرحلة 3 — تنظيف ازدواجية وظيفية (P2)
1. **دمج 6 أزواج الهوكات المكررة**:
   - `usePropertiesMap` ← يصبح `useMemo` داخل `useProperties`.
   - `useDistributionAdvances` + `useAdvanceRequests` — فلتر مشترك.
   - `useAccessLogTab` + `useArchiveLog` — schema موحد.
   - `useMultiYearSummary` + `useYearComparisonData` — RPC واحد.
   - `useRawFinancialData` + `useAccountsData` — هوك أساسي مع views محسوبة.
   - `useAccountantDashboardData` + `useAdminDashboardData` — orchestrator واحد بخيارات.
2. **توحيد منطق فحص الدور**: حذف `RequirePermission` كطبقة منفصلة (دمج في `ProtectedRoute`).
3. **توحيد PDF مكتبة** (`generate-invoice-pdf` و `generate-voucher-pdf` على renderer مشترك في `_shared`).
4. **توحيد ZATCA crypto** (`zatca-onboard` و `zatca-renew` على module مشترك للـ keypair/CSR).
5. **نقل `ai-assistant` لاستخدام `invoke()`** بدل fetch المباشر.

### المرحلة 4 — تصحيحات DB وأمنية (P3 — تتطلب migrations)
1. **إضافة GRANTs الناقصة** على `zatca_certificates`, `invoice_chain`, `disbursement_vouchers`, و 4 جداول email infra.
2. **استبدال `jwt_role()` بـ `has_role()`** في 30+ policy في `20260403210830` عبر migration جديد.
3. **إزالة `IF NOT EXISTS` المضلل وتنظيف triggers المكررة** (10 triggers) عبر migration واحد يحذف ثم يُنشئ.
4. **استبدال FKs إلى `auth.users`** بـ `ON DELETE` triggers + cascade منطقي (إن أمكن دون كسر بيانات).
5. **إضافة Zod safeParse في 5 Edge Functions** الناقصة.
6. **مراجعة `guard-signup` و `lookup-national-id`** — تشديد rate limit + إضافة فحص captcha أو دور لكل عملية حساسة.

---

## خارج النطاق
- إعادة تصميم بصري للصفحات.
- تغيير منطق المحاسبة أو RPC المالية (التوزيع، الإقفال، إلخ).
- ميزات جديدة.

## سؤال للمستخدم قبل التنفيذ
الخطة كبيرة (4 مراحل × ~12 ملفاً لكل مرحلة في المتوسط). أقترح **البدء بالمرحلة 1 فقط** (إصلاحات فورية بدون مخاطرة) ثم الانتقال للمرحلة 2 بموافقة جديدة. هل توافق على هذا التسلسل، أم تفضّل تنفيذ مرحلة بعينها أولاً؟

ملاحظات تنفيذية:
- كل مرحلة بعدها: `tsc --noEmit`، `bunx vitest run`، فحص يدوي للروابط المعدّلة.
- المرحلة 4 تتطلب موافقة منفصلة على كل migration.
- لن يُلمَس أي ملف محمي (`AuthContext`, `ProtectedRoute`, `SecurityGuard`, `supabase/config.toml`, `client.ts`, `types.ts`).
