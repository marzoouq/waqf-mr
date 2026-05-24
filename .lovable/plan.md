## النطاق

تنفيذ البنود 1، 2، 6، 5 فقط. تم إلغاء 3 (Waqif محجوب عن RPC) و4 (منجز سابقًا).

---

### 1) إصلاح اختبار `checkPagePerformance`
ملف: `src/lib/diagnostics/checks.test.ts` السطر 152

تغيير القيم لتتجاوز عتبة 4000ms:
- `avgMs: 3000` → `avgMs: 4500`
- `maxMs: 3500` → `maxMs: 5000`
- `minMs: 2500` → `minMs: 4000`
- `lastMs: 3000` → `lastMs: 4500`

لا تغيير على `performance.ts`.

---

### 2) توحيد عرض "المتاح للتوزيع" في السنة النشطة (Admin)
ملف: `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts` السطر 95

استبدال:
```ts
{ title: isYearActive ? 'المتاح للتوزيع (تقديري)' : 'المتاح للتوزيع',
  value: `${fmtInt(Math.max(0, isYearActive ? netAfterZakat : availableAmount))} ر.س`, ... }
```
بـ:
```ts
{ title: 'المتاح للتوزيع',
  value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(Math.max(0, availableAmount))} ر.س`, ... }
```

لمطابقة سلوك بطاقات Waqif/Beneficiary وحصة الناظر/الواقف/ريع الوقف في نفس الملف.

---

### 5) تنظيف اختياري ضيق لـ `AdminDashboard.tsx`
ملف: `src/pages/dashboard/AdminDashboard.tsx`

تحويل الموضعين المتبقيين اللذين يستخدمان `ErrorBoundary + Suspense` يدويًا إلى `DashboardLazySection`:
- السطور 76-83 (`AccountantDashboardView`) — استبدال `<ErrorBoundary>` بـ `<DashboardLazySection minHeight={200}>`
- السطور 100-109 (`PendingActionsTable` داخل `DeferredRender`) — استبدال الـ `DeferredRender + ErrorBoundary + Suspense` بـ `<DashboardLazySection minHeight={200} printHidden>`

لا تغيير على المنطق، فقط تخفيض التكرار.

---

### 6) إزالة prop `role` من `DashboardAlerts`
ملفان:

**أ) `src/components/dashboard/widgets/DashboardAlerts.tsx`**
- إزالة prop `role` من interface
- إزالة متغير `isAdmin` المحلي
- إضافة prop `canApproveAdvances?: boolean` و`canConfigureRatios?: boolean` (افتراضيًا `false`)
- استخدامها بدل `isAdmin` في موضعي السُلف والنسب الافتراضية

**ب) `src/pages/dashboard/AdminDashboard.tsx` السطر 62**
- استبدال `role={ctx.role}` بـ:
  ```tsx
  canApproveAdvances={ctx.role === 'admin'}
  canConfigureRatios={ctx.role === 'admin'}
  ```

هذا يجعل المكوّن presentational بحت بدون اتخاذ قرارات صلاحيات داخليًا.

---

## معايير القبول
- `vitest run` يمر بالكامل بما فيه `checkPagePerformance`.
- بطاقة "المتاح للتوزيع" في Admin بالسنة النشطة تعرض "تُحسب عند الإقفال" (مطابقة لـ Waqif).
- `AdminDashboard.tsx` لا يحتوي على `ErrorBoundary` أو `Suspense` يدوي مباشر — كله عبر `DashboardLazySection`.
- `DashboardAlerts` لا يستقبل prop `role` ولا يحتوي على `role ===`.

## ترتيب التنفيذ
1 → 2 → 6 → 5، ثم `vitest run` للتحقق.
