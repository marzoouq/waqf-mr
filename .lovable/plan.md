

# خطة الإصلاح — الجولة الثامنة (التقرير الجنائي الثالث)

---

## تحقق سريع: بنود مُصلحة فعلاً أو خاطئة في التقرير

| البند | الحكم | السبب |
|-------|-------|-------|
| A-01 CloseYearChecklist لا يمنع الإقفال | ✅ **مُصلح** | `disabled={isClosing \|\| checklist.some(i => !i.passed && i.severity === 'error')}` سطر 92 |
| A-02 beneficiaryPercentage لا يُمرَّر | ✅ **مُصلح** | `beneficiaryPercentage={totalBenPct}` + `hasAccount` + `pendingAdvances` + `unpaidInvoices` كلها مُمرَّرة (سطور 242-245) |
| D-06 orphanedContracts limit(50) | ✅ **مُصلح** | `limit(500)` + `staleTime: 60_000` |
| D-07 FiscalYearWidget Math.min | ✅ **مُصلح** | يعرض `rawFinancialProgress%` + badge "تجاوز الهدف" |
| D-08 DashboardAlerts truncation | ✅ **مُصلح** | `.slice(0, 3)` + "X آخرين" |
| D-09 Realtime invalidation | ✅ **مُصلح** | يُبطل فقط `queryKey: [table]` المتغير |
| PaymentInvoicesTab clearSelection | ✅ **مُصلح** | `onClick={clearSelection}` |
| I-03 contracts/paymentInvoices غير مستخدمة | ❌ **خطأ** | تُستخدم في `IncomeMonthlyChart` سطر 280 |
| SEC-01/02/03 سياسات RLS | ✅ **مُصلحة سابقاً** | تم تقييدها في migrations لاحقة (الأدوار المحددة فقط) |
| D-04 getKpiColor | ❌ **ليس خطأ** | المنطق صحيح: ≤20% أخضر، 21-40% أصفر، >40% أحمر |

---

## البنود القابلة للتنفيذ (12 إصلاح حقيقي)

### 🔴 فوري

**1. D-01 — `netCashFlow` محسوب بشكل خاطئ**
- الملف: `src/pages/dashboard/AdminDashboard.tsx` سطر 149
- المشكلة: يخصم `adminShare + waqifShare + zakatAmount` من `netAfterExpenses` لكنه يفتقد خصم VAT ويتضمن `waqfCorpusPrevious`. في السنة النشطة `adminShare = waqifShare = 0` فيعرض رقماً ضخماً مضلّلاً
- الإصلاح: `const netCashFlow = safeNumber(waqfRevenue);` — مباشرة من الحسابات الموحدة. في السنة النشطة سيعرض 0 مع ملاحظة "(مؤشر فقط)"

**2. D-02 — `distributionRatio` مضلّل في السنة النشطة**
- نفس الملف سطر 152
- المشكلة: `netAfterZakat` ليس المقام الصحيح لأن الحصص لم تُحسب بعد
- الإصلاح: في السنة النشطة عرض "—" أو 0 بدلاً من نسبة لا معنى لها

**3. D-03 — `collectionRate` 0% عند عدم وجود فواتير مستحقة**
- سطر 185 + عرض KPI
- الإصلاح: عند `collectionSummary.total === 0` عرض "—" بدلاً من "0%"

**4. I-01 — إضافة دخل بدون `fiscal_year_id` عند `'all'`**
- الملف: `src/pages/dashboard/IncomePage.tsx` سطر 81
- المشكلة: `fiscalYear?.id` = `undefined` عند "جميع السنوات" → دخل يتيم
- الإصلاح: إضافة تحقق مبكر: `if (!editingIncome && !fiscalYear?.id) { toast.error('يرجى اختيار سنة مالية محددة'); return; }`

**5. C-01 — `handleBulkRenew` بدون حماية من النقر المزدوج**
- الملف: `src/hooks/page/useContractsPage.ts` سطر 201
- المشكلة: `setBulkRenewing(true)` موجود لكن الزر قد لا يكون مرتبطاً بـ `bulkRenewing` → duplicate contracts
- الإصلاح: التحقق من ربط `disabled={bulkRenewing}` في الـ UI + إضافة early return إذا `bulkRenewing`

**6. A-05 — `handleExportPdf` بدون error handling**
- الملف: `src/hooks/financial/useAccountsActions.ts` سطر 221
- الإصلاح: تغليف بـ `try/catch` + `toast.error` + loading state

### 🟠 هذا الأسبوع

**7. C-03 — `selectedForRenewal` لا تُصفَّر عند تغيير FY**
- الملف: `src/hooks/page/useContractsPage.ts`
- الإصلاح: `useEffect(() => setSelectedForRenewal(new Set()), [fiscalYearId])`

**8. C-04 — لا يوجد تحقق `end_date > start_date`**
- الملف: `src/hooks/page/useContractsPage.ts` سطر 106
- الإصلاح: إضافة validation قبل الحفظ

**9. B-02 — `share_percentage` يقبل 0 أو سالب**
- الملف: `src/components/beneficiaries/BeneficiaryFormDialog.tsx` سطر 67
- الإصلاح: إضافة `min="0.01"` + validation في `handleSubmit`

**10. GS-01 — استعلامات البحث متسلسلة**
- الملف: `src/components/GlobalSearch.tsx` سطور 123-190
- الإصلاح: تحويل لـ `Promise.all`

**11. P-01 — حذف وحدة بدون عرض عدد العقود المرتبطة**
- الملف: `src/components/properties/units/DeleteUnitDialog.tsx`
- الإصلاح: إضافة prop `relatedContractsCount` وعرضه في التحذير

**12. D-11 — `sharesNote` "(مؤشر فقط)" مبهم**
- الملف: `src/pages/dashboard/AdminDashboard.tsx`
- الإصلاح: إضافة tooltip يشرح أن الحصص تُحسب عند إقفال السنة

---

## لن يُعدَّل

| البند | السبب |
|-------|-------|
| D-05 `Date.now()` في expiringContracts | العقود المنتهية قريباً تعتمد على التاريخ الحالي بطبيعتها |
| D-10 ErrorBoundary بدون retry | تحسين UX غير حرج |
| A-03 ZATCA check قبل الإقفال | الإقفال لا يمنع إرسال ZATCA لاحقاً |
| A-04 paramsRef stale closure | خطر نظري — الـ effect يُنفَّذ قبل أي تفاعل مستخدم |
| P-03 نسبة إشغال عقار كامل | سلوك مقصود: عقد "كامل" = كل الوحدات |
| B-01 حذف مستفيد بدون تحقق | `ON DELETE CASCADE` مقصود — الناظر مسؤول |
| AD-01/02 تحقق السلف | تحسين مستقبلي — الناظر يملك صلاحية مطلقة |
| I-02 تاريخ خارج نطاق FY | تحسين UX — لا يكسر بيانات |
| C-02 حساب تواريخ هجرية | يتطلب مكتبة تقويم هجري كاملة |
| R-01/R-02 ReportsPage | تحسينات منفصلة |
| N-01/AU-01 pagination | مُنفَّذة أصلاً أو كافية حالياً |
| GS-02 إضافة income للبحث | تحسين مستقبلي |

---

## الملفات المتأثرة

| الملف | التغييرات |
|-------|----------|
| `src/pages/dashboard/AdminDashboard.tsx` | إصلاح `netCashFlow` + `distributionRatio` + `collectionRate` KPI + tooltip لـ sharesNote |
| `src/pages/dashboard/IncomePage.tsx` | منع إضافة دخل بدون FY |
| `src/hooks/page/useContractsPage.ts` | حماية bulk renew + reset selection + date validation |
| `src/hooks/financial/useAccountsActions.ts` | try/catch لـ handleExportPdf |
| `src/components/beneficiaries/BeneficiaryFormDialog.tsx` | min validation لنسبة الحصة |
| `src/components/GlobalSearch.tsx` | Promise.all للاستعلامات |
| `src/components/properties/units/DeleteUnitDialog.tsx` | عرض عدد العقود المرتبطة |

