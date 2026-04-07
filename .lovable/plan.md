

# خطة تنفيذ تدقيق لوحة المحاسب — 42 نقطة

## التحقق من النتائج

بعد فحص الملفات الفعلية:

### نقاط غير صالحة أو مُنفَّذة بالفعل
- **#7** — `/dashboard/settings` محمي بالفعل بـ `ADMIN_ONLY` في `adminRoutes.tsx` سطر 59. ✅
- **#10** — طلب `app_settings` permission لإقفال السنة — تغيير معماري كبير ومؤجل.
- **#20** — `documentationRate` قرار تجاري مقبول — يحتاج comment فقط.
- **#28** — الفلاتر تبقى بعد إغلاق form — سلوك مقصود، يحتاج comment فقط.
- **#31** — التقرير السنوي مفتوح للمحاسب بالتصميم (يُولّده ويُراجعه).

### الخطة النهائية — 3 دورات

---

## الدورة 1 — أمان وتوحيد (أعلى أولوية)

**ملف جديد: `src/utils/permissions.ts`**
دالة موحّدة لمنطق `isLocked` (#1, #2, #9):
```typescript
export const canModifyFiscalYear = (role: string | null, isClosed: boolean): boolean =>
  !isClosed || role === 'admin';
```

**تحديث 3 ملفات:**
- `useIncomePage.ts` سطر 23 → `const isLocked = !canModifyFiscalYear(role, isClosed);`
- `useExpensesPage.ts` سطر 24 → نفس التغيير
- `InvoicesPage.tsx` سطر 22 → نفس التغيير (هذا الملف يستثني المحاسب أصلاً — توحيد فقط)

**تحديث `DashboardAlerts.tsx`** (#6, #8):
- إضافة `role` prop للمكوّن
- تنبيه السُلف: عرض "تحتاج موافقة الناظر" للمحاسب بدل زر "مراجعة الطلبات"
- تنبيه النسب الافتراضية: عرض "يرجى إبلاغ الناظر" للمحاسب بدل زر "ضبط النسب"
- تمرير `role` من `AdminDashboard.tsx`

**تحديث `useAdminDashboardStats.ts`** (#5):
- إضافة `role` parameter
- تصفية بطاقات "حصة الناظر"، "حصة الواقف"، "ريع الوقف" عند `role === 'accountant'`

---

## الدورة 2 — تقليل التكرار وتحسينات

**ملف جديد: `src/hooks/ui/useTableSort.ts`** (#16):
```typescript
export function useTableSort<T extends string>(defaultField?: T | null) {
  // sortField, sortDir, handleSort — generic لكل الجداول
}
```

**تحديث 4+ ملفات** لاستخدام `useTableSort`:
- `useIncomePage.ts`, `useExpensesPage.ts`, `usePaymentInvoicesTab.ts`, `useContractsPage.ts`

**ملف جديد: `src/types/sorting.ts`** (#13):
```typescript
export type SortDir = 'asc' | 'desc';
```

**تحسينات داخلية:**
- **#35**: استخراج `EMPTY_INCOME_FORM` و `EMPTY_EXPENSE_FORM` كـ constants خارج الهوك
- **#12**: نقل `ITEMS_PER_PAGE` خارج الهوك كـ module-level constant
- **#17**: إصلاح `setCurrentPage(1)` بعد الحذف — البقاء في الصفحة الحالية ما لم تصبح فارغة
- **#14 + #15**: تعطيل زر الإضافة عند `!fiscalYear?.id`
- **#37**: تأجيل `usePdfWaqfInfo` بـ `enabled: false` حتى يُطلب التصدير
- **#36**: تأجيل `useProperties` و `useContractsByFiscalYear` بـ `enabled: isOpen`

---

## الدورة 3 — تقسيم الهوكات الضخمة

**#29 — تقسيم `useContractsPage.ts` (236 سطر):**
- `useContractForm.ts` — CRUD form logic (handleEdit, handleSubmit, resetForm, formInitialData)
- `useContractsPage.ts` — يبقى كـ orchestrator خفيف

**#22 — تقسيم `usePaymentInvoicesTab.ts` (231 سطر):**
- `usePaymentInvoiceActions.ts` — pay, unpay, bulk pay, generate
- `usePaymentInvoicesTab.ts` — يبقى كـ orchestrator

---

## مهام مؤجلة (لا تُنفَّذ الآن)

| # | السبب |
|---|-------|
| #3 | أزرار QuickActions للمحاسب — تحتاج مراجعة UX شاملة |
| #4, #23 | تخصيص dashboard كامل للمحاسب — تغيير معماري كبير |
| #10 | permission-based closure — يتطلب تغيير DB/RPC |
| #24, #25, #30 | UX enhancements — أولوية أقل |
| #29 (الجزء الكامل), #22 (الجزء الكامل) | الاستخراج الكامل — الدورة 3 تُنفّذ الأساسي فقط |
| #32, #33, #39, #42 | اختبارات وتحسينات ثانوية |

---

## ملخص التنفيذ

| الدورة | الملفات | المهام | الخطورة |
|--------|---------|--------|---------|
| 1 | 1 جديد + 5 تحديث | 7 نقاط (#1,2,5,6,8,9) | منخفض — توحيد وتصفية |
| 2 | 2 جديد + 6 تحديث | 9 نقاط (#12-17,35-37) | منخفض — refactoring |
| 3 | 2 جديد + 2 تحديث | 2 نقطة (#22,29) | منخفض — استخراج |

**إجمالي فوري: 18 نقطة عبر 3 دورات** + باقي المهام مؤجلة

