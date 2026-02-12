

# إكمال المتطلبات المتبقية وتحقيق التوافق الكامل

## الوضع الحالي

التسلسل المالي التتابعي تم تنفيذه بنجاح في `AccountsPage.tsx`، لكن 3 صفحات لا تزال تعرض بيانات غير متسقة مع التسلسل الجديد، بالإضافة لمتطلبات تحسين الوصولية (Accessibility) وتحقق النسب.

---

## المهام المطلوبة (مرتبة حسب الأولوية)

### 1. تصحيح FinancialReportsPage.tsx (أولوية عالية)

**المشكلة:** سطر 35 يستخدم `waqf_revenue` مباشرة لحساب حصة المستفيد بدون خصم رقبة الوقف.

**الإصلاح:**
- قراءة `zakat_amount` و `waqf_corpus_manual` من الحساب الختامي
- حساب `distributableAmount = waqfRevenue - waqfCorpusManual`
- استخدام `distributableAmount` لحساب `myShare` و `beneficiariesShare` في الرسوم البيانية
- إضافة بطاقات ملخص للزكاة ورقبة الوقف

### 2. تصحيح جدول الإفصاح في ReportsPage.tsx (أولوية عالية)

**المشكلة:** جدول الإفصاح السنوي (سطر 249-264) يعرض "صافي الريع" كـ `totalIncome - totalExpenses` بدون فصل الضريبة والزكاة ورقبة الوقف كبنود مستقلة.

**الإصلاح:**
- تعديل الجدول ليعرض التسلسل الكامل:
  - الصافي بعد المصاريف
  - (-) ضريبة القيمة المضافة
  - = الصافي بعد الضريبة
  - (-) الزكاة
  - = الصافي بعد الزكاة
  - (-) حصة الناظر (من الصافي بعد الزكاة)
  - (-) حصة الواقف (من الباقي بعد الناظر)
  - = ريع الوقف
  - (-) رقبة الوقف
  - = المبلغ القابل للتوزيع
- تصحيح نسبة الناظر (سطر 254) لتكون من `netAfterZakat` بدلا من `netRevenue`
- تصحيح نسبة الواقف (سطر 258) لتكون من `afterAdmin` بدلا من `netRevenue`

### 3. إضافة DialogDescription لـ 10 ملفات (أولوية متوسطة)

إضافة `DialogDescription` مخفي بصريا (`className="sr-only"`) بعد كل `DialogTitle` في:

| الملف | عدد الحوارات |
|-------|-------------|
| PropertiesPage.tsx | 2 |
| ContractsPage.tsx | 1 |
| ExpensesPage.tsx | 1 |
| IncomePage.tsx | 1 |
| AccountsPage.tsx | 1 |
| BeneficiariesPage.tsx | 1 |
| InvoicesPage.tsx | 1 |
| UserManagementPage.tsx | 3 |
| MessagesPage.tsx | 1 |
| BeneficiaryMessagesPage.tsx | 1 |

### 4. التحقق من مجموع نسب المستفيدين (أولوية متوسطة)

- في `BeneficiariesPage.tsx`: عند حفظ مستفيد جديد/تعديل، حساب المجموع الكلي ومنع الحفظ إذا تجاوز 100%
- في `AccountsPage.tsx`: عرض تحذير بصري إذا تجاوز المجموع 100%

---

## قسم تقني

### FinancialReportsPage.tsx - التعديلات:
```text
// الحالي (خطأ):
const beneficiariesShare = Number(currentAccount?.waqf_revenue || 0);
const myShare = (beneficiariesShare * percentage) / 100;

// الجديد (صحيح):
const waqfRevenue = Number(currentAccount?.waqf_revenue || 0);
const waqfCorpusManual = Number(currentAccount?.waqf_corpus_manual || 0);
const zakatAmount = Number(currentAccount?.zakat_amount || 0);
const distributableAmount = waqfRevenue - waqfCorpusManual;
const myShare = (distributableAmount * percentage) / 100;
```

### ReportsPage.tsx - إفصاح سنوي جديد:
```text
// بعد سطر "إجمالي المصروفات" مباشرة، نضيف:
// الصافي بعد المصاريف = netAfterExpenses
// (-) ضريبة القيمة المضافة = vatAmount  
// = الصافي بعد الضريبة = netAfterVat
// (-) الزكاة = zakatAmount
// = الصافي بعد الزكاة = netAfterZakat
// ثم حصة الناظر من netAfterZakat
// ثم حصة الواقف من afterAdmin (= netAfterZakat - adminShare)
// ثم رقبة الوقف = waqfCorpusManual
// ثم المبلغ القابل للتوزيع = distributableAmount
```

### DialogDescription - نمط الإضافة:
```text
import { DialogDescription } from '@/components/ui/dialog';

<DialogHeader>
  <DialogTitle>العنوان</DialogTitle>
  <DialogDescription className="sr-only">وصف الحوار</DialogDescription>
</DialogHeader>
```

### BeneficiariesPage.tsx - تحقق النسب:
```text
const currentTotal = beneficiaries
  .filter(b => b.id !== editingBeneficiary?.id)
  .reduce((sum, b) => sum + Number(b.share_percentage), 0);
const newPercentage = Number(formData.share_percentage);
if (currentTotal + newPercentage > 100) {
  toast.error('مجموع نسب المستفيدين يتجاوز 100%');
  return;
}
```

### الملفات المتأثرة (14 ملف):
1. `FinancialReportsPage.tsx` - حساب المبلغ القابل للتوزيع
2. `ReportsPage.tsx` - جدول الإفصاح الكامل
3. `BeneficiariesPage.tsx` - تحقق النسب + DialogDescription
4-13. عشر ملفات DialogDescription (PropertiesPage, ContractsPage, ExpensesPage, IncomePage, AccountsPage, InvoicesPage, UserManagementPage, MessagesPage, BeneficiaryMessagesPage)

