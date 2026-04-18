
## خطة P3 — تحسينات اختيارية (تحديث README + توثيق lib vs utils)

### نطاق العمل (3 ملفات README + 1 ذاكرة)

#### 1) `src/hooks/README.md` — تحديث ليعكس v7
**الحالة**: موجود ويصف الهيكل العام (auth/data/financial/page/ui).
**الإضافات المقترحة**:
- إضافة قسم "v7 Layered Architecture" يربط صراحة بـ `mem://technical/architecture/core-modularization-standard-v7`
- توضيح اتجاه التبعيات (data → financial → page) مع منع التبعية العكسية
- إضافة قاعدة "page hooks لا تستورد supabase مباشرة"
- إضافة مرجع إلى `useAuthCleanup` كنموذج لاستخراج side-effects من Context

#### 2) `src/lib/README.md` — تأكيد قاعدة lib vs utils
**الحالة**: موجود ويحتوي جدول مقارنة جيد.
**الإضافات المقترحة**:
- قسم "متى أضع الكود هنا؟" — قائمة قرار (decision tree):
  - يحتفظ بحالة؟ → `lib/`
  - يستدعي Supabase/Storage/Auth؟ → `lib/`
  - يحتاج singleton أو initialization؟ → `lib/`
  - دالة نقية مدخل/مخرج؟ → `utils/`
- قسم "lib/services/ vs lib/realtime/ vs lib/auth/" — توضيح متى يُستخدم كل منها
- إضافة `notify.ts` كنمط الإشعارات الموحّد (بدلاً من toast مباشر في utils)

#### 3) `src/utils/README.md` — تأكيد ممنوعات
**الحالة**: موجود وواضح مع جدول مقارنة وممنوعات.
**الإضافات المقترحة**:
- توسيع قسم "ممنوعات" بمثال كود قبل/بعد لـ "إرجاع نتيجة بدلاً من toast"
- إضافة قاعدة "barrel exports": متى يُنشأ `index.ts` (مجلد ≥3 ملفات مرتبطة وظيفياً)
- مرجع إلى `utils/auth/index.ts` و `utils/export/index.ts` كأمثلة معتمدة

#### 4) ملف ذاكرة جديد — `mem://technical/architecture/lib-vs-utils-boundary`
**الغرض**: منع الانحدار المعماري المستقبلي بقاعدة قابلة للاستشهاد.

```
---
name: lib-vs-utils-boundary
description: قاعدة فصل lib (stateful infrastructure) عن utils (pure functions) — قرار شجري مع أمثلة
type: preference
---
lib/ = بنية تحتية ذات حالة وآثار جانبية مسموحة (Supabase, Storage, Auth, queryClient, logger, monitoring).
utils/ = دوال نقية بدون حالة وبدون آثار جانبية (format, calc, csv/xlsx builders, pdf generators).

قرار سريع:
- يستورد supabase/auth/storage → lib/
- يستدعي toast → lib/ (أو يُرجع نتيجة من utils/)
- singleton/initialization → lib/
- مدخل ثابت يعطي مخرج ثابت → utils/

ممنوعات utils/:
- import { toast } from 'sonner'
- import { supabase }
- import.meta side effects

نماذج معتمدة: utils/format, utils/distributionCalcPure, lib/queryClient, lib/services/invoiceStorageService.
```

**ثم تحديث `mem://index.md`**: إضافة سطر تحت Memories:
```
- [lib vs utils Boundary](mem://technical/architecture/lib-vs-utils-boundary) — Decision tree to prevent stateful code in utils/ and pure functions in lib/
```

### الملفات المتأثرة
| ملف | عملية |
|-----|--------|
| `src/hooks/README.md` | تحديث |
| `src/lib/README.md` | تحديث |
| `src/utils/README.md` | تحديث |
| `mem://technical/architecture/lib-vs-utils-boundary` | إنشاء |
| `mem://index.md` | تحديث (إضافة سطر واحد) |

### ضمانات السلامة
- ✅ لا تعديل على أي كود إنتاجي (.ts/.tsx)
- ✅ لا تأثير على bundle size أو runtime
- ✅ لا تأثير على الاختبارات
- ✅ التغييرات وثائقية بحتة (markdown فقط)
- ✅ ملف الذاكرة الجديد يستشهد به في المراجعات المستقبلية لمنع الانحدار

### القياس
- README files: ~+30 سطر كل ملف (decision trees + أمثلة)
- ذاكرة جديدة: قاعدة قابلة للاستشهاد عند code review لمنع وضع toast/supabase في utils/
- onboarding: مطوّر جديد يفهم القاعدة في <60 ثانية بدون قراءة مذكرة v7 الكاملة
