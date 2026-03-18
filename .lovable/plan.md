

## خطة التنفيذ — بندان

### تحليلك صحيح 100%

تم التأكد من:
1. **Migration موجودة** في `20260318102000_fix_safe_views_remove_security_invoker.sql` — لكنها قد لا تكون مُنفَّذة على قاعدة البيانات الحية (يحتاج تأكيد عبر استعلام حي)
2. **أخطاء Build نشطة** — 40+ خطأ TypeScript في `ai-assistant/index.ts` بسبب `ReturnType<typeof createClient>` → `never`
3. **`generate-invoice-pdf/index.ts`** سطر 276 — نفس النمط بالضبط، لكنه لا يظهر في أخطاء البناء الحالية (ربما لأن Deno يتساهل مع `fetchWaqfSettings` التي تستخدم `row.key` و `row.value` فقط)

---

### البند 1: إصلاح أخطاء Build في `ai-assistant/index.ts`

**الملف:** `supabase/functions/ai-assistant/index.ts`

**التغيير:**

```text
السطر 1 (الاستيراد):
  قبل: import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  بعد: import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

السطر 202 (توقيع الدالة):
  قبل: client: ReturnType<typeof createClient>,
  بعد: client: SupabaseClient,
```

هذا يحل جميع أخطاء `never` لأن `SupabaseClient` بدون generic يُعامل الجداول كـ `any` ضمنياً، مع الإبقاء على سلامة أنواع الأساليب (`.from()`, `.select()`, `.eq()`).

### البند 2: إصلاح وقائي في `generate-invoice-pdf/index.ts`

**الملف:** `supabase/functions/generate-invoice-pdf/index.ts`

**التغيير:**

```text
السطر 2 (الاستيراد):
  قبل: import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  بعد: import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

السطر 276 (توقيع الدالة):
  قبل: async function fetchWaqfSettings(adminClient: ReturnType<typeof createClient>): Promise<WaqfSettings> {
  بعد: async function fetchWaqfSettings(adminClient: SupabaseClient): Promise<WaqfSettings> {
```

---

### ملاحظة بشأن Migration

الهجرة `20260318102000_fix_safe_views_remove_security_invoker.sql` موجودة في الريبو. إن لم تكن مُنفَّذة على قاعدة البيانات الحية، سأعيد تنفيذها عبر أداة الهجرة لضمان إزالة `security_invoker` فعلياً.

---

### ملخص التغييرات

| الملف | التغيير | الأثر |
|---|---|---|
| `ai-assistant/index.ts` سطر 1 | إضافة `SupabaseClient` للاستيراد | تمكين النوع الصحيح |
| `ai-assistant/index.ts` سطر 202 | `SupabaseClient` بدل `ReturnType<typeof createClient>` | حل 40+ خطأ build |
| `generate-invoice-pdf/index.ts` سطر 2 | إضافة `SupabaseClient` للاستيراد | إصلاح وقائي |
| `generate-invoice-pdf/index.ts` سطر 276 | `SupabaseClient` بدل `ReturnType<typeof createClient>` | منع أخطاء مستقبلية |

