

# إضافة حقول هوية المستأجر (المشتري) في نموذج العقد ومسار الفوترة

## السياق الحالي

مولّد XML يقرأ حقول `buyer_id_type`, `buyer_id`, `buyer_street`, `buyer_building` من بيانات الفاتورة، لكن هذه الحقول **غير موجودة** في قاعدة البيانات. النتيجة: كل الفواتير القياسية تُنشأ بـ `schemeID="NAT"` وبيانات مشتري فارغة.

بما أن النظام نظام تأجير عقارات (سكني/تجاري)، المشتري هو **المستأجر** والبيانات يجب أن تُخزّن في جدول **العقود** (contracts) لأنها مرتبطة بالمستأجر وليس بالفاتورة.

## التغييرات المطلوبة

### 1. Migration: إضافة أعمدة للعقود
```sql
ALTER TABLE contracts ADD COLUMN tenant_id_type text DEFAULT 'NAT';
ALTER TABLE contracts ADD COLUMN tenant_id_number text;
ALTER TABLE contracts ADD COLUMN tenant_street text;
ALTER TABLE contracts ADD COLUMN tenant_building text;
ALTER TABLE contracts ADD COLUMN tenant_district text;
ALTER TABLE contracts ADD COLUMN tenant_city text;
ALTER TABLE contracts ADD COLUMN tenant_postal_code text;
```

### 2. نموذج العقد (`ContractFormDialog.tsx`)
- إضافة حقل **نوع الهوية** (Select: هوية وطنية NAT، سجل تجاري CRN، إقامة IQA، جواز سفر PAS)
- إضافة حقل **رقم الهوية** (Input مع validation حسب النوع)
- إضافة حقول عنوان المستأجر اختيارية (شارع، مبنى، حي، مدينة، رمز بريدي) — مطلوبة فقط للفواتير القياسية B2B

### 3. تحديث `ContractFormData` و `emptyFormData`
إضافة الحقول الجديدة للنوع والبيانات الابتدائية.

### 4. تحديث `src/types/database.ts` (Contract interface)
إضافة الحقول الاختيارية الجديدة.

### 5. تحديث `useContracts.ts`
تمرير الحقول الجديدة عند الإنشاء والتحديث.

### 6. تحديث Edge Function (`zatca-xml-generator/index.ts`)
عند جلب بيانات `payment_invoices`، استرجاع حقول المستأجر من العقد:
```typescript
// خط 365-371 الحالي: يجلب tenant_name فقط
// التحديث: جلب كل حقول المستأجر
.select("tenant_name, tenant_id_type, tenant_id_number, tenant_street, tenant_building, tenant_district, tenant_city, tenant_postal_code")
// ثم تعيينها:
inv.buyer_id_type = contract.tenant_id_type;
inv.buyer_id = contract.tenant_id_number;
inv.buyer_street = contract.tenant_street;
// ...
```

### 7. تحديث الثوابت (`constants/index.ts`)
```typescript
export const TENANT_ID_TYPES = [
  { value: 'NAT', label: 'هوية وطنية' },
  { value: 'CRN', label: 'سجل تجاري' },
  { value: 'IQA', label: 'إقامة' },
  { value: 'PAS', label: 'جواز سفر' },
  { value: 'TIN', label: 'رقم ضريبي' },
] as const;
```

## ملخص الملفات المتأثرة
| الملف | التغيير |
|---|---|
| Migration SQL | إضافة 7 أعمدة لجدول contracts |
| `src/types/database.ts` | إضافة حقول اختيارية لـ Contract |
| `src/constants/index.ts` | إضافة TENANT_ID_TYPES |
| `src/components/contracts/ContractFormDialog.tsx` | إضافة حقول نوع/رقم الهوية + عنوان المستأجر |
| `src/hooks/useContracts.ts` | تمرير الحقول الجديدة |
| `supabase/functions/zatca-xml-generator/index.ts` | جلب بيانات المستأجر من العقد |

