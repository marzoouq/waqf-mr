

# تعديل التسلسل المالي الشامل مع إبقاء الزكاة والضريبة كبنود مستقلة

## التسلسل المالي النهائي المطلوب

```text
رقبة الوقف المرحلة من العام السابق (يدوي)
   + إجمالي الإيرادات
   = الإجمالي الشامل
   - المصروفات التشغيلية (بدون الضريبة)
   = الصافي بعد المصاريف
   - ضريبة القيمة المضافة (يدوي)
   = الصافي بعد الضريبة
   - الزكاة (يدوي)
   = الصافي بعد الزكاة
   - حصة الناظر (نسبة % من الصافي بعد الزكاة)
   - حصة الواقف (نسبة % من الباقي بعد الناظر)
   = ريع الوقف (الإجمالي القابل للتوزيع)
   - رقبة الوقف للعام الحالي (يدوي)
   = المبلغ المتاح
   - التوزيعات (يدوي - يحددها الناظر)
   = الرصيد المتبقي (محسوب)
```

---

## التغييرات المطلوبة

### 1. تعديل قاعدة البيانات

اضافة حقل جديد لجدول `accounts`:
- `waqf_corpus_previous` (numeric, default 0) - رقبة الوقف المرحلة من العام السابق

### 2. تعديل types/database.ts

اضافة `waqf_corpus_previous: number` لواجهة Account.

### 3. تعديل AccountsPage.tsx (التغيير الرئيسي)

**حقول يدوية جديدة (state):**
- `waqfCorpusPrevious` - رقبة وقف مرحلة من عام سابق
- `manualVat` - مبلغ الضريبة (يدوي بدلا من الحساب التلقائي)
- `manualDistributions` - مبلغ التوزيعات (يحدده الناظر)

**ازالة:**
- ازالة `effectiveVat` و `calculatedVat` و `commercialRent` و `residentialRent` (الحساب التلقائي للضريبة)
- ابقاء الحساب التلقائي كنص استرشادي فقط

**التسلسل الجديد في الكود:**
```text
grandTotal = totalIncome + waqfCorpusPrevious
netAfterExpenses = grandTotal - regularExpenses
netAfterVat = netAfterExpenses - manualVat
netAfterZakat = netAfterVat - zakatAmount          // الزكاة تبقى بند مستقل
adminShare = netAfterZakat * (adminPercent / 100)
afterAdmin = netAfterZakat - adminShare
waqifShare = afterAdmin * (waqifPercent / 100)
waqfRevenue = afterAdmin - waqifShare              // ريع الوقف
availableAmount = waqfRevenue - waqfCorpusManual   // بعد رقبة الوقف الحالية
remainingBalance = availableAmount - manualDistributions  // الرصيد المتبقي
```

**تعديل شريط الاعدادات:**
- اضافة حقل "رقبة وقف مرحلة من عام سابق" (يدوي)
- تحويل حقل الضريبة ليدوي (مع ابقاء النص الاسترشادي)
- اضافة حقل "مبلغ التوزيعات" (يدوي يحدده الناظر)

**تعديل بطاقات الملخص:**
- اضافة بطاقة "رقبة وقف مرحلة"
- اضافة بطاقة "الإجمالي الشامل"
- اضافة بطاقة "التوزيعات"
- اضافة بطاقة "الرصيد المتبقي"

**تعديل جدول التوزيع والحصص:** اضافة الصفوف الجديدة (الإجمالي الشامل، المبلغ المتاح، التوزيعات، الرصيد المتبقي)

**تعديل دالة handleCreateAccount:** حفظ القيم الجديدة (`waqf_corpus_previous`, `vat_amount` من manualVat, `distributions_amount` من manualDistributions)

### 4. تعديل ReportsPage.tsx

- اضافة بند "رقبة وقف مرحلة" و "الإجمالي الشامل" في بداية جدول الافصاح
- ابقاء الزكاة والضريبة كبنود مستقلة (كما هي حاليا)
- اضافة بنود "رقبة الوقف الحالية" و "التوزيعات" و "الرصيد المتبقي" في نهاية الجدول

### 5. تعديل FinancialReportsPage.tsx

- تحديث حساب حصة المستفيد ليستخدم `distributableAmount` الجديد

### 6. لوحة KPI في AdminDashboard.tsx

اضافة 4 مؤشرات اداء رئيسية:
- **نسبة التحصيل**: (الدخل الفعلي / الإيرادات التعاقدية) x 100%
- **معدل الاشغال**: (وحدات مؤجرة / إجمالي الوحدات) x 100%
- **متوسط الايجار**: إجمالي الإيجارات / عدد العقود النشطة
- **نسبة المصروفات**: (المصروفات / الدخل) x 100%

### 7. تحديث pdfGenerator.ts

تحديث بيانات PDF لتعكس التسلسل الجديد بالكامل

---

## الملفات المتأثرة (7 ملفات)

| الملف | التغيير |
|-------|---------|
| Migration SQL | اضافة عمود waqf_corpus_previous |
| types/database.ts | اضافة الحقل الجديد |
| AccountsPage.tsx | اعادة هيكلة التسلسل + حقول يدوية |
| ReportsPage.tsx | تحديث جدول الافصاح |
| FinancialReportsPage.tsx | تحديث حساب حصة المستفيد |
| AdminDashboard.tsx | اضافة لوحة KPI |
| pdfGenerator.ts | تحديث تصدير PDF |

