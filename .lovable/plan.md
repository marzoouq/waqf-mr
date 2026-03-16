

# تقرير الفحص الجنائي الشامل — 2026-03-16

---

## 1. المسح الأمني — النتائج

| الماسح | النتائج | الحالة |
|--------|---------|--------|
| **supabase_lov** | `beneficiaries_safe` + `contracts_safe` — عروض VIEW آمنة | ✅ تم تصنيفها كإيجابيات كاذبة |
| **supabase** | Extension in public schema | ✅ تم التجاهل (سلوك افتراضي) |
| **agent_security** | 10 findings — جميعها `info` + `ignore: true` | ✅ لا تحذيرات نشطة |
| **connector_security** | 0 findings | ✅ نظيف |

**الخلاصة: 0 تحذيرات أمنية نشطة.**

---

## 2. TypeScript Strict Mode — الحالة

```json
// tsconfig.app.json — مفعّل بالكامل ✅
"strict": true,           // يشمل strictNullChecks + noImplicitAny
"noUnusedLocals": true,
"noUnusedParameters": true
```

**الحالة: مُكتمل. لا أخطاء بناء.**

---

## 3. Coverage Thresholds — الحالة

```typescript
// vitest.config.ts — مفعّل ✅
thresholds: { statements: 60, branches: 60, functions: 60, lines: 60 }
```

**الحالة: مُكتمل.**

---

## 4. CSP كـ HTTP Header — الحالة

موثّق في `docs/SECURITY-KNOWLEDGE.md` كتوصية مستقبلية. CSP الحالي عبر `<meta>` tag — كافٍ للمرحلة الحالية.

**الحالة: مُوثّق. لا يحتاج تنفيذ إضافي حالياً.**

---

## 5. ملاحظات الفحص الجنائي — أنماط `Number()` متبقية

### المشكلة
رغم تفعيل `safeNumber()` في الملفات المالية الجوهرية، لا تزال هناك **~50 استخدام لـ `Number()` بدون حماية** في ملفات ثانوية:

### التصنيف

| المجموعة | الملفات | النوع | الخطورة |
|-----------|---------|-------|---------|
| **عرض فقط (display)** | `ExpensesPage`, `InvoiceGridView`, `InvoiceSummaryCards`, `ZatcaManagementPage` | `Number(x).toLocaleString()` — للعرض فقط، NaN يظهر كنص | 🟡 منخفضة |
| **حسابات مالية** | `AnnualReportPage`, `AnnualReportViewPage`, `MonthlyPerformanceReport`, `ExpenseBudgetBar` | `Number(item.amount)` في reduce/sum — يمكن أن ينتج NaN | 🔴 عالية |
| **عقود** | `ContractsPage`, `PropertyUnitsDialog` | `Number(contract.rent_amount)` — في حسابات الدفعات | 🔴 عالية |
| **سُلف** | `useAdvanceRequests` | `Number(r.amount)` في reduce — أساسي لحسابات السلف | 🔴 عالية |
| **نماذج إدخال** | `ContractFormDialog`, `InvoicesPage`, `PropertiesPage`, `PaymentInvo