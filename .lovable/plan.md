
# تقرير التدقيق الشامل — معمارية المشروع

## الحالة العامة: جيدة جداً مع 6 مجالات تحسين

المعمارية متينة وتتبع فصل المسؤوليات بشكل ممتاز. لا توجد مشكلات حرجة تؤثر على الاستقرار.

---

## النتائج الإيجابية المؤكدة

| المعيار | النتيجة |
|---------|---------|
| صفر استدعاءات Supabase في components/ أو pages/ | ✅ |
| صفر `console.*` في الكود الإنتاجي | ✅ |
| صفر `toast` في utils/ | ✅ |
| صفر `react-router-dom` في utils/ | ✅ |
| صفر `any` في الكود الإنتاجي (عدا shadcn) | ✅ |
| فصل واضح: data hooks → business hooks → page hooks → components | ✅ |

---

## المشكلات المكتشفة (مرتبة بالأولوية)

### 1. 🔴 مكونات UI غير مستخدمة (8 مكونات + 1 حزمة npm)

**مكونات shadcn/ui موجودة لكن لا تُستورد في أي مكان:**

| المكون | الحزمة المرتبطة |
|--------|----------------|
| `context-menu.tsx` | `@radix-ui/react-context-menu` |
| `hover-card.tsx` | `@radix-ui/react-hover-card` |
| `menubar.tsx` | `@radix-ui/react-menubar` |
| `navigation-menu.tsx` | `@radix-ui/react-navigation-menu` |
| `aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |
| `slider.tsx` | `@radix-ui/react-slider` |
| `toggle.tsx` + `toggle-group.tsx` | `@radix-ui/react-toggle` + `react-toggle-group` |
| `carousel.tsx` | `embla-carousel-react` |
| `resizable.tsx` | `react-resizable-panels` |
| `input-otp.tsx` | `input-otp` |
| `breadcrumb.tsx` | — (لا حزمة إضافية) |

**حزمة npm غير مستخدمة:**
- `@radix-ui/react-toast` — المشروع يستخدم `sonner` حصرياً ولا يوجد ملف `toast.tsx`

**الأثر:** ~200KB+ من الحزم غير المستخدمة في `node_modules` (لا تؤثر على حجم البناء بفضل tree-shaking، لكنها تبطئ `npm install` وتضيف ضوضاء).

**الإجراء:** حذف الملفات + إزالة الحزم من `package.json`.

---

### 2. 🟡 صفحتان تستوردان `computePropertyFinancials` مباشرة

- `src/pages/dashboard/PropertiesPage.tsx` (سطر 1)
- `src/pages/beneficiary/PropertiesViewPage.tsx` (سطر 4)

كلتا الصفحتين تستورد دالة حسابية مباشرة من `@/hooks/financial/usePropertyFinancials` وتستدعيانها داخل JSX. هذا يخالف نمط "Page Hook يتولى كل المنطق".

**الإجراء:** نقل استدعاءات `computePropertyFinancials` إلى `usePropertiesPage` و `usePropertiesViewData` بحيث تبقى الصفحات تعرض بيانات جاهزة فقط.

---

### 3. 🟡 39 ملف hook يستورد `toast` مباشرة من `sonner`

المشروع لديه `@/lib/notify` كطبقة توحيد للإشعارات مع حماية dedup. لكن 39 ملف hook يستورد `toast` مباشرة من `sonner` متجاوزاً هذه الطبقة.

**ملاحظة:** هذا ليس خطأ وظيفياً — `toast` يعمل بشكل صحيح. لكنه يفوّت حماية dedup ويجعل التغيير المستقبلي (مثلاً استبدال sonner) أصعب.

**الأولوية:** منخفضة-متوسطة. يمكن تحويلها تدريجياً.

---

### 4. 🟡 مجلدات barrel فارغة وظيفياً في `hooks/financial/`

بعد التنظيف السابق، بقيت 6 مجلدات فرعية (`accounts/`, `advances/`, `contracts/`, `distributions/`, `fiscal-years/`, `properties/`) كل منها يحتوي فقط على `index.ts` يعيد تصدير من الملفات الأصلية في المجلد الأب.

**المشكلة:** طبقة indirection غير ضرورية — المستهلكون يستوردون من `@/hooks/financial/<hookName>` مباشرة وليس من المجلدات الفرعية.

**الإجراء:** التحقق من وجود مستهلكين يستوردون من `@/hooks/financial/accounts` (إلخ). إذا لم يوجد، يمكن حذف المجلدات وتبسيط `hooks/financial/index.ts`.

---

### 5. 🟢 اختياري — توحيد مسارات الاستيراد

بعض الملفات تستورد من `@/hooks/financial/usePropertyFinancials` (مسار مباشر) بينما أخرى من `@/hooks/financial` (barrel). التوحيد على نمط واحد يحسن القراءة.

---

### 6. 🟢 اختياري — اختبارات في مجلد خاطئ

ملفات الاختبار في `src/hooks/financial/` (مثل `useAccounts.test.ts`, `useAdvanceRequests.test.ts`) تختبر hooks موجودة في `src/hooks/data/financial/`. الاختبارات يجب أن تكون بجانب الكود المُختبر أو في مجلد `__tests__/` مخصص.

---

## خطة التنفيذ المقترحة

| الخطوة | الأولوية | الملفات | الوصف |
|--------|---------|---------|-------|
| 1 | عالية | ~13 ملف + package.json | حذف مكونات UI غير المستخدمة وحزمها |
| 2 | متوسطة | 4 ملفات | نقل `computePropertyFinancials` إلى page hooks |
| 3 | متوسطة | 7 ملفات | تنظيف barrel files الفارغة في hooks/financial/ |
| 4 | منخفضة | ~10 ملفات اختبار | نقل الاختبارات بجانب الكود المُختبر |
| 5 | منخفضة | تدريجي | توحيد `toast` → `notify` في hooks |
| 6 | اختياري | — | توحيد أنماط الاستيراد |

**الإجمالي المقدّر: ~35 ملف — صفر تغييرات وظيفية**
