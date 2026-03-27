

# فحص جنائي — السنة المقفلة: تتبّع المتغيرات رقم برقم

## ملخص

تم فحص مسارين مختلفين لحساب الأرقام في السنوات المقفلة:

1. **مسار صفحة الحسابات (AccountsPage)**: يستخدم `calculateFinancials()` مع `isClosed = true`
2. **مسار صفحة التقارير (ReportsPage)**: يستخدم `useComputedFinancials` مع `fiscalYearStatus = 'closed'`

---

## المسار 1 — صفحة الحسابات (AccountsPage)

```text
useAccountsPage
  → useAccountsCalculations({ isClosed: data.selectedFY?.status === 'closed' })
    → calculateFinancials({ isClosed: true })
```

**المعادلات في `calculateFinancials` (سنة مقفلة):**

| # | المتغير | المعادلة | ✅/⚠️ |
|---|---------|---------|------|
| 1 | `grandTotal` | `totalIncome + waqfCorpusPrevious` | ✅ |
| 2 | `netAfterExpenses` | `grandTotal - totalExpenses` | ✅ |
| 3 | `netAfterVat` | `netAfterExpenses - manualVat` | ✅ |
| 4 | `netAfterZakat` | `netAfterVat - zakatAmount` | ✅ |
| 5 | `shareBase` | `max(0, totalIncome - totalExpenses - zakatAmount)` | ✅ VAT لا يُخصم — بالتصميم |
| 6 | `adminShare` | `round(shareBase × adminPercent/100)` | ✅ |
| 7 | `waqifShare` | `round(shareBase × waqifPercent/100)` | ✅ |
| 8 | `waqfRevenue` | `round(netAfterZakat - adminShare - waqifShare)` | ✅ |
| 9 | `availableAmount` | `round(waqfRevenue - waqfCorpusManual)` | ✅ |
| 10 | `remainingBalance` | `round(availableAmount - manualDistributions)` | ✅ |

**ملاحظة**: هذا المسار يحسب كل شيء ديناميكياً من البيانات الحية — **لا يقرأ من الحساب المخزن**.

---

## المسار 2 — صفحة التقارير (ReportsPage)

```text
useReportsData
  → useFinancialSummary(fyId, label, { fiscalYearStatus: fy.status })
    → useComputedFinancials({ fiscalYearStatus: 'closed' })
```

**المنطق في `useComputedFinancials` عند وجود `currentAccount` و `isClosed = true`:**

| # | المتغير | المصدر | ✅/⚠️ |
|---|---------|--------|------|
| 1 | `grandTotal` | `totalIncome (حي) + waqfCorpusPrevious (من الحساب)` | ✅ |
| 2 | `netAfterExpenses` | **من الحساب المخزن** `currentAccount.net_after_expenses` | ✅ |
| 3 | `netAfterVat` | **من الحساب المخزن** `currentAccount.net_after_vat` | ✅ |
| 4 | `netAfterZakat` | `storedNetAfterVat - storedZakat` | ✅ |
| 5 | `shareBase` | `storedTotalIncome - storedTotalExpenses - storedZakat` | ⚠️ ملاحظة |
| 6 | `adminShare` | **من الحساب المخزن** | ✅ |
| 7 | `waqifShare` | **من الحساب المخزن** | ✅ |
| 8 | `waqfRevenue` | **من الحساب المخزن** | ✅ |
| 9 | `availableAmount` | `storedWaqfRevenue - waqfCorpusManual (من الحساب)` | ✅ |
| 10 | `remainingBalance` | `storedWaqfRevenue - waqfCorpusManual - distributionsAmount` | ✅ |

---

## ⚠️ اختلاف محتمل بين المسارين

### المشكلة: `grandTotal` في المسار 2

في **سطر 86** من `useComputedFinancials`:
```ts
const grandTotal = totalIncome + waqfCorpusPrevious;
```

هنا `totalIncome` يأتي من **البيانات الحية** (جدول `income`)، بينما `waqfCorpusPrevious` يأتي من **الحساب المخزن**.

في المسار 1 (AccountsPage) كلاهما يأتي من مدخلات يدوية/حية.

**السيناريو الخطر**: إذا أضاف الناظر (admin) سجل دخل جديد في سنة مقفلة بعد الإقفال:
- `totalIncome` الحي سيتغير
- لكن `netAfterExpenses` و`adminShare` وباقي القيم تأتي من الحساب **المخزن** (لم تتغير)
- **النتيجة**: `grandTotal` يصبح غير متسق مع `netAfterExpenses`

**الحكم**: هذا **مقبول بالتصميم** لأن:
1. السنوات المقفلة محمية بـ trigger `prevent_closed_fiscal_year_modification`
2. فقط الناظر يستطيع التعديل (وهو يعلم أنه يجب إعادة حفظ الحساب)
3. `netAfterExpenses` المخزن يعكس لحظة الإقفال — وهذا هو المطلوب

### المشكلة: `shareBase` محسوب لا مخزن

في **سطر 122**:
```ts
shareBase: safeNumber(currentAccount.total_income) - safeNumber(currentAccount.total_expenses) - storedZakat
```

هذا يستخدم `total_income` و `total_expenses` **المخزنين في الحساب** (لا الحيين). هذا **صحيح** — لكن `shareBase` لا يُعرض مباشرة للمستخدم، فهو قيمة وسيطة فقط.

---

## فحص الاتساق الرياضي (سنة مقفلة نموذجية)

فرضاً:
```text
totalIncome = 500,000
totalExpenses = 100,000
waqfCorpusPrevious = 50,000
VAT = 15,000
Zakat = 10,000
adminPct = 10%, waqifPct = 5%
waqfCorpusManual = 20,000
distributions = 30,000
```

| المتغير | المعادلة | القيمة |
|---------|---------|--------|
| grandTotal | 500,000 + 50,000 | **550,000** |
| netAfterExpenses | 550,000 - 100,000 | **450,000** |
| netAfterVat | 450,000 - 15,000 | **435,000** |
| netAfterZakat | 435,000 - 10,000 | **425,000** |
| shareBase | max(0, 500,000 - 100,000 - 10,000) | **390,000** |
| adminShare | 390,000 × 10% | **39,000** |
| waqifShare | 390,000 × 5% | **19,500** |
| waqfRevenue | 425,000 - 39,000 - 19,500 | **366,500** |
| availableAmount | 366,500 - 20,000 | **346,500** |
| remainingBalance | 346,500 - 30,000 | **316,500** |

**التحقق**: `netAfterZakat (425,000) = adminShare (39,000) + waqifShare (19,500) + waqfRevenue (366,500)` ✅

---

## فحص `isDeficit`

```ts
// المسار 1 (calculateFinancials):
isDeficit: availableAmount < 0 || remainingBalance < 0

// المسار 2 (useComputedFinancials):
isDeficit: (storedWaqfRevenue - waqfCorpusManual) < 0
```

⚠️ **اختلاف**: المسار 2 **لا يفحص `remainingBalance < 0`** — يفحص `availableAmount` فقط.

**التأثير**: إذا كان `availableAmount > 0` لكن `remainingBalance < 0` (أي التوزيعات تجاوزت المتاح)، المسار 2 لن يرصد العجز.

**الحكم**: ⚠️ **خلل طفيف** — يجب توحيد فحص `isDeficit` بين المسارين.

---

## الخلاصة النهائية

| البند | الحكم |
|-------|-------|
| تسلسل المعادلات | ✅ صحيح رياضياً |
| `grandTotal` | ✅ متسق |
| `netAfterExpenses` | ✅ |
| `netAfterVat` | ✅ |
| `netAfterZakat` | ✅ |
| `shareBase` (VAT لا يُخصم) | ✅ بالتصميم |
| `adminShare` / `waqifShare` | ✅ |
| `waqfRevenue` | ✅ |
| `availableAmount` | ✅ |
| `remainingBalance` | ✅ |
| `isDeficit` بين المسارين | ⚠️ اختلاف طفيف — المسار 2 لا يفحص `remainingBalance` |
| اتساق المسارين عند عدم تعديل بيانات السنة المقفلة | ✅ |

## خطة الإصلاح

**إصلاح واحد فقط مطلوب**:
- في `useComputedFinancials.ts` سطر 128، تغيير:
  ```ts
  isDeficit: (storedWaqfRevenue - waqfCorpusManual) < 0,
  ```
  إلى:
  ```ts
  isDeficit: (storedWaqfRevenue - waqfCorpusManual) < 0 || (storedWaqfRevenue - waqfCorpusManual - distributionsAmount) < 0,
  ```
  لتوحيد منطق `isDeficit` مع `calculateFinancials`.

