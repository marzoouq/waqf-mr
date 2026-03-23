

# فحص جنائي — أرقام الإفصاح السنوي (2024-2025)

---

## 1. تتبع التسلسل الحسابي (Mathematical Trace)

### المعادلة المُفترضة:
```text
grandTotal = totalIncome + waqfCorpusPrevious
netAfterExpenses = grandTotal - totalExpenses
netAfterVat = netAfterExpenses - vatAmount
netAfterZakat = netAfterVat - zakatAmount
shareBase = totalIncome - totalExpenses - zakatAmount
adminShare = shareBase × adminPct%
waqifShare = shareBase × waqifPct%
waqfRevenue = netAfterZakat - adminShare - waqifShare
availableAmount = waqfRevenue - waqfCorpusManual
remainingBalance = availableAmount - distributionsAmount
```

---

## 2. خطأ حرج مؤكد — ضريبة القيمة المضافة محسوبة مرتين في العرض

### الإثبات:

في `AnnualDisclosureTable.tsx` (جدول الإفصاح في صفحة التقارير):

| السطر | ما يُعرض | المصدر |
|-------|---------|--------|
| 101-106 | بنود المصروفات (بدون VAT) | `expensesByTypeExcludingVat` |
| **107-111** | **(+) ضريبة القيمة المضافة كبند مصروف** | `vatAmount` |
| **113-116** | **إجمالي المصروفات** | `totalExpenses` ← **يشمل مصروفات VAT أصلاً** |
| 117-120 | الصافي بعد المصاريف | `netAfterExpenses = grandTotal - totalExpenses` |
| **121-124** | **(-) ضريبة القيمة المضافة مرة أخرى** | `vatAmount` |
| 125-128 | الصافي بعد الضريبة | `netAfterVat` |

**المشكلة:**
- `totalExpenses` يشمل مصروفات VAT (لأنه `sum(ALL expenses)`)
- ثم VAT تُعرض كبند منفصل في قسم المصروفات ← هذا صحيح بصرياً
- لكن `netAfterExpenses = grandTotal - totalExpenses` يكون قد خصم VAT بالفعل
- ثم السطر 121-124 يخصم VAT **مرة ثانية** ← خطأ حسابي في العرض

### لكن... القيم الفعلية قد تكون صحيحة!

للسنة المقفلة، `useComputedFinancials` يقرأ القيم **المخزنة** من الحساب الختامي:
```typescript
netAfterExpenses: safeNumber(currentAccount.net_after_expenses)
netAfterVat: storedNetAfterVat
```

فإذا كانت القيم المخزنة صحيحة (تم حسابها عند الإقفال)، فالأرقام **دقيقة داخلياً** لكن **العرض في الجدول يُربك المستخدم** لأن التسلسل البصري يوحي بخصم مزدوج.

---

## 3. تناقض عرضي في صفحة المستفيد

في `DisclosureFinancialStatement.tsx`:

| ما يُعرض | المصدر |
|---------|--------|
| بنود المصروفات الفردية | `expensesByTypeExcludingVat` (بدون VAT) |
| **إجمالي المصروفات** | `totalExpenses` (**يشمل** VAT) |

**المشكلة:** مجموع البنود المعروضة ≠ الإجمالي المعروض. الفرق = قيمة مصروفات VAT المخفية.

---

## 4. خلاصة الفحص

| # | المشكلة | الخطورة | النوع |
|---|---------|---------|-------|
| 1 | VAT تظهر في قسم المصروفات **و** تُخصم مرة أخرى تحت "الصافي بعد المصاريف" في جدول الإفصاح (الناظر) | **عالية** | تناقض عرضي / إرباك محاسبي |
| 2 | بنود المصروفات (بدون VAT) لا تجمع إلى `totalExpenses` (يشمل VAT) في صفحة المستفيد | **متوسطة** | تناقض عرضي |
| 3 | القيم الحسابية الداخلية (المخزنة في الحساب الختامي) — **صحيحة** | ✅ | سليم |

---

## 5. خطة الإصلاح

### الإصلاح 1 — جدول الإفصاح (الناظر): `AnnualDisclosureTable.tsx`

**المشكلة:** VAT تظهر كبند مصروف (سطر 107-111) ثم تُخصم مرة أخرى (سطر 121-124).

**الحل:** إزالة بند VAT من قسم المصروفات (أسطر 107-112) لأن `totalExpenses` يشملها بالفعل. إبقاء الخصم المنفصل (سطر 121-124) كما هو — فهو يوضح التسلسل المحاسبي: `المصروفات التشغيلية → VAT → الزكاة`.

**أو بديلاً:** تغيير `totalExpenses` ليعرض المصروفات بدون VAT (ليطابق البنود المعروضة)، مع تثبيت `netAfterExpenses` = `grandTotal - totalExpensesExcludingVat`.

### الإصلاح 2 — صفحة المستفيد: `DisclosureFinancialStatement.tsx`

**نفس النمط:** البنود المعروضة تستثني VAT لكن الإجمالي يشملها.

**الحل:** عرض `totalExpenses - vatAmount` كإجمالي مصروفات تشغيلية، ثم VAT كبند منفصل تحتها.

### التنفيذ

**ملفان فقط:**
1. `src/components/reports/AnnualDisclosureTable.tsx` — تعديل عرض المصروفات والإجمالي
2. `src/components/disclosure/DisclosureFinancialStatement.tsx` — تعديل عرض المصروفات والإجمالي

**لا تغييرات على المنطق الحسابي أو قاعدة البيانات.** الإصلاح في طبقة العرض فقط.

