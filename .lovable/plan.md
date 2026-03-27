

# خطة إصلاح أخطاء البناء وتحديث التعليقات

## الملخص

أخطاء البناء الحالية نوعان: (1) حزم npm مفقودة في بيئة Deno بسبب عدم وجود `deno.json`، (2) أخطاء TypeScript في `zatca-shared.ts` و`zatca-report/index.ts`. بالإضافة لتعليقات قديمة تحتاج تحديث.

---

## الأخطاء بالتفصيل

### الفئة 1 — حزم npm مفقودة (6 أخطاء)

| الوظيفة | الحزمة | الاستيراد |
|---|---|---|
| `generate-invoice-pdf` | `@pdf-lib/fontkit@1.1.1` | `npm:@pdf-lib/fontkit@1.1.1` |
| `webauthn` | `@simplewebauthn/server@11` | `npm:@simplewebauthn/server@11` |
| `zatca-onboard` | `@noble/curves@1.4.0` | `npm:@noble/curves@1.4.0/p256` |
| `zatca-renew` | `@noble/curves@1.4.0` | `npm:@noble/curves@1.4.0/p256` |
| `zatca-signer` | `@noble/hashes@1.4.0` | `npm:@noble/hashes@1.4.0/sha256` |
| `zatca-xml-generator` | `zod@3` | `npm:zod@3` |

**السبب**: بيئة Deno تحتاج `"nodeModulesDir": "auto"` في `deno.json` لتثبيت حزم `npm:` تلقائياً.

**الحل**: إنشاء `supabase/functions/deno.json`:
```json
{
  "nodeModulesDir": "auto",
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2",
    "zod": "npm:zod@3"
  }
}
```

### الفئة 2 — أخطاء TypeScript (9 أخطاء)

#### 2A. `zatca-shared.ts` سطر 135 — `sha256Async`
```
Uint8Array<ArrayBufferLike> not assignable to BufferSource
```
**السبب**: `crypto.subtle.digest` يُرجع `ArrayBuffer` لكن Deno الجديد يعتبره `ArrayBufferLike`.
**الحل**: تحويل صريح:
```ts
return new Uint8Array(await crypto.subtle.digest("SHA-256", data) as ArrayBuffer);
```

#### 2B. `zatca-shared.ts` سطر 177 — `resolveZatcaUrl`
```
Property 'value' does not exist on type 'never'
```
**السبب**: `createClient()` بدون Database generic يجعل Deno يستنتج النوع كـ `never`.
**الحل**: إضافة type assertion:
```ts
const { data } = await adminClient.from("app_settings").select("value").eq("key", "zatca_platform").single() as { data: { value: string } | null };
```

#### 2C. `zatca-shared.ts` سطر 194 — `logZatcaOperation`
```
Argument of type '...' not assignable to parameter of type 'never'
```
**السبب**: نفس مشكلة عدم وجود generic — `from("zatca_operation_log").insert(...)` يستنتج `never`.
**الحل**: إضافة `as any` مع تعليق:
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin client بدون Database generic
await (admin.from("zatca_operation_log") as any).insert({...});
```

#### 2D. `zatca-report/index.ts` سطر 14 — `Deno.serve`
```
Argument not assignable — handler returns Promise<Response | undefined>
```
**السبب**: المسارات لا تُغطي كل الحالات — `Deno.serve` يحتاج `Response` مضمون.
**الحل**: السطر 149 يُرجع Response لكل حالة غير معروفة، والمشكلة أن TypeScript لا يستطيع استنتاج ذلك. الحل: إضافة return type صريح أو تحويل:
```ts
Deno.serve(async (req): Promise<Response> => {
```

#### 2E. `zatca-report/index.ts` أسطر 25, 39, 62, 66 — `SupabaseClient` mismatch
```
SupabaseClient<any, "public"> not assignable to SupabaseClient<unknown, ...>
```
**السبب**: `admin` من `authenticateAdmin` (في `zatca-shared.ts`) مُنشأ بـ `createClient()` بدون generic، والدوال المشتركة تحتاج نوعاً متوافقاً.
**الحل**: تغيير نوع الإرجاع في `authenticateAdmin` ليستخدم `any`:
```ts
// في zatca-shared.ts سطر 226
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY) as any;
```
أو الأفضل: تحديد نوع `resolveZatcaUrl` و`logZatcaOperation` ليقبلا `any`:
```ts
export async function resolveZatcaUrl(adminClient: any): Promise<string> {
export async function logZatcaOperation(admin: any, opts: {...}) {
```

### الفئة 3 — تعليقات قديمة

| الملف | السطر | الحالي | المطلوب |
|---|---|---|---|
| `checks.ts` | 2 | `31 فحصاً` | `33 فحصاً` |
| `checks.ts` | 309 | `(5)` | `(7)` |

---

## خطوات التنفيذ

1. **إنشاء `supabase/functions/deno.json`** — يحل الفئة 1 كاملة (6 أخطاء)
2. **إصلاح `zatca-shared.ts`** — 3 إصلاحات TS:
   - سطر 135: `as ArrayBuffer`
   - سطر 174: نوع `adminClient` → `any`
   - سطر 182: نوع `admin` → `any`
3. **إصلاح `zatca-report/index.ts`** — سطر 14: إضافة `: Promise<Response>` (يحل 5 أخطاء)
4. **تحديث تعليقات `checks.ts`** — سطر 2 وسطر 309

---

## تفاصيل تقنية

- إجمالي الأخطاء: **15 خطأ بناء**
- الملفات المتأثرة: **3 ملفات** (`deno.json` جديد + `zatca-shared.ts` + `zatca-report/index.ts`) + تعليقات `checks.ts`
- **لا تأثير وظيفي** — كل الإصلاحات هي type assertions وتكوين بيئة فقط
- **لا تعديل** على الملفات المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`)

