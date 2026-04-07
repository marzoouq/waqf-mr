
# تقرير التدقيق الشامل — أبريل 2026

**نطاق الفحص:** 900 ملف مصدر | 221 هوك | 337 مكون | 117 utility | 87 صفحة | 17 Edge Function  
**حالة البناء:** TypeScript `--noEmit` ✅ | Production build ✅ | 3.63 MB JS  
**ثغرات أمنية:** صفر (npm audit clean) ✅

---

## 📊 ملخص الحالة العامة

| المقياس | القيمة | الحكم |
|---------|--------|-------|
| `any` في production code | **0** | ✅ ممتاز (كلها في test files فقط) |
| `console.*` مباشر | **0** | ✅ ممتاز (logger مركزي) |
| Supabase مباشر في components | **0** | ✅ فصل مسؤوليات كامل |
| Supabase مباشر في pages | **0** | ✅ فصل مسؤوليات كامل |
| أسماء مكونات مكررة | **0** | ✅ لا تعارض |
| Barrel files | **74** | ✅ تنظيم جيد |
| ثغرات أمنية | **0** | ✅ نظيف |

---

## 🔴 الأولوية 1 — تبعيات ميتة (10 حزم، خطر صفري)

| الحزمة | الاستيرادات |
|--------|------------|
| `embla-carousel-react` | 0 |
| `react-resizable-panels` | 0 |
| `input-otp` | 0 |
| `cmdk` | 0 |
| `@radix-ui/react-aspect-ratio` | 0 |
| `@radix-ui/react-context-menu` | 0 |
| `@radix-ui/react-hover-card` | 0 |
| `@radix-ui/react-menubar` | 0 |
| `@radix-ui/react-navigation-menu` | 0 |
| `@radix-ui/react-toast` | 0 (sonner مُستخدم بدلاً) |

**الإجراء:** `npm uninstall` — لا مخاطر.

---

## 🔴 الأولوية 2 — كود مهمل (`@deprecated`) لا يزال موجوداً

| الملف | العدد | التفصيل |
|-------|-------|---------|
| `useAdvanceQueries.ts` | 4 هوكات | `useMyAdvanceRequests`, `usePaidAdvancesTotal`, `useCarryforwardBalance`, `useMyCarryforwards` — بدون مستهلكين فعليين |
| `useCollectionData.ts` | 1 دالة | `useCollectionData` — fallback قديم |
| `renderers.ts` | ملف كامل | barrel مهمل — يجب الاستيراد من `renderers/index` مباشرة |

**الإجراء:** حذف الهوكات الميتة + تحديث مسارات الاستيراد.

---

## 🟠 الأولوية 3 — ازدواجية مكونات

### CrudPagination vs TablePagination
- `CrudPagination`: مستخدم في **2 صفحة فقط** (BeneficiariesPage, PropertiesPage)
- `TablePagination`: مستخدم في **16 مكون/صفحة**

**الإجراء:** دمج `CrudPagination` في `TablePagination` وتحديث الاستخدامين.

---

## 🟠 الأولوية 4 — ملفات في أماكن خاطئة

| الملف | الموقع الحالي | الموقع الصحيح |
|-------|-------------|-------------|
| `closeYearChecklist.utils.ts` | `components/accounts/` | `utils/financial/` |
| `helpers.ts` | `components/properties/units/` | `utils/properties/` |

**المبدأ:** ملفات utils/helpers يجب أن تكون في `src/utils/` وليس داخل مجلدات المكونات.

---

## 🟡 الأولوية 5 — هوكات ومكونات ضخمة

### هوكات > 200 سطر (تحتاج تقسيم):
| الملف | الأسطر | ملاحظة |
|-------|--------|--------|
| `useDashboardSummary.ts` | 249 | أثقل data hook — معالجة بيانات كثيفة |
| `useCrudFactory.ts` | 237 | مقبول — factory عام |
| `useInvoicesPage.ts` | 233 | مرشح لاستخراج actions |
| `useWebAuthn.ts` | 231 | مقبول — WebAuthn معقد أصلاً |
| `usePropertiesPage.ts` | 224 | مرشح لاستخراج form logic |
| `usePrefetchPages.ts` | 214 | مقبول — تعريفات prefetch |

### مكونات > 200 سطر (غير UI library):
| الملف | الأسطر | ملاحظة |
|-------|--------|--------|
| `LoginForm.tsx` | 304 | مرشح لتقسيم (WebAuthn + OTP + Password) |
| `ZatcaInvoicesTab.tsx` | 229 | مرشح لاستخراج table logic |
| `MonthlyPerformanceReport.tsx` | 224 | مقبول — تقرير واحد |
| `AccountantDashboardView.tsx` | 210 | جديد — مقبول حالياً |

---

## 🟡 الأولوية 6 — حجم الـ Bundle

| Chunk | الحجم | الملاحظة |
|-------|-------|---------|
| `vendor-pdf` | **530 KB** | jsPDF + خطوط عربية — ضروري، lazy loaded ✅ |
| `vendor-recharts` | **342 KB** | رسوم بيانية — ضروري |
| `vendor-html2canvas` | **198 KB** | ملف واحد فقط يستخدمه — بديل `dom-to-image-more` (~15 KB) |
| `vendor-supabase` | **190 KB** | أساسي |
| `vendor-react` | **189 KB** | أساسي |
| `vendor-radix` | **153 KB** | يمكن تقليصه بحذف 10 حزم ميتة |

**إجمالي JS:** 3.63 MB (gzip ~700 KB) — مقبول لتطبيق enterprise.

---

## 🟡 الأولوية 7 — `useEffect` (59 ملف)

رقم مقبول لمشروع بهذا الحجم. معظمها مبرر (subscriptions, listeners, sync). يستحق مراجعة انتقائية لاكتشاف effects يمكن استبدالها بـ `useMemo` أو event handlers مباشرة.

---

## 🟢 الأولوية 8 — التبعيات (حالة الإصدارات)

| الحزمة | الإصدار | الحالة |
|--------|---------|--------|
| react | ^19.2.4 | ✅ أحدث |
| typescript | ^6.0.2 | ✅ أحدث |
| react-router-dom | ^7.14.0 | ✅ أحدث |
| @tanstack/react-query | ^5.96.2 | ✅ أحدث |
| @supabase/supabase-js | ^2.101.0 | ✅ أحدث |
| tailwindcss | ^4.2.2 | ✅ أحدث |
| zod | ^4.3.6 | ✅ أحدث |
| vite | 5.4.21 | ⚠️ Vite 6 متاح — ترقية آمنة غير عاجلة |

---

## 🟢 نقاط القوة (لا تحتاج تغيير)

- ✅ **فصل مسؤوليات مثالي** — صفر Supabase في UI/Pages
- ✅ **TypeScript صارم** — صفر `any` في production
- ✅ **Logger مركزي** — صفر `console.*` في production
- ✅ **Lazy loading شامل** — كل الصفحات مع `lazyWithRetry`
- ✅ **Vendor chunks مفصولة** بشكل ذكي في Vite config
- ✅ **لا مكونات مكررة الأسماء**
- ✅ **لا ثغرات أمنية** في التبعيات
- ✅ **Barrel files منظمة** (74 ملف)

---

## 📋 خارطة التنفيذ المُقترحة

### الدورة 1 — تنظيف فوري (خطر صفري):
1. حذف 10 تبعيات ميتة
2. حذف 4 هوكات `@deprecated` بدون مستهلكين
3. حذف `renderers.ts` المهمل + تحديث الاستيراد

### الدورة 2 — إعادة تنظيم:
1. دمج `CrudPagination` في `TablePagination`
2. نقل `closeYearChecklist.utils.ts` → `utils/financial/`
3. نقل `helpers.ts` → `utils/properties/`

### الدورة 3 — تحسين (اختياري):
1. استبدال `html2canvas` بـ `dom-to-image-more`
2. ترقية Vite 5 → 6
3. مراجعة `useEffect` لاكتشاف بدائل أفضل
4. تقسيم `LoginForm.tsx` (304 سطر)

---

**⚠️ لا تغيير في الكود — هذا تقرير تحليلي فقط. التنفيذ يتم بعد الموافقة.**
