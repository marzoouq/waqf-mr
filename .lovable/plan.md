

# فحص جنائي شامل — التطبيق الكامل

---

## 1. الأمان (Security)

### ✅ نقاط قوة مؤكدة

| البند | الحالة |
|-------|--------|
| مصادقة Edge Functions بـ `getUser()` | ✅ جميع الـ 8 وظائف تستخدمه (لا `getSession` فقط) |
| RLS على جميع الجداول الأساسية (18 جدول) | ✅ مطبق |
| سياسات `user_roles` التقييدية | ✅ INSERT/UPDATE/DELETE مقصورة على admin |
| حماية PII عبر Vault + REVOKE EXECUTE | ✅ مطبق |
| تقنيع PII في العروض الآمنة | ✅ `CASE WHEN has_role()` |
| حماية سجل التدقيق من التعديل | ✅ INSERT/UPDATE/DELETE = false |
| Rate limiting على lookup-national-id | ✅ مطبق (3 req/5 min) |
| لا `select("*")` في الواجهة الأمامية | ✅ صفر استخدامات في `src/` |
| Logger يمنع تسريب stack trace في الإنتاج | ✅ مطبق في `logger.ts` |
| `dangerouslySetInnerHTML` آمن | ✅ يُستخدم فقط مع `JSON.stringify` (JSON-LD) و CSS ثابت |

### ⚠️ ملاحظات أمنية (غير حرجة)

| # | الملاحظة | المستوى | التوصية |
|---|---------|---------|---------|
| 1 | **Security Definer Views** (`beneficiaries_safe`, `contracts_safe`) | info | مقصود بالتصميم ومحمي بـ 4 طبقات. **لا تغيير مطلوب** — تم تجاهله في الماسح مع توثيق |
| 2 | **`select("*")` في Edge Functions** (7 مواضع) | منخفض | يجلب أعمدة غير مطلوبة. **تحسين مستقبلي**: تحديد الأعمدة المطلوبة فقط لتقليل حجم البيانات المنقولة |
| 3 | **`getSession()` في 5 ملفات بالواجهة** | منخفض | تُستخدم **بعد** `getUser()` لجلب `access_token` فقط — **آمن** لكن يمكن توحيدها |

---

## 2. الثغرات (Vulnerabilities)

### ✅ لا توجد ثغرات حرجة أو عالية

| الثغرة المفحوصة | النتيجة |
|----------------|---------|
| تصعيد الصلاحيات (Privilege Escalation) | ✅ آمن — RESTRICTIVE policies |
| تعداد المستخدمين (User Enumeration) | ✅ محمي — استجابة موحدة + rate limit |
| XSS عبر `dangerouslySetInnerHTML` | ✅ آمن — لا يُستخدم مع مدخلات مستخدم |
| تسريب PII في Console | ✅ محمي — Logger يكتم في الإنتاج |
| مفتاح التشفير مكشوف في DB dump | ✅ محمي — تم نقله لـ Vault |
| تبعيات ضعيفة (`vite-plugin-pwa`) | ✅ محمي — `overrides` في package.json |
| وصول مجهول (`anon`) | ✅ محمي — `REVOKE ALL` شامل |

---

## 3. المشاكل المكتشفة

### 🔴 مشكلة 1: `ProtectedRoute` يعلق عند `role=null`

**الملف:** `src/components/ProtectedRoute.tsx` سطر 78-101

**المشكلة:** إذا فشل جلب الدور من `user_roles` (مثلاً شبكة بطيئة)، الصفحة تعلق على "جاري التحقق من الصلاحيات..." مع spinner لمدة 3 ثوانٍ ثم يظهر زر خروج. **لا يوجد timeout نهائي** — المستخدم يبقى عالقاً إذا لم يضغط الزر.

**التوصية:** إضافة timeout تلقائي (10 ثوانٍ) يعيد التوجيه لصفحة خطأ واضحة بدلاً من الانتظار اللانهائي.

### 🟡 مشكلة 2: `AuthContext.fetchRole` يسجل `user.id` في Console

**الملف:** `src/contexts/AuthContext.tsx` سطر 95

```typescript
logger.info('[Auth] fetchRole started for user:', user.id);
```

في بيئة التطوير فقط (محمي بـ `isDev` في logger)، لكن يتعارض مع مبدأ عدم تسجيل PII المذكور في الذاكرة.

**التوصية:** استبدال `user.id` بـ `'***'` حتى في التطوير.

### 🟡 مشكلة 3: `FiscalYearContext` fallback بدون إشعار

**من الكونسول السابق:** `No active fiscal year found, falling back to first available`

**المشكلة:** إذا لم تكن هناك سنة مالية نشطة، النظام يعود لأول سنة متاحة بصمت. هذا قد يعرض بيانات سنة قديمة دون علم المستخدم.

**التوصية:** عرض toast تحذيري للناظر عند عدم وجود سنة نشطة.

---

## 4. التحسينات المطلوبة

### أداء

| # | التحسين | الأولوية | التفاصيل |
|---|---------|---------|---------|
| 1 | **تقليل `select("*")` في Edge Functions** | متوسطة | 7 مواضع تجلب كل الأعمدة. تحديد الأعمدة يقلل حجم البيانات ~30-50% |
| 2 | **توحيد مصدر ثوابت الأقسام** | متوسطة | 3 ملفات تعرّف قوائم أقسام مختلفة (`SectionsTab`, `BeneficiaryTab`, `RolePermissionsTab`). إنشاء `constants/sections.ts` مشترك |
| 3 | **`DeferredRender` delay=3000ms للـ AI Assistant** | منخفضة | 3 ثوانٍ قبل تحميل مساعد AI. مقبول لكن يمكن تقليله لـ 1500ms مع `requestIdleCallback` |

### هيكلة الكود

| # | التحسين | الأولوية |
|---|---------|---------|
| 4 | **`App.tsx` يحتوي 75 مسار** | منخفضة | تجميع المسارات في ملفات route config منفصلة (adminRoutes, beneficiaryRoutes) |
| 5 | **`verify_jwt = false` لكل Edge Functions** | info | مقصود — JWT يُتحقق يدوياً عبر `getUser()`. موثق ومتسق |

---

## 5. الملاحظات العامة

### ✅ نقاط تميز في التطبيق

1. **معمارية أمان ناضجة**: 4 أدوار، RLS شامل، Vault، rate limiting، audit log محمي
2. **فصل واجب مصادقة نظيف**: `AuthContext` → `useAuth` hook مفصول لتحسين HMR
3. **حماية ضد race conditions**: `roleFetchIdRef`, `isMounted`, duplicate event detection
4. **Lazy loading شامل**: كل الصفحات محملة كسلاً مع retry تلقائي (`lazyWithRetry`)
5. **PWA cache guard**: يمنع عرض نسخ قديمة بعد التحديث
6. **Logger آمن للإنتاج**: يكتم التفاصيل ويسجل فقط `[App Error]`
7. **Error boundaries متعددة الطبقات**: 4 مستويات حماية في `App.tsx`
8. **الاختبارات**: ملفات test موجودة لـ Auth, ErrorBoundary, EdgeFunctions, WebAuthn

### ⚠️ ملاحظات ثانوية

| # | الملاحظة |
|---|---------|
| 1 | `console.warn` مباشر في `FiscalYearContext.tsx` سطر 114 — يجب استبداله بـ `logger.warn` |
| 2 | `test/setup.ts` يعدّل `console.warn` عالمياً — مقبول في بيئة الاختبار فقط |
| 3 | بعض ملفات Edge Functions كبيرة (zatca-api ~700+ سطر) — قد تستفيد من تقسيم |

---

## 6. الخلاصة التنفيذية

| الفئة | عدد البنود | حرج | عالي | متوسط | منخفض |
|-------|-----------|------|------|-------|-------|
| ثغرات أمنية | 0 | 0 | 0 | 0 | 0 |
| مشاكل وظيفية | 3 | 0 | 0 | 2 | 1 |
| تحسينات | 5 | 0 | 0 | 2 | 3 |
| ملاحظات | 3 | 0 | 0 | 0 | 3 |

**التطبيق في حالة أمنية ووظيفية جيدة جداً.** لا توجد ثغرات حرجة أو عالية. المشاكل المكتشفة ثانوية ولا تؤثر على سلامة البيانات أو أمان المستخدمين.

### إصلاحات مقترحة (اختيارية):
1. إضافة timeout نهائي لـ `ProtectedRoute` عند `role=null`
2. إزالة `user.id` من سجلات التطوير في `AuthContext`
3. استبدال `console.warn` بـ `logger.warn` في `FiscalYearContext`
4. توحيد ثوابت الأقسام في ملف مشترك

