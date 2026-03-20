

# تقرير الفحص الجنائي التفصيلي — الملاحظات الأربع

---

## F-01: بطاقات "0 ر.س *تقديري" في لوحة الناظر

### الجذر
في `AdminDashboard.tsx` سطر 128: `sharesNote = isYearActive ? ' *تقديري' : ''`

ثم في سطر 100-106 من `useComputedFinancials.ts`: عند السنة النشطة (`!isClosed`) يتم تصفير الحصص عمداً:
```text
adminShare: 0, waqifShare: 0, waqfRevenue: 0, availableAmount: 0
```

**النتيجة:** البطاقات تعرض "0 ر.س *تقديري" — وهذا **صحيح بالتصميم** لأن الحصص لا تُحسب إلا بعد الإقفال. لكن "تقديري" لقيمة صفرية مربك للمستخدم.

### سبب عدم إصلاحها أثناء البناء
القرار المعماري (memory: `beneficiary-access-guards`) كان إخفاء الحصص للسنة النشطة. تمت إضافة كلمة "*تقديري" لاحقاً كعلامة توضيحية دون مراجعة أنها تظهر على قيم صفرية.

### الإصلاح المقترح
في `AdminDashboard.tsx`: إخفاء بطاقات الحصص (الناظر، الواقف، ريع الوقف) من المصفوفة عندما `isYearActive` أو استبدال القيمة بـ "تُحسب عند الإقفال" بدل "0 ر.س *تقديري".

---

## F-02: ساعة الواقف لا تتوقف عند hidden

### الجذر
في `WaqifDashboard.tsx` سطر 122-126:
```text
const id = setInterval(() => setNow(new Date()), 60_000);
const onVisibility = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
return () => { clearInterval(id); document.removeEventListener(...); };
```

المقارنة مع `BeneficiaryDashboard.tsx` سطر 68-71:
```text
const start = () => { id = setInterval(...) };
const stop = () => { if (id) { clearInterval(id); id = undefined; } };
const onVisibility = () => { if (document.hidden) stop(); else { setNow(...); start(); } };
```

**الفرق:** BeneficiaryDashboard يوقف `setInterval` تماماً عند الإخفاء ويعيد تشغيله عند الظهور. WaqifDashboard يترك `setInterval` يعمل دائماً ويكتفي بتحديث القيمة عند العودة.

### سبب عدم إصلاحها أثناء البناء
WaqifDashboard بُنيت قبل تحسين BeneficiaryDashboard. لم تُطبّق نفس المعالجة بأثر رجعي.

### الإصلاح المقترح
نسخ نفس نمط start/stop من BeneficiaryDashboard إلى WaqifDashboard (5 أسطر).

---

## F-03: زر PDF نشط بصرياً رغم حظر التصدير في السنة النشطة

### الجذر
في `MySharePage.tsx` سطر 123-128:
```text
const handleDownloadPDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) {
      toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');
      return;   // ← يمنع التصدير لكن الزر يبدو نشطاً
    }
```

الزر في سطر 361-363 يستخدم `ExportMenu` بدون خاصية `disabled`:
```text
<ExportMenu onPrint={...} onExportPdf={handleDownloadPDF} ... />
```

**النتيجة:** المستخدم يضغط → يظهر toast تحذيري → تجربة مربكة.

### سبب عدم إصلاحها أثناء البناء
`ExportMenu` لا يدعم خاصية `disabled` حالياً. تم اختيار الحل الأسرع (toast) بدل تعديل المكوّن.

### الإصلاح المقترح
إضافة خاصية `disabled` لمكوّن `ExportMenu` أو تمرير `null` بدل `handleDownloadPDF` عندما `!isClosed` لإخفاء خيار PDF تماماً.

---

## F-04 (الأهم): تناقض guard الحساب الختامي المفقود

### الجذر
`isAccountMissing` يتحقق في `useComputedFinancials.ts` سطر 162:
```text
const isAccountMissing = !currentAccount && !!fiscalYearId && fiscalYearId !== 'all';
```

هذا يعود `true` للسنة **النشطة** أيضاً إذا لم يُنشأ حساب ختامي لها بعد.

**السلوك المتناقض بين الصفحات:**

| الصفحة | الشرط | السنة النشطة بلا حساب |
|--------|-------|-----------------------|
| `DisclosurePage` سطر 227 | `isAccountMissing && selectedFY?.status === 'closed'` | **تمرّ** ← تعرض البيانات الحية |
| `MySharePage` سطر 322 | `isAccountMissing && isClosed` | **تمرّ** ← تعرض البيانات الحية |
| `FinancialReportsPage` سطر 130 | `isAccountMissing` (بدون شرط!) | **تحظر** ← شاشة فارغة |
| `AccountsViewPage` سطر 78 | `isAccountMissing` (بدون شرط!) | **تحظر** ← شاشة فارغة |

### سبب عدم إصلاحها أثناء البناء
`isAccountMissing` أُضيفت كحماية (memory: `account-loading-guards`) لمنع عرض أرقام غير دقيقة. الصفحتان القديمتان (FinancialReports + AccountsView) استخدمت الشرط الأولي البسيط. لاحقاً عند بناء DisclosurePage وMySharePage، تم تحسين الشرط بإضافة `&& isClosed` لكن لم يُطبّق بأثر رجعي على الصفحتين القديمتين.

### سيناريو التحقق
1. مستفيد يدخل النظام → يختار السنة النشطة (2025-2026)
2. يذهب لصفحة الإفصاح → **يرى البيانات الحية** (دخل 876,300 مثلاً)
3. يذهب لصفحة التقارير المالية → **شاشة "لم يتم العثور على الحساب الختامي"**
4. يذهب لصفحة الحسابات الختامية → **نفس شاشة الحظر**

**تناقض واضح** — نفس البيانات متاحة في صفحة ومحجوبة في أخرى.

### الإصلاح المقترح
تعديل سطرين فقط:
- `FinancialReportsPage.tsx` سطر 130: `if (isAccountMissing && selectedFY?.status === 'closed')`
- `AccountsViewPage.tsx` سطر 78: `if (isAccountMissing && selectedFY?.status === 'closed')`

---

## ملخص الأولويات

| # | الملاحظة | الخطورة | جهد الإصلاح |
|---|----------|---------|------------|
| **F-04** | تناقض guard بين الصفحات | **متوسطة-عالية** | دقيقتان (سطران) |
| F-03 | زر PDF نشط بلا فائدة | منخفضة | 10 دقائق |
| F-01 | "0 ر.س *تقديري" مربكة | منخفضة | 5 دقائق |
| F-02 | ساعة الواقف لا تتوقف | منخفضة جداً | 3 دقائق |

### التوصية
إصلاح الأربعة دفعة واحدة — مجموع الجهد لا يتجاوز 20 دقيقة.

