

# خطة: إضافة aria-label في BeneficiaryCard.tsx

## نتائج التحقق الجنائي

### ✅ جميع الصفحات تحتوي على `<h1>` بالفعل:
كل صفحة في التقرير المقدّم (AdminDashboard, PropertiesPage, ContractsPage, IncomePage, ExpensesPage, BeneficiariesPage, ReportsPage, AccountsPage, UserManagementPage, SettingsPage, MessagesPage, InvoicesPage, AuditLogPage, BylawsPage, MySharePage, DisclosurePage, FinancialReportsPage, etc.) تحتوي على `<h1>` واضح بنمط موحّد. **التقرير المقدّم مبني على معلومات قديمة.**

### ❌ ما يحتاج إصلاح فعلاً:

## `BeneficiaryCard.tsx` — زران أيقونيان بدون `aria-label`

سطر 27-28: زر التعديل وزر الحذف بدون `aria-label`:

| الزر | aria-label المطلوب |
|------|-------------------|
| Edit (سطر 27) | `تعديل بيانات {beneficiary.name}` |
| Trash2 (سطر 28) | `حذف {beneficiary.name}` |

## ملف واحد متأثر

| الملف | التغيير |
|-------|---------|
| `src/components/beneficiaries/BeneficiaryCard.tsx` | إضافة `aria-label` لزرَي التعديل والحذف |

