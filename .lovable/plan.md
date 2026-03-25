

# تقرير التحقق — ما تم إصلاحه وما يحتاج عملاً فعلياً

## ❌ مشاكل مُدّعاة تم حلّها فعلاً

| البند | الحقيقة |
|---|---|
| `vite-plugin-pwa` في `dependencies` | **خطأ** — موجود فعلاً في `devDependencies` (سطر 112) |
| `og-image.png` = 903KB | **تم إصلاحه** — يستخدم صورة WebP خارجية في `index.html` |
| كاش PWA 30 يوم StaleWhileRevalidate | **تم إصلاحه** — غير موجود في الكود الحالي |
| `coverage.thresholds` غائبة | **تم إصلاحه** — حد 60% موجود في `vitest.config.ts` |
| ZATCA seller_name مُضمّن | **تم إصلاحه** — يُقرأ من `settings` ديناميكياً |
| Pagination الرسائل ثابت 50 | **تم إصلاحه** — يستخدم `useInfiniteQuery` مع cursor pagination |

## ✅ مشاكل حقيقية تحتاج إصلاح

### 1. حذف `@tailwindcss/vite` v4 من `dependencies` (دقائق)

**الملف:** `package.json`

المشروع يستخدم Tailwind **v3** عبر PostCSS (`postcss.config.js` + `@tailwind` directives). الحزمة `@tailwindcss/vite` v4 موجودة في `dependencies` (سطر 50) لكنها **غير مستوردة** في أي مكان — وزن ميت يزيد حجم `node_modules`.

- حذف `"@tailwindcss/vite": "^4.2.2"` من `dependencies`
- إبقاء `"tailwindcss": "^3.4.17"` في `devDependencies` كما هو (مستخدم فعلياً)

### 2. نقل `autoprefixer` إلى `devDependencies` (دقائق)

**الملف:** `package.json`

`autoprefixer` أداة PostCSS للبناء فقط — لا تُحزَّم مع التطبيق. حالياً في `dependencies` (سطر 54).

- حذفها من `dependencies`
- إضافتها إلى `devDependencies`

### 3. إضافة FK لـ `invoice_chain.invoice_id` (migration)

**الملف:** migration جديد

حالياً `invoice_chain.invoice_id` بدون foreign key مما يسمح بسجلات يتيمة. لكن بما أن `source_table` يشير إلى جدولين مختلفين (`payment_invoices` أو `invoices`)، لا يمكن استخدام FK تقليدي واحد.

**الحل:** إضافة trigger للتحقق من وجود `invoice_id` في الجدول المناسب حسب `source_table`.

---

## 📊 ملخص

```text
المهمة                                    الحالة
──────────────────────────────────────────────────
حذف @tailwindcss/vite من dependencies     ← يحتاج إصلاح
نقل autoprefixer → devDependencies         ← يحتاج إصلاح
FK/trigger لـ invoice_chain                ← يحتاج إصلاح
vite-plugin-pwa في dependencies            ← خطأ في التقرير
og-image 903KB                             ← مُصلَح سابقاً
كاش PWA 30 يوم                            ← مُصلَح سابقاً
coverage.thresholds                        ← مُصلَح سابقاً
seller_name مُضمّن                         ← مُصلَح سابقاً
Pagination الرسائل                         ← مُصلَح سابقاً
```

**تحسينات UX المذكورة** (تصدير Excel، مقارنة KPI، فلتر العقود، تصنيف الإشعارات) هي ميزات جديدة صالحة يمكن تنفيذها لاحقاً كمهام منفصلة.

