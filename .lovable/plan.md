
# خطة إصلاح صفحات المستفيدين — بعد التحقق من الكود الفعلي

## نتائج التحقق

| # | المشكلة المُبلَّغة | الحقيقة | القرار |
|---|---|---|---|
| 1 | `BeneficiaryDashboard` — `fetchDistributions` بدون `useQuery` | **حقيقية لكن مقصودة** — تُستخدم مع Realtime subscription. الـ limit(3) يجلب 3 سجلات فقط. لا مشكلة أداء حقيقية. الـ channel يُنظَّف في cleanup function (سطر 121-123) عند تغيير `currentBeneficiary.id` | ❌ لا تغيير |
| 2 | `BeneficiaryDashboard` — Realtime channel يبقى بعد تغيير المستفيد | **ملغاة** — cleanup function في `useEffect` (سطر 121-123) تُزيل الـ channel عند تغيير `currentBeneficiary?.id` | ❌ لا تغيير |
| 3 | `MySharePage` — `queryKey` لا يشمل `fiscalYearId` | **حقيقية** — الاستعلام يجلب كل التوزيعات ثم يُصفى client-side (سطر 88-92). لكن بما أن الفلترة تتم client-side فالـ cache الموحد صحيح تصميمياً. إضافة `fiscalYearId` للـ queryKey ستُسبب refetch غير ضروري. **المشكلة الحقيقية:** لا مشكلة فعلية لأن البيانات تُصفى بعد الجلب | ❌ لا تغيير |
| 4 | `MySharePage` — 5 هوكس تُستدعى حتى لو `noPublishedYears` | **حقيقية لكن لا يمكن إصلاحها** — React hooks لا يمكن استدعاؤها بشكل شرطي. الحل هو نقلها لمكون فرعي لكن هذا refactor كبير بلا فائدة عملية كبيرة | ❌ لا تغيير |
| 5 | `MySharePage` — `getAdvanceStatusBadge` fallback خاطئ | **حقيقية** — حالة غير معروفة تُعرض كـ "قيد المراجعة" | ✅ إصلاح بسيط |
| 6 | `DisclosurePage` — `queryKey` نفس bug كـ MySharePage | **ملغاة** — نفس التحليل: الفلترة تتم client-side، الـ cache الموحد صحيح | ❌ لا تغيير |
| 7 | `DisclosurePage` — `toGregorianShort` تُعطي NaN | **حقيقية** — `new Date('2025-01')` يُعطي Invalid Date بدون exception | ✅ إصلاح |
| 8 | `DisclosurePage` — `window.location.href` بدلاً من `reload()` | **حقيقية** — عدم اتساق | ✅ إصلاح بسيط |
| 9 | `CarryforwardHistoryPage` — يُستعلم من `beneficiaries` المباشر | **حقيقية لكن غير خطيرة** — الاستعلام يجلب فقط `id, name, share_percentage` وليس بيانات PII (national_id, bank_account). RLS تحمي البيانات. لكن يُفضل استخدام `beneficiaries_safe` للاتساق | ✅ تحسين |
| 10 | `CarryforwardHistoryPage` — dead code | **ملغاة جزئياً** — `totalSettled` و`totalPaidAdvances` **مُستخدمان فعلاً** في بطاقات الملخص (سطور 113 و137). `activeCF` فقط هو dead code | ✅ إصلاح بسيط |
| 11 | `ContractsViewPage` — `isExpiringSoon` خارج `useMemo` | **حقيقية لكن غير مؤثرة** — `now` و`in90Days` تتغير عند كل render لكن `useMemo` يعتمد على `[contracts]` فقط. الفرق العملي: الإحصائية تتحدث فقط عند تغيير العقود، لا عند تقدم الوقت. هذا مقبول — لن يتغير عدد العقود القريبة من الانتهاء أثناء جلسة واحدة | ❌ لا تغيير |
| 12 | `BeneficiarySettingsPage` — constants exported من صفحة | **حقيقية لكن منخفضة الأولوية** — لا circular dependency فعلي حالياً | ❌ لا تغيير |
| 13 | `InvoicesViewPage` — `currentPage` لا تُعاد للصفحة 1 | **ملغاة** — الكود الفعلي (سطر 121) يحتوي `setCurrentPage(1)` في `onChange` | ❌ لا تغيير |
| 14 | `InvoicesViewPage` — مقارنة التاريخ كـ string | **حقيقية لكن مقبولة** — البحث بالنص في التاريخ ISO (مثل `2025`) يعمل. البحث بتنسيق عربي لن يعمل لكن هذا سلوك متوقع | ❌ لا تغيير |
| 15 | `WaqifDashboard` — loading state ناقص | **ملغاة** — الكود الفعلي (سطر 53) يشمل **جميع** الـ loading states: `fyLoading || finLoading || propLoading || contLoading || benLoading` | ❌ لا تغيير |
| BeneficiarySettingsPage — password لا تُنظَّف | **ملغاة** — الكود يحتوي `setPassword('')` و`setConfirmPassword('')` بعد النجاح (سطر 131-132) | ❌ لا تغيير |

## الإصلاحات المطلوبة فعلاً (4 تعديلات صغيرة)

### 1. `MySharePage.tsx` — `getAdvanceStatusBadge` fallback
السطر 236: `map[status] || map.pending` → يعرض الحالة الأصلية بدلاً من fallback مضلل.
```tsx
const s = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' };
```

### 2. `DisclosurePage.tsx` — `toGregorianShort` NaN handling
إضافة فحص `isNaN` بعد إنشاء Date:
```tsx
function toGregorianShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // ...rest
  } catch { return dateStr; }
}
```

### 3. `DisclosurePage.tsx` — `window.location.href` → `window.location.reload()`
سطر 184: استبدال `window.location.href = '/beneficiary/disclosure'` بـ `window.location.reload()`.

### 4. `CarryforwardHistoryPage.tsx` — استخدام `beneficiaries_safe` + حذف dead code
- تغيير الاستعلام من `beneficiaries` إلى `beneficiaries_safe` للاتساق
- حذف `activeCF` (المتغير الوحيد غير المستخدم)

## ملخص

| الملف | التغيير |
|---|---|
| `MySharePage.tsx` | fallback عام لحالات badge غير معروفة |
| `DisclosurePage.tsx` | فحص NaN + `reload()` بدل `href` |
| `CarryforwardHistoryPage.tsx` | `beneficiaries_safe` + حذف dead code |

4 تعديلات تجميلية/وقائية. لا مشاكل أمنية أو وظيفية حرجة في صفحات المستفيدين.
