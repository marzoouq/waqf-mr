

# خطة تنظيف المشروع — تصفية التقرير

## تصنيف النتائج

### ✅ تم إصلاحه مسبقاً (لا حاجة لعمل)
| # | المشكلة | الحالة |
|---|---------|--------|
| 41 | `@vitejs/plugin-react` مكرر | **حُذف بالفعل** — `devDependencies` يحتوي فقط `plugin-react-swc` |
| 48 | `AUDIT_REPORT` في الريبو | **حُذف بالفعل** |

### ❌ غير قابل للتنفيذ / تصميم مقصود
| # | المشكلة | السبب |
|---|---------|-------|
| 1-20 | Migrations سريعة/مكررة | تاريخية — لا يمكن حذف أو دمج migrations بعد تطبيقها على Live. الملف المكرر (#1/#2) تم تطبيقه بالفعل |
| 21-35 | سياسات RLS مُعاد كتابتها | تاريخية — النتيجة النهائية صحيحة (تم التحقق في الفحص الأمني) |
| 36 | `layout/` vs `dashboard-layout/` | **مختلفان**: `layout/` = الهيكل الرئيسي (1293 سطر)، `dashboard-layout/` = مكونات فرعية يستخدمها layout |
| 37 | `dashboard/` vs `beneficiary-dashboard/` | **مختلفان**: لأدوار مختلفة (admin vs beneficiary) |
| 38-39 | مجلدات hooks/financial و hooks/auth | **نمط قياسي**: فصل المكونات عن المنطق |
| 40 | `waqf/` vs `waqif/` | **مفاهيم مختلفة**: waqf = إعدادات الوقف، waqif = لوحة الواقف |
| 44 | Tailwind v4 + PostCSS | **المشروع يعمل على v4 فعلاً** — `@import "tailwindcss"` في index.css. الذاكرة المحفوظة عن v3 قديمة |
| 49-50 | أسماء UUID للـ migrations | **نظام Lovable** يُولّدها تلقائياً — لا يمكن تغييرها |

### 🔧 قابل للإصلاح (3 مهام فقط)

---

## الخطوات

### 1. تنظيف قواعد ESLint الوهمية
ملف: `eslint.config.js`

حذف 6 قواعد غير موجودة في `eslint-plugin-react-hooks@7`:
- `react-hooks/set-state-in-effect`
- `react-hooks/static-components`
- `react-hooks/purity`
- `react-hooks/refs`
- `react-hooks/immutability`
- `react-hooks/preserve-manual-memoization`

هذه القواعد كانت مقترحة في React Compiler ولم تُضف للإصدار الرسمي.

### 2. حذف `autoprefixer` من PostCSS config
ملف: `postcss.config.js`

الحزمة `autoprefixer` حُذفت من `package.json` في الجلسة السابقة، لكن `postcss.config.js` لا يزال يشير إليها. حذف السطر لمنع خطأ محتمل.

### 3. دمج ملفي Type Definitions
دمج محتوى `src/vite-pwa.d.ts` في `src/vite-env.d.ts` وحذف الملف المنفصل — كلاهما يخدم نفس الغرض (تعريفات أنواع Vite).

---

## ملاحظة عن الملف المكرر (#1)
الملفان `20260318101512` و `20260318102000` متطابقان بالفعل (SHA واحد). لكن **لا يمكن حذف أي منهما** لأنهما مُسجلان في جدول `supabase_migrations.schema_migrations` على Live. حذف أحدهما يسبب migration drift وفشل النشر.

## الملفات المتأثرة
- `eslint.config.js` — حذف 6 قواعد
- `postcss.config.js` — حذف autoprefixer
- `src/vite-env.d.ts` — دمج تعريفات PWA
- حذف: `src/vite-pwa.d.ts`

