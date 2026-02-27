

# خطة: تقييد حساب الحصص ورقبة الوقف للسنوات المقفلة فقط

## المشكلة الحالية
حالياً يتم حساب وعرض **حصة الناظر** و**حصة الواقف** و**رقبة الوقف** بشكل ديناميكي حتى في السنوات المالية النشطة (غير المقفلة). المطلوب هو عدم احتساب أو عرض هذه البنود إلا بعد إقفال السنة المالية.

## التغييرات المطلوبة

### 1. تعديل دالة الحسابات المالية (`accountsCalculations.ts`)
- إضافة معامل جديد `isClosed: boolean` إلى `FinancialParams`
- عند `isClosed = false`: تصفير `adminShare`، `waqifShare`، `waqfCorpusManual` في الحسابات
- الحفاظ على بقية التسلسل المالي (دخل - مصروفات - ضريبة - زكاة) كما هو

### 2. تعديل `useComputedFinancials.ts`
- تمرير حالة السنة المالية (مقفلة أم لا) إلى `calculateFinancials`
- عند عدم وجود حساب ختامي محفوظ وسنة نشطة: تصفير الحصص في النتائج

### 3. تعديل `useAccountsPage.ts`
- تمرير `isClosed` من `useFiscalYear()` إلى `calculateFinancials`
- السماح للناظر بمشاهدة الحقول (حصة الناظر، حصة الواقف، رقبة الوقف) في صفحة الحسابات الختامية كحقول إدخال فقط عند الإقفال

### 4. تعديل واجهة لوحة التحكم (`AdminDashboard.tsx`)
- إخفاء أو تصفير بطاقات "حصة الناظر" و"حصة الواقف" و"ريع الوقف" عندما تكون السنة المالية نشطة
- عرض تنبيه "يتم احتساب الحصص بعد إقفال السنة المالية"

### 5. تعديل واجهة المستفيدين
- في `BeneficiaryDashboard.tsx` و`DisclosurePage.tsx` و`MySharePage.tsx`: عرض الحصص فقط عند وجود سنة مقفلة مع حساب ختامي محفوظ (وهذا يحدث تلقائياً لأن الحصص ستكون صفراً في السنوات النشطة)

### 6. تعديل ملخص الحسابات (`AccountsSummaryCards.tsx`) وجدول التوزيع (`AccountsDistributionTable.tsx`)
- إضافة خاصية `isClosed` لتمييز العرض
- في السنوات النشطة: عرض البنود من الدخل حتى الزكاة فقط، مع ملاحظة "سيتم احتساب الحصص عند إقفال السنة"
- في السنوات المقفلة: عرض كامل كالمعتاد

---

## التفاصيل التقنية

### تعديل `calculateFinancials` (الملف الأساسي):
```text
اضافة isClosed إلى FinancialParams
عند isClosed === false:
  adminShare = 0
  waqifShare = 0
  waqfRevenue = netAfterZakat (كامل بدون خصم حصص)
  waqfCorpusManual يبقى صفر في الحساب
  availableAmount = 0
  remainingBalance = 0
```

### صفحة الحسابات الختامية (استثناء):
الناظر يحتاج رؤية أرقام الحصص **المتوقعة** أثناء إعداد الحساب الختامي قبل الإقفال. لذا:
- في `AccountsPage` فقط: تمرير `isClosed = true` دائماً لدالة الحساب حتى يتمكن الناظر من مراجعة الأرقام قبل الإقفال
- إضافة تنبيه واضح: "هذه أرقام تقديرية - يتم اعتمادها رسمياً عند إقفال السنة"
- باقي الصفحات (لوحة التحكم، واجهات المستفيدين): تستخدم `isClosed` الحقيقي

### الملفات المتأثرة:
1. `src/utils/accountsCalculations.ts` - إضافة `isClosed` للمعامل
2. `src/hooks/useComputedFinancials.ts` - تمرير حالة السنة
3. `src/hooks/useAccountsPage.ts` - استثناء صفحة الحسابات
4. `src/pages/dashboard/AdminDashboard.tsx` - تعديل بطاقات الإحصائيات
5. `src/components/accounts/AccountsSummaryCards.tsx` - إضافة تنبيه
6. `src/components/accounts/AccountsDistributionTable.tsx` - إضافة تنبيه
7. `src/pages/beneficiary/BeneficiaryDashboard.tsx` - تأثر تلقائي
8. `src/pages/beneficiary/DisclosurePage.tsx` - تأثر تلقائي
9. اختبارات `accountsCalculations.test.ts` - تحديث الاختبارات

