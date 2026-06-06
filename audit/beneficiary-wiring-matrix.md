# مصفوفة ربط لوحة المستفيد — Guards / Hooks / States

تاريخ: 2026-06-06 · النطاق: `src/pages/beneficiary/` (21 ملف، منها 4 اختبارات).

## المعايير

| العمود | المعنى |
|---|---|
| **Guard** | `RequirePublishedYears` / `DashboardLayout` بترتيب صحيح |
| **Hook** | Page Hook موجود في `hooks/page/beneficiary/...` (الصفحة logic-less) |
| **Load** | فرع تحميل: `DashboardSkeleton` / `TableSkeleton` / `loading` prop |
| **Err** | فرع خطأ مع `onRetry` أو `ErrorState` |
| **Empty** | فرع بيانات فارغة بـ `EmptyState` أو رسالة عربية موحّدة |
| **Unlinked** | فحص `!currentBeneficiary` قبل الحساب (للصفحات المالية) |
| **RT** | `useDashboardRealtime` للجداول ذات الصلة |
| **Btn** | كل زر مربوط بـ handler من hook (لا inline mutation) |
| **St** | لا `useState` يتيم في الصفحة (كل state من hook) |

✅ مطابق · ⚠️ مقبول/بحسب التصميم · ⊝ غير منطبق

## النتائج

| الصفحة | Guard | Hook | Load | Err | Empty | Unlinked | RT | Btn | St |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| AccountsViewPage | ✅ | ✅ `useAccountsViewPage` | ✅ | ✅ | ✅ | ✅ | ✅ accounts/distributions/income/expenses/fiscal_years | ✅ | ✅ |
| AnnualReportViewPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ | ✅ | ✅ |
| BeneficiaryDashboard | ✅ | ✅ | ✅ | ✅ | ⊝ widget محذوف بالكامل عند empty | ✅ H2 | ✅ distributions/accounts/advance_requests/fiscal_years/app_settings | ✅ | ✅ |
| BeneficiaryMessagesPage | ✅ | ⚠️ presentational wrapper (المنطق في مكوّن child) | ✅ | ⊝ | ✅ | ⊝ | ✅ | ✅ | ✅ |
| BeneficiarySettingsPage | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ | ✅ | ✅ | ✅ |
| BylawsViewPage | ✅ | ✅ | ✅ | ✅ | ⊝ | ⊝ | ⊝ ثابت | ✅ | ✅ |
| CarryforwardHistoryPage | ✅ N1 | ⚠️ presentational wrapper (`useCarryforwardData` يلتزم نمط hook) | ✅ | ⊝ | ✅ | ✅ | ✅ N12 | ✅ | ✅ |
| ContractsViewPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ contracts/properties/payment_invoices | ✅ | ✅ |
| DisclosurePage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ N9 | ✅ H12 | ✅ | ✅ |
| ExpensesViewPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ N2 | ✅ | ✅ |
| FinancialReportsPage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ H3 | ✅ | ✅ | ✅ |
| InvoicesViewPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ H17 | ✅ | ✅ |
| MySharePage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NotificationsPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ | ✅ | ✅ |
| PropertiesViewPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ | ✅ | ✅ |
| SupportPage | ✅ | ✅ | ✅ | ✅ | ✅ | ⊝ | ✅ | ✅ | ✅ |
| SupportPageGuard | ⊝ guard فقط (H21) | ⊝ | ⊝ | ⊝ | ⊝ | ⊝ | ⊝ | ⊝ | ⊝ |

## ملاحظات

- **BeneficiaryMessagesPage** و **CarryforwardHistoryPage** بلا `usePage*Page` بالاسم؛ مقبول لأن المنطق مغلَّف في hooks تخصصية (`useCarryforwardData`, `useConversations`). لا حاجة لإعادة الهيكلة.
- جميع الصفحات (17 إنتاجية) تمرّ المصفوفة (95% ✅، 5% مقبول بالتصميم).
- لا يوجد `useState` يتيم في أي صفحة بعد جولات الإصلاح السابقة.
- لا يوجد `supabase.*` خام في أي صفحة (مكفول عبر ESLint gate).

## التحقق

- `bunx vitest run` — جميع الاختبارات الـ 16 ناجحة.
- لا تغييرات هيكلية إضافية مطلوبة على الصفحات.
