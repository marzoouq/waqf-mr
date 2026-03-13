

# خطة التنفيذ المحدّثة — مع توضيح النقطتين

## نقطة 1: allocationMap يحتاج كل العقود دائماً

بعد فحص الكود (سطور 59-81)، `allocationMap` يستدعي `allocateContractToFiscalYears` لكل عقد عبر **كل السنوات المالية** ثم يختار التخصيص المطابق للسنة المحددة. السبب: عقد واحد قد يمتد على أكثر من سنة، فلحساب الجزء المخصص للسنة الحالية لا بد من معرفة توزيعه الكامل.

**القرار:** نُبقي على جلب كل العقود، لكن نستبدل `useContracts()` بـ `useContractsByFiscalYear('all')` لتوحيد مفتاح الكاش مع Dashboard. النتيجة: نفس البيانات، كاش مشترك، صفر استعلامات مكررة.

## نقطة 2: صياغة تنبيه الاقتطاع

نستخدم صيغة "محتمل" كما اقترحت:
```
"تم عرض أول 2,000 سجل — قد توجد سجلات إضافية. يُرجى تضييق الفلترة."
```

---

## المرحلة 1: توحيد استعلامات العقود

**الملف:** `src/hooks/useAccountsPage.ts`

- استبدال `useContracts()` (سطر 43) بـ `useContractsByFiscalYear('all')`
- إزالة استيراد `useContracts` واستيراد `useContractsByFiscalYear` بدلاً منه
- إبقاء `useUpdateContract` و `useDeleteContract` كما هي (mutations لا تتأثر)
- لا تغيير في منطق `allocationMap` أو `contracts` المشتق

## المرحلة 2: حد 2000 + تنبيه اقتطاع محتمل

**الملفات:** `src/hooks/useIncome.ts` + `src/hooks/useExpenses.ts`

- إضافة `.limit(2000)` للحالة `fiscalYearId !== 'all'`
- بعد الجلب: إذا `data.length >= 2000` → عرض toast تحذيري بالصيغة المتفق عليها
- الحالة `'all'` تبقى بـ `limit(1000)` كما هي

## المرحلة 3: إزالة fallback + توحيد staleTime

**الملف:** `src/hooks/useAccounts.ts`

- حذف block الـ fallback (سطور 51-61) — الاستعلام الأول بـ `fiscal_year_id` كافٍ
- رفع `staleTime` من `30_000` إلى `60_000`

## المرحلة 4: Lazy-load للرسوم البيانية

**الملف:** `src/pages/dashboard/AdminDashboard.tsx`

- لف مكونات الرسوم البيانية بـ `React.lazy` + `Suspense` مع skeleton

---

**ملخص التغييرات:**

| الملف | التعديل |
|---|---|
| `src/hooks/useAccountsPage.ts` | `useContracts()` → `useContractsByFiscalYear('all')` |
| `src/hooks/useIncome.ts` | `.limit(2000)` + toast تحذيري |
| `src/hooks/useExpenses.ts` | `.limit(2000)` + toast تحذيري |
| `src/hooks/useAccounts.ts` | إزالة fallback، staleTime → 60s |
| `src/pages/dashboard/AdminDashboard.tsx` | React.lazy للرسوم |

