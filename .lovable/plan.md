

# فحص جنائي — مقارنة إفصاح المستفيد مع لوحة الناظر

---

## 1. مصدر البيانات — نفس المحرك بالضبط

| الجانب | صفحة الناظر (ReportsPage) | صفحة المستفيد (DisclosurePage) |
|--------|--------------------------|-------------------------------|
| **المحرك** | `useFinancialSummary(fiscalYearId)` | `useFinancialSummary(fiscalYearId)` |
| **الحساب الختامي** | `useComputedFinancials` | `useComputedFinancials` |
| **بنود المصروفات** | `expensesByTypeExcludingVat` | `expensesByTypeExcludingVat` |
| **بنود الإيرادات** | `incomeBySource` | `incomeBySource` |

**✅ كلا الصفحتين تستخدمان نفس المحرك (`useFinancialSummary`) ونفس المنطق الحسابي (`useComputedFinancials`). لا يوجد مسار بيانات منفصل.**

---

## 2. مقارنة البنود المعروضة (ما يراه كل طرف)

| البند | الناظر (`AnnualDisclosureTable`) | المستفيد (`DisclosureFinancialStatement`) | تطابق؟ |
|-------|----------------------------------|------------------------------------------|--------|
| بنود الإيرادات | `incomeSourceData` (من `incomeBySource`) | `incomeBySource` | ✅ نفس المصدر |
| إجمالي الإيرادات | `totalIncome` | `totalIncome` | ✅ |
| رقبة الوقف المرحلة | `waqfCorpusPrevious` | `waqfCorpusPrevious` | ✅ |
| الإجمالي الشامل | `grandTotal` | `grandTotal` | ✅ |
| بنود المصروفات | `expenseTypeData` (من `expensesByTypeExcludingVat`) | `expensesByType` (= `expensesByTypeExcludingVat`) | ✅ نفس المصدر |
| إجمالي المصروفات | `totalExpenses` | `totalExpenses` (مقسم: تشغيلية + ضريبة) | ✅ نفس الرقم |
| الصافي بعد المصاريف | `netAfterExpenses` | `netAfterExpenses` | ✅ |
| ضريبة القيمة المضافة | `vatAmount` | `vatAmount` | ✅ |
| الصافي بعد الضريبة | `netAfterVat` | `netAfterVat` | ✅ |
| الزكاة | `zakatAmount` | `zakatAmount` | ✅ |
| الصافي بعد الزكاة | `netAfterZakat` | `netAfterZakat` | ✅ |
| حصة الناظر | `adminShare` (`adminPct%`) | `adminShare` (`adminPct%`) | ✅ |
| حصة الواقف | `waqifShare` (`waqifPct%`) | `waqifShare` (`waqifPct%`) | ✅ |
| ريع الوقف | `waqfRevenue` | **غير معروض** | ⚠️ |
| رقبة الوقف الحالي | `waqfCorpusManual` | `waqfCorpusManual` | ✅ |
| المبلغ المتاح / القابل للتوزيع | `availableAmount` | `beneficiariesShare` (= `availableAmount`) | ✅ |
| التوزيعات | `distributionsAmount` | **غير معروض** | ⚠️ |
| الرصيد المتبقي | `remainingBalance` | **غير معروض** | ⚠️ |
| حصتي | **غير موجود** (الناظر لا يرى حصة مستفيد محدد) | `myShare` | ✅ طبيعي |

---

## 3. الفروقات المكتشفة

### ⚠️ فرق 1: "ريع الوقف" غير معروض للمستفيد

**الناظر يرى:** `ريع الوقف (الإجمالي القابل للتوزيع)` = `waqfRevenue`
**المستفيد يرى:** ينتقل مباشرة من حصة الواقف → رقبة الوقف → "الإجمالي القابل للتوزيع" = `availableAmount`

**هل هذا مشكلة؟** لا — **سلوك مقصود**. `availableAmount = waqfRevenue - waqfCorpusManual`. المستفيد يرى النتيجة النهائية بدلاً من الخطوة الوسيطة. التسلسل الحسابي سليم.

### ⚠️ فرق 2: "التوزيعات" و"الرصيد المتبقي" غير معروضة للمستفيد

**الناظر يرى:** `التوزيعات` + `الرصيد المتبقي`
**المستفيد لا يرى:** هذه بنود إدارية — **سلوك مقصود**.

### ⚠️ فرق 3: حساب `myShare` — مسارات مختلفة

| المسار | المصدر | المنطق |
|--------|--------|--------|
| **صفحة الإفصاح** | `useMyShare` hook | `availableAmount × (sharePct / totalBenPct)` — يستخدم `useTotalBeneficiaryPercentage` (RPC `SECURITY DEFINER`) |
| **داشبورد المستفيد** | `get_beneficiary_dashboard` RPC | يحسب في PostgreSQL بنفس المعادلة |
| **صفحة التقارير (الناظر)** | `distributionData` محلي | `beneficiariesShare × (sharePct / totalBenPct)` — يستخدم `reduce` على المستفيدين المرئيين |

**خطر محتمل:** الناظر يحسب `totalBeneficiaryPercentage` بـ `reduce` على `beneficiaries` المُجلبة عبر RLS، بينما المستفيد يستخدم RPC `SECURITY DEFINER` يتجاوز RLS.

**لكن:** الناظر لديه `has_role(admin)` → يرى **كل** المستفيدين → `reduce` يعطي نفس النتيجة. **لا تناقض فعلي.**

---

## 4. التحقق الحسابي — التسلسل المنطقي

### مسار الناظر:
```text
grandTotal = totalIncome + waqfCorpusPrevious
netAfterExpenses = grandTotal - totalExpenses
netAfterVat = netAfterExpenses - vatAmount
netAfterZakat = netAfterVat - zakatAmount
adminShare = shareBase × adminPct%
waqifShare = shareBase × waqifPct%
waqfRevenue = netAfterZakat - adminShare - waqifShare  ← يُعرض
availableAmount = waqfRevenue - waqfCorpusManual        ← يُعرض
remainingBalance = availableAmount - distributionsAmount ← يُعرض
```

### مسار المستفيد:
```text
grandTotal = totalIncome + waqfCorpusPrevious           ← ✅ نفسه
netAfterExpenses = grandTotal - totalExpenses            ← ✅ نفسه
netAfterVat = netAfterExpenses - vatAmount               ← ✅ نفسه
netAfterZakat = netAfterVat - zakatAmount                ← ✅ نفسه
adminShare = (من الحساب الختامي)                          ← ✅ نفسه
waqifShare = (من الحساب الختامي)                          ← ✅ نفسه
                                                          ← waqfRevenue محذوف (خطوة وسيطة)
beneficiariesShare = availableAmount                      ← ✅ نفسه
myShare = availableAmount × (myPct / totalBenPct)        ← ✅ إضافي للمستفيد
```

**التسلسل متطابق رياضياً. الفرق فقط في عمق العرض.**

---

## 5. الخلاصة النهائية

| # | البند | النتيجة |
|---|-------|---------|
| 1 | مصدر البيانات | ✅ **نفس المحرك** — `useFinancialSummary` |
| 2 | الأرقام المشتركة (12 بند) | ✅ **متطابقة 100%** |
| 3 | بنود إضافية عند الناظر (3 بنود) | ✅ **مقصود** — بنود إدارية |
| 4 | بنود إضافية عند المستفيد (حصتي) | ✅ **مقصود** — خاص بالمستفيد |
| 5 | حساب `myShare` | ✅ **متسق** — نفس المعادلة |
| 6 | عرض المصروفات | ✅ **محسّن** — المستفيد يرى تشغيلية + ضريبة منفصلتين |

**لا توجد تناقضات. لا تغييرات مطلوبة.**

