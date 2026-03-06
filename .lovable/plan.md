

# خطة الجولة العاشرة — تحليل التقرير الجنائي الشامل

## نتائج التحقق من الكود الفعلي

| المشكلة المُبلَّغة | الحقيقة بعد التحقق | القرار |
|---|---|---|
| `.env` مكشوف في الريبو | **ملغاة** — ملف `.env` يُنشئه Lovable Cloud تلقائياً ويحتوي على `VITE_SUPABASE_URL` و `VITE_SUPABASE_PUBLISHABLE_KEY` فقط. هذه مفاتيح **عامة (publishable)** بطبيعتها — مصممة للعمل في المتصفح. الحماية تأتي من RLS وليس من إخفاء المفتاح. لا يمكن تعديل `.env` أو `.gitignore` في مشاريع Lovable Cloud | ❌ لا تغيير |
| `verify_jwt = false` في config.toml | **ملغاة** — تحققت من الكود: `admin-manage-users` يتحقق يدوياً عبر `getUser()` + `has_role('admin')` ✅. `ai-assistant` يتحقق عبر `getUser()` + rate limiting ✅. `generate-invoice-pdf` يتحقق عبر `Authorization` header ✅. هذا هو النمط الصحيح الموثق لـ Lovable Cloud | ❌ لا تغيير |
| `package.json` — test libs في dependencies | **حقيقية لكن غير مؤثرة** — Vite يعمل tree-shaking تلقائياً، فـ `@testing-library` لن تدخل bundle الإنتاج. تحسين تجميلي فقط | 🟡 تحسين اختياري |
| `contractAllocation.ts` — indentation خاطئ | **حقيقية** — المسافات البادئة غير متسقة (سطور 47-58). **لكن المنطق صحيح** — الكود يعمل كما هو مطلوب. نوع `annual` موجود في `getPaymentCount` (سطر 136) وتاريخ الاستحقاق يسقط في `else` بحساب التوزيع المتساوي وهو صحيح لدفعة واحدة | 🟡 إصلاح indentation فقط |
| `GlobalSearch.tsx` — N+1 + SQL injection | **مبالغ فيه** — الاستعلامات الأربعة مستقلة ويمكن تشغيلها بالتوازي (ليست N+1 تقنياً). SQL injection عبر `ilike` **ليس injection حقيقي** — `ilike` في PostgREST لا ينفذ SQL خام، الأحرف `%` و `_` تُعامل كـ wildcards في النمط فقط، لا تهديد أمني. لكن التوازي والـ escape تحسينات مفيدة | 🟡 تحسين |
| `AuthContext.tsx` — race condition | **ملغاة جزئياً** — timeout موجود فعلاً (سطر 110: `setTimeout 3000ms`) ✅. `lastUserIdRef` يُنظَّف عند `SIGNED_OUT` (سطر 68) ✅. `setRoleWithRef` لا تحتاج `useCallback` لأنها تُستخدم داخل `useEffect` فقط | ❌ لا تغيير |
| `vite.config.ts` — skipWaiting + clientsClaim | **مقبول** — هذا النمط شائع ومقبول في PWAs. المشكلة النظرية نادرة جداً في التطبيق الفعلي | ❌ لا تغيير |
| `use-toast.ts` — module-level state | **ملغاة** — هذا ملف shadcn/ui قياسي، لا يُعدَّل. المشروع يستخدم `sonner` كأداة toast رئيسية فعلاً | ❌ لا تغيير |
| `PrintHeader.tsx` — hardcoded name | **حقيقية** — fallback يحتوي اسم الوقف كنص ثابت. يمكن استبداله بنص عام | 🟡 تحسين بسيط |
| `FiscalYearContext.tsx` — magic string | **حقيقية لكن منخفضة الأولوية** — `'__none__'` مُستخدم في مكانين فقط ومعرّف بوضوح | 🟢 اختياري |

---

## الإصلاحات المطلوبة فعلاً (3 تعديلات)

### 1. `contractAllocation.ts` — إصلاح المسافات البادئة
المنطق صحيح لكن الـ indentation مكسور (سطور 47-58). إصلاح تجميلي فقط بدون تغيير المنطق.

### 2. `PrintHeader.tsx` — إزالة الاسم الثابت
استبدال `'وقف مرزوق بن علي الثبيتي'` بنص عام مثل `'الوقف'` كـ fallback.

### 3. `package.json` — نقل مكتبات الاختبار لـ devDependencies
نقل `@testing-library/dom`، `@testing-library/user-event`، و`@vitest/coverage-v8` من `dependencies` إلى `devDependencies`.

---

## ملخص

| الملف | التغيير |
|---|---|
| `contractAllocation.ts` | إصلاح indentation (سطور 47-58) |
| `PrintHeader.tsx` | fallback عام بدل اسم ثابت |
| `package.json` | نقل 3 مكتبات test لـ devDependencies |

3 تعديلات تجميلية. لا تغييرات أمنية مطلوبة — جميع المشاكل الأمنية المُبلَّغة إما مُصلحة سابقاً أو غير حقيقية.

