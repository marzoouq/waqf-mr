

# الفحص الشامل للنظام وتحديث الأدوات وفهرس التوثيق

## ملخص الفحص الجنائي

تم إجراء فحص شامل لكافة مكونات النظام: قاعدة البيانات، المشغلات، الوظائف الخلفية، سياسات الأمان، الكود البرمجي، والتوثيق. فيما يلي النتائج والتحديثات المطلوبة.

---

## 1. النتائج الحرجة

### أ. ملف CORS المشترك ناقص
**ملف:** `supabase/functions/_shared/cors.ts`

الملف الحالي لا يتضمن ترويسات Supabase الإضافية المطلوبة:
```
x-supabase-client-platform
x-supabase-client-platform-version
x-supabase-client-runtime
x-supabase-client-runtime-version
```
بينما ملفات `ai-assistant` و `lookup-national-id` تتضمنها بشكل مستقل. يجب توحيد ذلك في الملف المشترك.

### ب. وظيفة `auto-expire-contracts` تستخدم API قديمة
تستخدم `serve` من `deno.land/std@0.168.0` بدلا من `Deno.serve` الحديثة، وتستخدم ملف CORS المشترك الناقص.

### ج. ترقية نموذج المساعد الذكي
تم اعتماد ترقية النموذج من `gemini-3-flash-preview` إلى `gemini-2.5-pro` (من الخطة السابقة المعتمدة).

### د. حماية كلمات المرور المسربة معطلة
نتائج فحص الأمان تشير لعدم تفعيل Leaked Password Protection.

---

## 2. نتائج الفحص الإيجابية (سليمة)

| المكون | الحالة |
|--------|--------|
| المشغلات (Triggers) | 22 مشغل نشط (10 audit + 3 prevent + 9 updated_at) |
| سياسات RLS | مفعلة على جميع الجداول الـ 16 |
| السنوات المالية | سنتان (2024-2025 مقفلة، 2025-2026 نشطة) |
| التسلسل المالي | موحد عبر `useFinancialSummary` و `accountsCalculations.ts` |
| الاختبارات | موجودة للمنطق المالي والمكونات |
| التوثيق الحالي | 5 ملفات شاملة في مجلد docs/ |
| ErrorBoundary | مفعل عالمياً |
| Lazy Loading | مفعل لجميع الصفحات |

---

## 3. الخطة التنفيذية

### المرحلة 1: تحديث الأدوات الخلفية (Edge Functions)

#### 1.1 تحديث ملف CORS المشترك
**ملف:** `supabase/functions/_shared/cors.ts`
- إضافة ترويسات Supabase الكاملة لتوحيد السلوك عبر جميع الوظائف

#### 1.2 تحديث `auto-expire-contracts`
**ملف:** `supabase/functions/auto-expire-contracts/index.ts`
- استبدال `serve()` من deno.land بـ `Deno.serve()` الحديثة
- استيراد CORS من الملف المشترك المحدث بدلا من التعريف المحلي
- استبدال `getClaims` بـ `getUser` (API أكثر استقرارا)

#### 1.3 تحديث `check-contract-expiry`
**ملف:** `supabase/functions/check-contract-expiry/index.ts`
- تحديث CORS headers لاستخدام الملف المشترك
- استبدال `getClaims` بـ `getUser`

#### 1.4 ترقية نموذج المساعد الذكي
**ملف:** `supabase/functions/ai-assistant/index.ts`
- تغيير النموذج من `google/gemini-3-flash-preview` إلى `google/gemini-2.5-pro`

### المرحلة 2: تحديث فهرس التوثيق

#### 2.1 تحديث `docs/INDEX.md`
- تحديث عدد المشغلات إلى 22
- إضافة قسم "حالة الفحص الأخير" مع التاريخ
- إضافة قسم "الصفحات العامة" (سياسة الخصوصية وشروط الاستخدام)
- تحديث قسم المسارات ليشمل جميع المسارات الحالية (27 مسار)

#### 2.2 تحديث `docs/DATABASE.md`
- تحديث عدد المشغلات من المذكور إلى 22 مشغل فعلي
- إضافة تفصيل أنواع المشغلات (audit/prevent/updated_at)

#### 2.3 تحديث `docs/API.md`
- تحديث وصف نموذج المساعد الذكي إلى gemini-2.5-pro
- إضافة ملاحظة حول توحيد CORS headers

#### 2.4 تحديث `README.md`
- إضافة وصف عربي شامل للمشروع بدلا من القالب الافتراضي
- إضافة قائمة الميزات والتقنيات والمسارات

---

## 4. التفاصيل التقنية

### تغييرات ملف CORS المشترك:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### تغيير نموذج AI:
```
السطر القديم: model: "google/gemini-3-flash-preview"
السطر الجديد: model: "google/gemini-2.5-pro"
```

### تحديث auto-expire-contracts:
- حذف سطر import القديم: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- استبدال `serve(async (req) => {` بـ `Deno.serve(async (req) => {`
- استيراد corsHeaders من `../_shared/cors.ts`
- استبدال `getClaims(token)` بـ `getUser()` مع التحقق من الهوية

### تحديث check-contract-expiry:
- استيراد corsHeaders من `../_shared/cors.ts` بدلا من التعريف المحلي
- استبدال `getClaims(token)` بـ `getUser()`

---

## 5. ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `supabase/functions/_shared/cors.ts` | تحديث CORS headers |
| `supabase/functions/auto-expire-contracts/index.ts` | تحديث API + CORS + Auth |
| `supabase/functions/check-contract-expiry/index.ts` | تحديث CORS + Auth |
| `supabase/functions/ai-assistant/index.ts` | ترقية النموذج |
| `docs/INDEX.md` | تحديث شامل |
| `docs/DATABASE.md` | تحديث المشغلات |
| `docs/API.md` | تحديث وصف النموذج |
| `README.md` | إعادة كتابة بالعربية |

