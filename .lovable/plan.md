

# خطة تنفيذ البندين المتبقيين

## البند 1: توحيد DECIMAL(15,2) عبر جميع حقول المبالغ

### الحقول المستهدفة (من المخطط الحالي)

| الجدول | العمود | النوع الحالي |
|--------|--------|-------------|
| `properties` | `area` | `numeric` (أُنشئ كـ 10,2) |
| `contracts` | `rent_amount` | `numeric` (10,2) |
| `contracts` | `payment_amount` | `numeric` |
| `income` | `amount` | `numeric` (10,2) |
| `expenses` | `amount` | `numeric` (10,2) |
| `accounts` | `total_income`, `total_expenses`, `admin_share`, `waqif_share`, `waqf_revenue`, `vat_amount`, `distributions_amount`, `net_after_expenses`, `net_after_vat`, `zakat_amount`, `waqf_corpus_manual`, `waqf_corpus_previous` | `numeric` (12,2) |
| `distributions` | `amount` | `numeric` (12,2) |
| `payment_invoices` | `amount`, `paid_amount`, `vat_amount` | `numeric` |
| `invoices` | `amount`, `vat_amount`, `amount_excluding_vat` | `numeric` |
| `invoice_items` | `unit_price`, `vat_amount`, `line_total` | `numeric` |
| `expense_budgets` | `budget_amount` | `numeric` |
| `advance_requests` | `amount` | `numeric` |
| `advance_carryforward` | `amount` | `numeric` |
| `contract_fiscal_allocations` | `allocated_amount` | `numeric` |

### التنفيذ
- ملف migration واحد يحتوي على `ALTER TABLE ... ALTER COLUMN ... TYPE numeric(15,2)` لكل عمود مبالغ
- استخدام `IF EXISTS` ضمنياً (ALTER TABLE آمن إذا كان العمود موجوداً)
- لا يتطلب تغيير كود — Supabase SDK يتعامل مع `numeric` بنفس الطريقة بغض النظر عن الدقة

---

## البند 2: إضافة session key لـ error_log_queue في ErrorBoundary

### الملف: `src/components/ErrorBoundary.tsx`

### التغيير
في الـ fallback block (سطر 62-65)، إضافة `session_id` لكل خطأ مُسجّل محلياً لتمييز الأخطاء بين الجلسات:

```typescript
// إنشاء session ID فريد عند تحميل الصفحة
const sessionId = globalThis.__ERROR_SESSION_ID ??= crypto.randomUUID();

queue.push({ ...metadata, session_id: sessionId, logged_at: new Date().toISOString() });
```

- يُولّد `session_id` مرة واحدة لكل جلسة (تحميل صفحة)
- يُخزّن على مستوى الموديول (ليس على `window`)
- يسمح بتجميع الأخطاء حسب الجلسة عند مراجعتها لاحقاً

---

## الملفات المتأثرة

1. **`supabase/migrations/XXXX_unify_decimal_precision.sql`** — migration جديد
2. **`src/components/ErrorBoundary.tsx`** — تعديل طفيف (3 أسطر)

