<div dir="rtl">

# نظام إدارة وقف مرزوق بن علي الثبيتي

[![codecov](https://codecov.io/gh/marzoouq/waqf-mr/branch/main/graph/badge.svg)](https://codecov.io/gh/marzoouq/waqf-mr)
[![Tests](https://github.com/marzoouq/waqf-mr/actions/workflows/test.yml/badge.svg)](https://github.com/marzoouq/waqf-mr/actions/workflows/test.yml)

نظام إلكتروني شامل لإدارة الأوقاف يتضمن إدارة العقارات والعقود والإيرادات والمصروفات وتوزيع الحصص على المستفيدين، مع مساعد ذكي يعمل بالذكاء الاصطناعي.

---

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| React + TypeScript | الواجهة الأمامية |
| Vite | أداة البناء |
| Tailwind CSS | التنسيق |
| shadcn/ui | مكتبة المكونات |
| Lovable Cloud | قاعدة البيانات والمصادقة والوظائف الخلفية |
| Lovable AI (Gemini 2.5 Pro) | المساعد الذكي |
| jsPDF | تصدير التقارير PDF |
| Recharts | الرسوم البيانية |
| TanStack Query | إدارة البيانات والتخزين المؤقت |

---

## الأدوار

| الدور | الصلاحيات |
|-------|-----------|
| **ناظر الوقف** (admin) | صلاحيات كاملة — إدارة العقارات والعقود والمالية والمستفيدين |
| **المحاسب** (accountant) | صلاحيات تشغيلية — إدارة العقارات والعقود والمالية (بدون إعدادات النظام وإدارة المستخدمين) |
| **المستفيد** (beneficiary) | عرض فقط — الإفصاح، حصته، التقارير المالية |
| **الواقف** (waqif) | عرض فقط — التقارير والحسابات |

---

## الميزات الرئيسية

- ✅ إدارة العقارات والوحدات العقارية
- ✅ إدارة العقود وتتبع الإيجارات
- ✅ تسجيل الإيرادات والمصروفات
- ✅ الحسابات الختامية وتوزيع الحصص
- ✅ إدارة المستفيدين وربطهم بحسابات مستخدمين
- ✅ نظام الفواتير والمستندات
- ✅ الإفصاح السنوي والتقارير المالية
- ✅ نظام الإشعارات والرسائل
- ✅ مساعد ذكي بالذكاء الاصطناعي (Gemini 2.5 Pro)
- ✅ تصدير PDF باللغة العربية
- ✅ سجل مراجعة جنائي (Audit Log)
- ✅ حماية السنوات المالية المقفلة
- ✅ تنبيهات انتهاء العقود التلقائية
- ✅ سياسات أمان (RLS) على جميع الجداول

---

## اصطلاحات التسمية: `waqf` مقابل `waqif`

تستخدم قاعدة الكود مصطلحين متشابهين لفظاً ومختلفين معنىً، يجب التمييز بينهما عند البحث أو إضافة مكونات:

| المصطلح | المعنى | الاستخدام في الكود |
|---------|--------|--------------------|
| **`waqf`** | الوقف ككيان (الأصول والكيان القانوني) | `src/components/waqf/` — معلومات الوقف، الشعار، البيانات التعريفية (مثل `WaqfInfoEditDialog`) |
| **`waqif`** | الواقف كدور مستخدم (`app_role = 'waqif'`) | `src/components/waqif/` — مكونات لوحة الواقف (`WaqifWelcomeCard`, `WaqifOverviewStats`, …) |

**قاعدة عامة:**
- أي مكون يخص **معلومات الوقف نفسه** (الاسم، الشعار، الوصف) → `components/waqf/`
- أي مكون يخص **واجهة الواقف كمستخدم** (لوحة، رسوم، روابط سريعة) → `components/waqif/`
- صفحة `WaqifDashboard.tsx` موجودة حالياً تحت `pages/beneficiary/` لأسباب تاريخية تتعلق بمشاركة تخطيط لوحة العرض فقط؛ منطقها وصلاحياتها مستقلة تماماً عن المستفيد.

---

## التوثيق

📖 راجع [فهرس التوثيق](docs/INDEX.md) للوصول لجميع ملفات التوثيق التفصيلية.

📑 راجع [دليل التعليقات المرجعية](docs/CHANGELOG-REFS.md) لفهم معنى تعليقات `// #N` المنتشرة في الكود.

---

## معمارية المجلدات: `src/lib/` مقابل `src/utils/`

يفصل المشروع بين نوعين من الكود الداعم وفق قاعدة صارمة:

| الخاصية | `src/lib/` | `src/utils/` |
|---------|------------|--------------|
| **النوع** | بنية تحتية وخدمات مشتركة | دوال نقية (pure functions) |
| **الحالة** | قد تحتفظ بحالة (stateful) | بدون حالة (stateless) |
| **الآثار الجانبية** | مسموحة (Supabase, Auth, Storage, fetch) | ممنوعة |
| **الاختبار** | يحتاج mocks للخدمات الخارجية | اختبار سهل — مدخلات/مخرجات |
| **أمثلة** | `logger`, `queryClient`, `services/`, `realtime/`, `auth/` | `format()`, `calculateDistributions()`, `pdf/`, `csv/` |
| **يستورد `supabase`؟** | ✅ نعم | ❌ لا — استخدم `lib/services/` بديلاً |
| **يستورد `toast`؟** | ✅ نعم (`lib/notify.ts`) | ❌ لا — أعِد result واترك UI يُشعر |

### قاعدة قرار سريعة

اسأل نفسك: **"هل يحتاج هذا الكود إلى mock للاختبار؟"**
- لا → ضعه في `utils/`
- نعم → ضعه في `lib/`

تفاصيل أكثر:
- [`src/lib/README.md`](src/lib/README.md)
- [`src/utils/README.md`](src/utils/README.md)
- [`src/hooks/README.md`](src/hooks/README.md) — تنظيم الهوكات
- معمارية كاملة: `mem://technical/architecture/core-modularization-standard-v7`

---

## التشغيل المحلي

```sh
git clone https://github.com/marzoouq/waqf-mr.git
cd waqf-mr
npm i
npm run dev
```

---

## CI/CD والمراقبة

يحتوي المستودع على **5 GitHub Actions workflows** نشطة:

| Workflow | الغرض | التشغيل |
|----------|-------|---------|
| `ci.yml` | فحص TypeScript + ESLint + بناء | عند كل push/PR |
| `test.yml` | تشغيل Vitest مع تغطية Codecov | عند كل push/PR |
| `health-check.yml` | ping دوري لـ Edge Function `health-check` | كل 30 دقيقة + يدوي |
| `auto-version.yml` | تحديث رقم الإصدار تلقائياً | عند merge إلى main |
| `changelog.yml` | توليد سجل التغييرات | عند merge إلى main |

بالإضافة إلى `dependabot.yml` لتحديث التبعيات أسبوعياً.

---

## مقاييس الجودة

| المقياس | القيمة |
|---------|--------|
| ملفات الاختبار (Vitest) | **186 ملف** — موزّعة بنمط co-location مع الكود |
| Lazy-loaded routes | **48 route** عبر `lazyWithRetry` |
| GitHub Actions نشطة | **5 workflows** |
| Database migrations | **298+ migration** (سلوك معتاد لـ Lovable Cloud) |
| Edge Functions | **11 function** بمصادقة يدوية عبر `getUser()` |
| RLS coverage | **100%** على الجداول الحساسة |

استراتيجية الاختبارات موثّقة في `mem://testing/automated-test-suite-strategy`.

---

## النشر

يتم النشر مباشرة عبر منصة [Lovable](https://lovable.dev) → Share → Publish.

</div>
