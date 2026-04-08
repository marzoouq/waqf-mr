

# خطة إعادة هيكلة hooks/page/admin — النسخة المحدّثة

تم دمج ملاحظات المراجعة الأربع في الخطة.

---

## التغييرات عن الخطة السابقة

| الملاحظة | القرار |
|----------|--------|
| re-exports مؤقتة بدل تحديث 38 ملف | **مقبول** — ملفات proxy مؤقتة في الجذر |
| تسمية `distributionCalc` | **مقبول** — يبقى `distributionCalcPure.ts` للحفاظ على الدلالة |
| `useSupportDashboardPage` في dashboard؟ | **نعم** — هو لوحة تحكم دعم فني للأدمن، ينتمي لـ `dashboard/` |
| أداء barrel في dev | Vite يتعامل جيداً — نراقب لاحقاً |

---

## الخطوة 1: نقل `distributionCalcPure.ts`

| من | إلى |
|----|-----|
| `hooks/page/admin/distributionCalcPure.ts` | `utils/financial/distributionCalcPure.ts` |
| `hooks/page/admin/distributionCalcPure.test.ts` | `utils/financial/distributionCalcPure.test.ts` |

- تحديث استيراد `useDistributionCalculation.ts`: `from '@/utils/financial/distributionCalcPure'`
- إضافة export في `utils/financial/index.ts`

**ملفات متأثرة**: 3 فقط

---

## الخطوة 2: إنشاء 5 مجلدات فرعية ونقل الملفات

```text
hooks/page/admin/
├── dashboard/   (4 hooks + 1 test)
│   ├── useAccountantDashboardData.ts
│   ├── useAdminDashboardData.ts
│   ├── useAdminDashboardStats.ts
│   ├── useSupportDashboardPage.ts
│   ├── useSupportDashboardPage.test.ts
│   └── index.ts
├── financial/   (10 hooks)
│   ├── useCarryforwardData.ts
│   ├── useCollectionData.ts
│   ├── useCreateInvoiceForm.ts
│   ├── useDistributionCalculation.ts
│   ├── useExpensesPage.ts
│   ├── useFiscalYearManagement.ts
│   ├── useIncomePage.ts
│   ├── useInvoicesPage.ts
│   ├── usePaymentInvoiceActions.ts
│   ├── usePaymentInvoicesTab.ts
│   └── index.ts
├── contracts/   (5 hooks)
│   ├── useContractForm.ts
│   ├── useContractFormDialog.ts
│   ├── useContractsBulkRenew.ts
│   ├── useContractsFilters.ts
│   ├── useContractsPage.ts
│   └── index.ts
├── reports/     (3 hooks)
│   ├── useAnnualReportPage.ts
│   ├── useHistoricalComparison.ts
│   ├── useReportsData.ts
│   └── index.ts
├── settings/    (9 hooks)
│   ├── useAuditLogPage.ts
│   ├── useBeneficiariesPage.ts
│   ├── useBulkNotifications.ts
│   ├── useBylawsPage.ts
│   ├── useChartOfAccountsPage.ts
│   ├── usePropertiesPage.ts
│   ├── usePropertiesViewData.ts
│   ├── useSystemDiagnostics.ts
│   ├── useZatcaSettings.ts
│   └── index.ts
└── index.ts  ← barrel يعيد تصدير المجلدات الفرعية
```

---

## الخطوة 3: ملفات re-export مؤقتة (بدلاً من تحديث 38 ملف)

بدلاً من تحديث كل ملف مستهلك، يُنشأ ملف proxy في الجذر لكل hook منقول:

```typescript
// hooks/page/admin/useContractForm.ts (proxy مؤقت)
export { useContractForm } from './contracts/useContractForm';
```

هذا يعني:
- **صفر** ملفات خارجية تحتاج تحديث
- **صفر** merge conflicts محتملة
- يمكن إزالة الـ proxies لاحقاً تدريجياً في PRs مستقلة

---

## الخطوة 4: تحديث الاستيرادات الداخلية فقط

الملفات داخل نفس المجلد الفرعي التي تستورد من بعضها:
- `useContractsPage` ← `useContractForm`, `useContractsFilters`, `useContractsBulkRenew` (كلها في `contracts/` → مسار نسبي `./`)
- `usePaymentInvoicesTab` ← `usePaymentInvoiceActions` (كلاها في `financial/` → `./`)
- `useAdminDashboardData` ← `useAdminDashboardStats` (كلاهما في `dashboard/` → `./`)

---

## التحقق

- `tsc --noEmit` — صفر أخطاء
- `vitest run distributionCalcPure` — 18 اختبار ناجح
- `vitest run useSupportDashboardPage` — اختبار ناجح

---

## ملخص التأثير

| المقياس | قبل | بعد |
|---------|-----|-----|
| ملفات حقيقية في الجذر | 33 | ~33 proxy (مؤقتة) + `index.ts` |
| مجلدات فرعية | 0 | 5 |
| ملفات خارجية تحتاج تعديل | — | **0** (بفضل proxies) |
| `distributionCalcPure` في hooks | نعم | لا → `utils/financial/` |
| التوافق العكسي | — | ✅ كامل |

