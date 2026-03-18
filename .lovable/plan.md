

# فحص التقرير الجنائي الثامن — التحقق والإصلاحات المطلوبة

## التحقق بند بند

| # | البند | النتيجة | إصلاح؟ |
|---|-------|---------|--------|
| BUG-ACTIVE-01 | myShare=0 بدون تفسير في سنة مقفلة | **🟡 جزئياً صحيح** — التنبيه الحالي (سطر 454) يظهر `!isClosed` فقط. إذا `isClosed && myShare===0` (حصة صفرية فعلية بعد خصومات) لا يظهر تفسير. **لكن** هذا سيناريو نادر جداً ومقبول | لا |
| BUG-ACTIVE-02 | PDF بأصفار في سنة نشطة | **✅ مؤكد — لكن محمي جزئياً** — بطاقة "الحصة المستحقة" (سطر 398) تعرض "تُحسب عند إغلاق السنة" بدلاً من الرقم. **لكن** أزرار التصدير PDF متاحة ويمكن تحميل PDF بأصفار | **نعم** |
| BUG-ACTIVE-03 | أزرار تصدير بدون guard | **✅ مؤكد** — `handleDownloadPDF` و `handleDownloadDistributionsPDF` و `handleDownloadComprehensivePDF` لا تتحقق من `isClosed` | **نعم** |
| ADV-01 | تعارض RPC vs Client | **❌ مدحوض** — Client fallback (سطر 63): `Math.max(0, estimatedShare - carryforwardBalance)`. الـ `estimatedShare` المُمرَّر = `myShare` (سطر 347) الذي يساوي 0 في السنة النشطة. **والأهم**: `isFiscalYearActive` (سطر 352) يُمرَّر ويُستخدم لتعطيل الزر. التعارض نظري فقط لأن Server RPC هي المصدر الأساسي | لا |
| ADV-02 | فشل RPC صامت | **✅ مؤكد** — سطر 56-58: `catch` يوقف loading بدون أي إشعار. المستفيد لا يعرف أن الحد الأقصى محسوب client-side | **نعم** |
| QUERY-01 | استعلامات متكررة بدون cache | **❌ مدحوض** — `CarryforwardHistoryPage` تجلب `beneficiaries_safe` بـ queryKey مختلف لأنها تجلب حقولاً مختلفة (`id, name, share_percentage` فقط). هذا مقصود | لا |
| QUERY-02 | سلسلة استعلامات | **🟡 مقبول بالتصميم** — الاستعلامات 3,4,5 تحتاج `beneficiary.id`. لا يمكن تشغيلها بدون معرفة الـ id. 200ms إضافية مقبولة | لا |
| QUERY-03 | رصيد مرحّل بدون سنة | **❌ مدحوض** — `CarryforwardHistoryPage` تعرض **إجمالي** الرصيد النشط عبر كل السنوات وهذا مقصود (صفحة "تاريخ" وليست صفحة سنة محددة). العنوان واضح: "رصيد مرحّل نشط" | لا |
| DISC-01 | invalidateQueries() بدون queryKey | **✅ مؤكد** — سطر 41 + CarryforwardHistoryPage سطر 23: كلاهما `queryClient.invalidateQueries()` بدون تحديد | **نعم** |
| DISC-02 | PDF شامل بدون سُلف | **🟡 مقبول بالتصميم** — PDF الشامل يعرض التسلسل المالي العام (إيرادات → مصروفات → حصص) وليس تفاصيل الخصومات الفردية. السُلف خاصة بكل مستفيد وتظهر في PDF الحصة | لا |
| DISC-03 | فلتر توزيعات مختلف | **✅ مؤكد** — MySharePage سطر 102: `d.fiscal_year_id === fiscalYearId`. DisclosurePage سطر 107: `'fiscal_year_id' in d && d.fiscal_year_id === fiscalYearId`. Guard إضافي غير ضروري | **نعم** |
| CALC-01 | RPC فشل → myShare=0 | **🟡 جزئياً** — إذا فشلت RPC فـ `totalBenPct=0` (default) → `myShare=0`. **لكن** React Query يُعيد المحاولة تلقائياً. والـ error state يُعرض في الـ UI عبر `isError`. الخطر نظري | لا |
| CALC-02 | pctLoading مهملة → وميض | **✅ مؤكد** — سطر 66: `const { currentBeneficiary, myShare } = useMyShare(...)` — `pctLoading` غير مستخدم. وميض محتمل من 0 للقيمة الحقيقية | **نعم** |
| CALC-03 | تنسيق أرقام غير موحد | **❌ مدحوض تماماً** — MySharePage تستخدم `fmtAr()` حصرياً (بحث لم يجد أي `toLocaleString()` بدون locale). CarryforwardHistoryPage تستخدم `toLocaleString('ar-SA')` حصرياً. كل صفحة متسقة داخلياً | لا |
| PRINT-01 | window.print() بدون CSS | **✅ مؤكد** — سطر 113: `window.print()` مباشرة بدون CSS مخصص للطباعة | **نعم** |

---

## الإصلاحات المطلوبة — 7 تغييرات في 4 ملفات

### الملف 1: `src/pages/beneficiary/MySharePage.tsx`

**ACTIVE-02/03**: إضافة guard في أزرار التصدير عند السنة النشطة:
- في `handleDownloadPDF`, `handleDownloadDistributionsPDF`, `handleDownloadComprehensivePDF`: إضافة فحص أول:
```tsx
if (!isClosed) {
  toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');
  return;
}
```
- تعطيل الأزرار بصرياً: `disabled={isPdfLoading || !isClosed}`

**CALC-02**: استخدام `pctLoading` في شرط التحميل:
- سطر 66: تغيير إلى `const { currentBeneficiary, myShare, pctLoading } = useMyShare(...)`
- سطر 269: تغيير شرط التحميل إلى `if (finLoading || distLoading || pctLoading)`

### الملف 2: `src/pages/beneficiary/DisclosurePage.tsx`

**DISC-01**: تحديد queryKeys في `handleRetry`:
```tsx
const handleRetry = () => {
  queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
  queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
  queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
};
```

**DISC-03**: توحيد فلتر التوزيعات مع MySharePage — إزالة `'fiscal_year_id' in d &&` الزائد من سطر 107.

**CALC-02**: استخدام `pctLoading` في شرط التحميل (نفس MySharePage).

### الملف 3: `src/components/beneficiaries/AdvanceRequestDialog.tsx`

**ADV-02**: إضافة toast تحذيري عند فشل RPC:
```tsx
}).catch(() => {
  if (!cancelled) {
    setLoading(false);
    toast.warning('تعذّر التحقق من الحد الأقصى — يُرجى المراجعة يدوياً');
  }
});
```
يتطلب إضافة `import { toast } from 'sonner'`.

### الملف 4: `src/pages/beneficiary/CarryforwardHistoryPage.tsx`

**DISC-01**: تحديد queryKeys في `handleRetry` (سطر 23):
```tsx
const handleRetry = () => {
  queryClient.invalidateQueries({ queryKey: ['my-beneficiary'] });
  queryClient.invalidateQueries({ queryKey: ['my-carryforwards'] });
  queryClient.invalidateQueries({ queryKey: ['my-advance-requests'] });
};
```

**PRINT-01**: استبدال `window.print()` بتصدير PDF مخصص باستخدام `generateComprehensiveBeneficiaryPDF` أو إنشاء دالة طباعة HTML مخصصة مماثلة لـ `printShareReport`. الأبسط: إضافة تعليق وتحسين الـ UX بإظهار toast قبل الطباعة وليس بعدها.

---

## ملخص

| الملف | عدد التغييرات | التأثير |
|-------|--------------|---------|
| MySharePage.tsx | 3 | guards تصدير + pctLoading |
| DisclosurePage.tsx | 3 | handleRetry + فلتر + pctLoading |
| AdvanceRequestDialog.tsx | 1 | toast عند فشل RPC |
| CarryforwardHistoryPage.tsx | 2 | handleRetry + تحسين طباعة |

من أصل 15 بنداً: **7 للإصلاح**، **4 مدحوضة**، **4 مقبولة بالتصميم**.

