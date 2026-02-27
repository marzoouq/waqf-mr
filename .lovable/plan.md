

# خطة إصلاح البنود الأربعة المتبقية

تم التحقق من كل بند مقابل الكود الفعلي. جميعها مؤكدة.

---

## البنود والإصلاحات

### 1. `src/hooks/useContracts.ts` — اضافة `staleTime` لـ `useContractsByFiscalYear`

**المشكلة:** الهوك المنفصل `useContractsByFiscalYear` (سطر 24-41) لا يحتوي `staleTime`، بينما الـ factory حصل عليه. كل تركيز على النافذة يعيد جلب العقود.

**الإصلاح:** اضافة `staleTime: 60_000` في `useQuery`.

---

### 2. `execute_distribution` — حماية من التوزيع المزدوج (Idempotency Guard)

**المشكلة:** استدعاء `execute_distribution` مرتين لنفس `account_id` و `fiscal_year_id` ينشئ توزيعات مكررة بدون أي فحص.

**الإصلاح:** اضافة فحص في بداية الدالة:
```text
IF EXISTS (SELECT 1 FROM distributions WHERE account_id = p_account_id
  AND (p_fiscal_year_id IS NULL OR fiscal_year_id = p_fiscal_year_id))
THEN RAISE EXCEPTION 'تم توزيع حصص هذا الحساب مسبقاً';
END IF;
```

---

### 3. `execute_distribution` — التحقق من `p_total_distributed` داخل الخادم

**المشكلة:** `p_total_distributed` يأتي من العميل مباشرة ويُحفظ في `accounts.distributions_amount` بدون مقارنة بالمجموع الفعلي المحسوب.

**الإصلاح:** حساب المجموع الفعلي داخل الدالة واستخدامه بدلاً من القيمة المُمررة:
```text
-- بعد انتهاء الحلقة، نحسب المجموع الفعلي
v_actual_total := (SELECT COALESCE(SUM(amount), 0) FROM distributions
  WHERE account_id = p_account_id AND fiscal_year_id = p_fiscal_year_id);

UPDATE accounts SET distributions_amount = v_actual_total WHERE id = p_account_id;
```
مع التحقق من عدم وجود فرق كبير بين القيمتين كاشعار.

---

### 4. `src/contexts/AuthContext.tsx` — تعميم رسالة خطأ `signUp`

**المشكلة:** سطر 190: `error?.message` قد يكشف تفاصيل داخلية من Supabase (مثل اسماء الجداول أو رسائل PostgreSQL).

**الإصلاح:** استخدام `getSafeErrorMessage` الموجود بالفعل في المشروع:
```text
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
// ...
return { error: new Error(data?.error || getSafeErrorMessage(error)) };
```

---

## الملفات المتأثرة

1. `src/hooks/useContracts.ts` — سطر واحد: اضافة `staleTime`
2. `supabase/migrations/` — migration جديد لتحديث `execute_distribution` (idempotency + server-side total)
3. `src/contexts/AuthContext.tsx` — سطر واحد: استخدام `getSafeErrorMessage`

## ترتيب التنفيذ

1. إصلاح `useContracts.ts` و `AuthContext.tsx` (تغييرات كود بسيطة)
2. انشاء migration لتحديث `execute_distribution` (يتطلب موافقة)

