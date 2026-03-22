

# خطة الاختبار الشامل وفحص الأداء

---

## الجزء الأول: حالة الاختبارات الحالية

### اختبارات الواجهة (Frontend Tests)
المشروع يحتوي على **~35 ملف اختبار** موزعة بين:
- `src/hooks/` — 28 ملف test لكل hook تقريباً
- `src/test/` — 13 ملف اختبار (أمان، تكامل مالي، RLS)
- بنية Vitest + jsdom + React Testing Library مكتملة
- تغطية مطلوبة: 60% (statements, branches, functions, lines)

### اختبارات Edge Functions
**لا توجد أي اختبارات** لـ 12 edge function (guard-signup, ai-assistant, zatca-api, إلخ). لا يوجد أي ملف `index.test.ts` داخل `supabase/functions/`.

### اختبار المتصفح
لم يُطلب سابقاً — المستخدم يطلبه الآن.

---

## الجزء الثاني: خطة التنفيذ

### المرحلة 1: تشغيل اختبارات الواجهة الموجودة
- تشغيل `vitest run` للتحقق من أن جميع الاختبارات الـ 35+ تمر بنجاح
- مراجعة أي اختبارات فاشلة وإصلاحها
- التحقق من نسبة التغطية مقابل الحد الأدنى 60%

### المرحلة 2: اختبار المتصفح للتدفقات الرئيسية
بما أن المستخدم حالياً على صفحة `/beneficiary/disclosure`، سأختبر:

1. **تدفق المستفيد**: التنقل بين صفحات المستفيد (لوحة التحكم → الإفصاح → حصتي → العقارات → العقود)
2. **تبديل السنة المالية**: التحقق من ظهور البطاقات عند التبديل بين السنة النشطة والمغلقة
3. **التحقق من بطاقات المبالغ**: هل تعرض قيم حقيقية وليس أصفار

### المرحلة 3: فحص الأداء

#### A. استدعاءات قاعدة البيانات غير الضرورية
**الحالة الحالية — جيدة مع ملاحظات:**
- `staleTime` مضبوط على 60s لمعظم الاستعلامات (جيد)
- `refetchOnWindowFocus: false` مضبوط عالمياً (ممتاز)
- `gcTime: 30min` عالمياً (مناسب)

**⚠️ ملاحظة:** `useRawFinancialData` يُطلق **5 استعلامات متوازية** في كل صفحة مالية (income, expenses, accounts, beneficiaries, settings). هذا مقبول لأنها متوازية ومخزنة مؤقتاً، لكن يمكن تحسينه بدمج بعضها في RPC واحد.

#### B. إعادة الرسم غير الضرورية (Re-renders)
- `FiscalYearContext` يستخدم `useMemo` للقيم المشتقة (جيد)
- `AuthContext` يستخدم `useRef` لـ roleRef (يمنع re-render غير ضروري)
- `DeferredRender` يؤخر تحميل AiAssistant (ممتاز)
- **⚠️ محتمل:** `useFinancialSummary` يُعيد object جديد كل render مما قد يسبب re-render في المكونات المستهلكة

#### C. حجم الحزمة (Bundle Size)
- **ممتاز:** تقسيم يدوي ذكي في `manualChunks` — 16 chunk منفصل (react, router, radix, supabase, charts, pdf, icons...)
- **ممتاز:** جميع الصفحات lazy loaded عبر `lazyWithRetry`
- **ممتاز:** PWA مع runtime caching مناسب (NetworkOnly للبيانات الحساسة، CacheFirst للخطوط)
- **⚠️ محتمل:** `vendor-icons` (lucide-react) قد يكون كبيراً — يمكن استخدام tree-shaking أفضل

#### D. أصول كبيرة
- لا توجد صور كبيرة في الكود (الصور في Storage)
- الخطوط العربية (Amiri) في Storage — مُحمّلة عند الطلب فقط في PDF generators

---

## الجزء الثالث: ملخص التوصيات

| البند | الحالة | الإجراء |
|-------|--------|---------|
| Frontend tests | ✅ موجودة (35+) | تشغيل وإصلاح الفاشل |
| Edge function tests | ❌ غير موجودة | يمكن إضافتها لاحقاً (guard-signup, lookup-national-id كأولوية) |
| Browser testing | 🔄 مطلوب | اختبار التدفقات الرئيسية |
| DB query efficiency | ✅ جيد | `staleTime` + `refetchOnWindowFocus:false` مطبّقان |
| Re-renders | ✅ جيد | useMemo + useRef مطبّقان |
| Bundle splitting | ✅ ممتاز | 16 chunk + lazy loading |
| PWA caching | ✅ ممتاز | NetworkOnly للبيانات الحساسة |
| `useRawFinancialData` | ⚠️ تحسين ممكن | دمج 5 queries في RPC واحد (اختياري) |

---

## خطوات التنفيذ

1. **تشغيل اختبارات الواجهة** وعرض النتائج
2. **اختبار المتصفح** للتدفقات الرئيسية (يتطلب تسجيل دخول في Preview أولاً)
3. **قياس الأداء** عبر browser performance profile
4. **إصلاح أي مشكلات** مكتشفة

