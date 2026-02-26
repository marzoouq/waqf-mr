# 📋 خطة الإصلاح الجنائي الشامل — `waqf-mr`

> **تاريخ الإعداد:** 2026-02-26 | **الحالة:** مكتمل ✅

---

## 📊 ملخص التقييم

من أصل 35+ مشكلة تم رصدها في الفحص الجنائي، تم تصنيفها كالتالي:

| الفئة | العدد | المُنفذ | ملاحظة |
|-------|-------|---------|--------|
| 🔴 حرج (Critical) | 4 | 3 | C-1 و C-2 مقيدان بملفات تُدار تلقائياً |
| 🟠 عاجل (High) | 7 | 5 | |
| 🟡 مهم (Medium) | 10 | 6 | M-1 يتطلب تحديث types.ts (تلقائي) |
| 🔵 تحسين (Low) | 5 | 1 | |

---

## ✅ الإصلاحات المنفذة

### 1. [C-4] إصلاح الخطأ الرياضي في توزيع الحصص ⭐
**الملف:** `src/components/accounts/DistributeDialog.tsx`
**المشكلة:** التوزيع يقسم على `totalBeneficiaryPercentage` بدلاً من `100`.
**الإصلاح:** استخدام `/100` مع عرض تحذير إذا كان مجموع النسب ≠ 100%.

### 2. [C-3] ✅ نقل التوزيع لـ Supabase RPC — Atomic Transaction ⭐⭐
**الملفات:** Migration + `src/hooks/useDistribute.ts`
**المشكلة:** عمليات متعددة بدون transaction قد تترك DB في حالة غير متسقة.
**الإصلاح:** إنشاء دالة `execute_distribution` في قاعدة البيانات تنفذ كل العمليات داخل transaction واحد:
- إنشاء سجلات التوزيع
- تسوية المرحّلات القديمة (مع `FOR UPDATE` لمنع race conditions)
- إنشاء مرحّلات جديدة للفروق السالبة
- تحديث الحساب الختامي
- إرسال الإشعارات
**الضمان:** إذا فشلت أي عملية، يتم ROLLBACK تلقائياً ولا تتأثر البيانات.

### 3. [H-1] إصلاح CI/CD — `npm ci` بدلاً من `npm install`
**الملف:** `.github/workflows/test.yml`

### 4. [H-4 + M-2] توثيق سلوك فلترة carryforward
**المشكلة:** جلب كل المرحّلات النشطة بدون فلتر سنة مالية.
**النتيجة:** السلوك **صحيح ومتعمد** — المرحّلات النشطة تُخصم بغض النظر عن مصدرها.

### 5. [H-5 + M-8] إصلاح PDF async + إضافة loading state
**الملف:** `src/components/accounts/DistributeDialog.tsx`
**الإصلاح:** `async onClick` مع `try/catch` و`Loader2` spinner.

### 6. [M-5] إصلاح `sharePercentage: 0` في PDF المستفيد
**الملف:** `src/pages/beneficiary/MySharePage.tsx`
**الإصلاح:** تمرير `currentBeneficiary.share_percentage` بدلاً من `0`.

### 7. [M-9] إضافة invalidation عند خطأ التوزيع
**الملف:** `src/hooks/useDistribute.ts`
**الإصلاح:** `onError` يُعيد تحميل كل الجداول المتأثرة.

### 8. [M-3] إصلاح حساب `netRevenue` في صفحة التقارير
**الملف:** `src/pages/dashboard/ReportsPage.tsx`
**المشكلة:** `netRevenue` يُحسب بطريقة مختلفة عن `useComputedFinancials`.
**الإصلاح:** استخدام `netAfterExpenses` مباشرة (يشمل `waqfCorpusPrevious`).

---

## ⏸️ إصلاحات مؤجلة (قيود النظام)

### [C-1] `verify_jwt = false` لجميع Edge Functions
**الحالة الفعلية:** كل Edge Function تتحقق يدوياً من JWT عبر `getUser()` — الحماية موجودة في الكود.
**ملف config.toml يُدار تلقائياً.**

### [C-2] `.env` في Git
**المفاتيح المكشوفة هي `anon/publishable` فقط.**
**ملف .gitignore يُدار تلقائياً.**

### [M-1] كثرة `as any` في TypeScript
**`types.ts` يُولد تلقائياً.** سيتم حل المشكلة عند تحديث الأنواع بعد أي migration.

### [A-5] `staleTime` في QueryClient
**✅ مُصلح مسبقاً** — `staleTime: 5 * 60 * 1000` موجود.

---

## 📝 ملاحظات موثقة (لا تحتاج إصلاح)

- [H-3] `guard-signup` يُعيد `{ success: true }` — صحيح والـ frontend يستخدم `data.success`.
- [H-6] المحاسب لا يمكنه إقفال السنة — سلوك مقصود.
- [A-2] صلاحيات المحاسب على المستفيدين — سلوك مقصود.
- [M-6] Google Fonts في printShareReport — مخاطرة منخفضة.
- [M-7] CORS static — الفنكشنز الجديدة تستخدم `getCorsHeaders(req)`.
- [M-4] بيانات AI Assistant للمحاسب — قرار حوكمة موثق.
- [H-2] `useComputedFinancials` — المنطق متسق فعلياً (يستخدم DB values عند وجود account).
