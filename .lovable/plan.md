

# خطة تنظيف المستودع وإصلاح خطأ البناء

## خطأ البناء (أولوية قصوى)

**الملف**: `src/lib/pwaBootstrap.ts` سطر 99

**السبب**: `r.update()` يُرجع `Promise<ServiceWorkerRegistration>` لكن الـ fallback هو `undefined as void | undefined` — لا يطابق النوع `ServiceWorkerRegistration`.

**الإصلاح**: تغيير الـ fallback إلى `undefined as unknown as ServiceWorkerRegistration` أو الأفضل: لف الاستدعاء بـ `.then(() => {})` لتحويله إلى `Promise<void>` ثم استخدام `undefined` كـ fallback:

```typescript
registrations.map(r =>
  withTimeout(r.update().then(() => {}), undefined as void, 2000).catch(() => undefined)
)
```

---

## تنظيف الملفات (6 إجراءات)

### 1. حذف `/DashboardChartsInner.tsx` من جذر المشروع
ملف يتيم لا يُستورد من أي مكان. النسخة الصحيحة في `src/components/dashboard/`.

### 2. حذف `src/utils/printDistributionReport.test.ts`
ملف اختبار يتيم — الدالة المختبَرة في `src/utils/pdf/printDistributionReport.ts` ونسخة الاختبار الصحيحة موجودة هناك.

### 3. حذف `src/utils/printShareReport.test.ts`
نفس الحالة — الدالة في `src/utils/pdf/` والاختبار الصحيح هناك.

### 4. نقل `src/components/GlobalSearch.test.tsx` → `src/components/search/GlobalSearch.test.tsx`
تحديث مسار الاستيراد داخل الاختبار ليشير إلى `./GlobalSearch` بدلاً من المسار القديم.

### 5. حذف `src/utils/loadAmiriFonts.test.ts`
الدالة في `src/utils/pdf/loadAmiriFonts.ts` — ملف الاختبار يتيم.

### 6. ملفات Migration المكررة
لا توجد في المستودع الحالي (تم تنظيفها سابقاً). لا إجراء مطلوب.

---

## ملخص الملفات المتأثرة

| الإجراء | الملف |
|---|---|
| تعديل | `src/lib/pwaBootstrap.ts` (إصلاح خطأ TS2345) |
| حذف | `/DashboardChartsInner.tsx` |
| حذف | `src/utils/printDistributionReport.test.ts` |
| حذف | `src/utils/printShareReport.test.ts` |
| حذف | `src/utils/loadAmiriFonts.test.ts` |
| نقل | `src/components/GlobalSearch.test.tsx` → `src/components/search/` |

