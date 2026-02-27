

# خطة إصلاح المشكلتين المتبقيتين

## التحقق الجنائي - النتائج

تم فحص الملفات الثلاثة مباشرة من الكود الفعلي وتأكيد ما يلي:

- **الإصلاح 1 (UserManagementPage):** مُنفَّذ بالكامل -- لا يحتاج أي تعديل
- **الإصلاح 2 (useCrudFactory + staleTime):** لم يُنفَّذ -- المشكلة قائمة
- **الإصلاح 3 (ALLOWED_ORIGINS مكررة):** لم يُنفَّذ -- التكرار قائم

---

## الإصلاح A: إضافة `staleTime` إلى `createCrudFactory`

**الملف:** `src/hooks/useCrudFactory.ts`

**المشكلة:** الـ factory لا يدعم `staleTime` -- كل الـ hooks المبنية عليه (8 جداول) تُعيد جلب البيانات عند كل window focus بدون داعٍ.

**التغييرات:**
1. إضافة `staleTime?: number` إلى `CrudFactoryConfig` interface (سطر 37)
2. استخراج `staleTime` مع قيمة افتراضية `60_000` في الـ factory (سطر 57)
3. تمرير `staleTime` إلى `useQuery` في `useList` (سطر 62)

**التأثير:** يُصلح تلقائياً 8 hooks دون تعديل أي ملف آخر:
- useAccounts, useContracts, useProperties, useBeneficiaries
- useIncome, useExpenses, useInvoices, useAllUnits

---

## الإصلاح B: توحيد `ALLOWED_ORIGINS` بين `cors.ts` و `webauthn/index.ts`

### الملف 1: `supabase/functions/_shared/cors.ts`

**التغيير:** تصدير القائمة والـ regex patterns كـ named exports

```text
export const ALLOWED_ORIGINS = [...]

export const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
];
```

تعديل `getAllowedOrigin` لاستخدام `ALLOWED_ORIGIN_PATTERNS` بدل regex مكرر.

### الملف 2: `supabase/functions/webauthn/index.ts`

**التغيير:** استيراد من `_shared/cors.ts` بدل تعريف محلي

```text
import { getCorsHeaders, ALLOWED_ORIGINS, ALLOWED_ORIGIN_PATTERNS } from "../_shared/cors.ts";
// حذف السطور 15-19 (التعريف المحلي المكرر)
// تعديل getRpInfo لاستخدام ALLOWED_ORIGIN_PATTERNS
```

---

## ترتيب التنفيذ

| # | الإصلاح | الملف | التعقيد |
|---|---------|-------|---------|
| 1 | staleTime في factory | `useCrudFactory.ts` | بسيط (+3 سطور) |
| 2 | تصدير origins | `_shared/cors.ts` | بسيط (+6 سطور) |
| 3 | استيراد في webauthn | `webauthn/index.ts` | بسيط (حذف + import) |

## الملفات المتأثرة
1. `src/hooks/useCrudFactory.ts`
2. `supabase/functions/_shared/cors.ts`
3. `supabase/functions/webauthn/index.ts`

