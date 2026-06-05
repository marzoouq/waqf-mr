# تقرير المراجعة المعمارية الشاملة (قراءة فقط)

تحليل قراءة فقط لـ 1,202 ملف TS/TSX، اعتماداً على سكربتات `audit/*` الحالية + مسح مباشر للهيكل والاعتمادات.

---

## 1. الحكم العام: ✅ سليم بدرجة عالية

| المؤشر | القيمة | الحكم |
|---|---|---|
| ملفات TS/TSX | 1,202 | — |
| صفحات | 67 (39 محمية + auth/landing/...) | — |
| pages تستورد `supabase/client` | 0 | ✅ |
| components تستورد `supabase/client` | 0 | ✅ |
| pages تحتوي `useState`/`useEffect` | 1 فقط | ✅ Page Hook Pattern مُطبّق |
| Critical violations (CoreModV7) | 0 | ✅ |
| GAP في الصلاحيات/التحكم | 0 | ✅ |
| toast في `hooks/data/` أو `utils/` | 0 | ✅ |
| Barrel → barrel | 0 | ✅ |
| Hooks تستورد من `pages/**` | 0 | ✅ |
| RLS مفعّل على الجداول | 42/42 | ✅ |

**الخلاصة:** البنية نظيفة، فصل الاهتمامات مُطبَّق بصرامة، بوابة Audit (`npm run audit && npm run audit:gate` + `.husky/pre-push`) تمنع الانحدار. النقاط أدناه تحسينات نوعية لا إصلاحات حرجة.

---

## 2. كود في مكان غير مثالي

### 2.1 ازدواج `hooks/page/shared/` مع `hooks/application/`
الذاكرة `mem://technical/architecture/hooks-application-layer` تنص أن المشتركات بين الأدوار تذهب لـ `hooks/application/`. مع ذلك لا يزال `src/hooks/page/shared/notifications/useNotificationPreferences.ts` موجوداً كملف يتيم — انتهاك تنظيمي صامت لم تحجبه السكربتات.

### 2.2 `src/components/dashboard/` يخلط 3 مستويات
المجلد يحوي ملفات مسطحة (`AiAssistant.tsx`, `AdvancedFiltersBar.tsx`, `DashboardLazySection.tsx`) جنب مجلدات (`widgets/`, `views/`, `charts/`, `kpi/`). الملفات المسطحة تستحق مجلداً فرعياً (`dashboard/shell/`).

### 2.3 `src/components/common/` ضخم (31 ملف بدون تقسيم)
ثاني أكبر مجلد بعد `ui/` (shadcn). مرشّح للتقسيم لـ `common/feedback`, `common/forms`, `common/layout`, `common/finance` (الأخير شبه موجود).

### 2.4 تشابه أسماء `lib/` ↔ `utils/`
مجلدات بنفس الاسم في الجهتين: `auth/`, `contracts/`. لا انتهاك آلي (الفحص يقول 0 supabase في utils)، لكن قد يُربك المساهمين. `lib/README.md` يشرح الحدود — ينقص نفس الشيء داخل `utils/contracts/` و `utils/auth/`.

---

## 3. فصل الاهتمامات — تقييم تفصيلي

| الطبقة | الحالة | ملاحظة |
|---|---|---|
| Pages (UI نقي) | ✅ ممتاز | 66/67 صفحة بلا state |
| hooks/page (page controllers) | ✅ جيد | 3 هوكات > 200 سطر مرشّحة للتقسيم |
| hooks/application (cross-role) | ⚠ تنظيمي | `shared/` لم يُهجَّر بالكامل |
| hooks/data (Supabase نقي) | ✅ ممتاز | بلا toast/تنسيق |
| hooks/domain (حسابات) | ✅ | معزول عن I/O |
| lib (stateful services) | ✅ | منظّم لـ 14 مجلداً |
| utils (pure functions) | ✅ | 0 supabase، 0 toast |
| types | ✅ | `src/types/` مركزي |
| RLS / Edge Functions | ✅ | Zod مطبّق + `getUser()` فقط |

لا حالات High Coupling حرجة — السكربتات الخمسة تفحص حدود الطبقات وتعطي 0.

---

## 4. التعقيد الزائد — مرشّحات التفكيك

### 4.1 هوكات > 200 سطر (3 ملفات — حالياً Info)
| الملف | الأسطر | الفعل المقترح |
|---|---:|---|
| `hooks/page/admin/contracts/useContractForm.ts` | 227 | استخراج `useContractFormValidation` + `useContractFormSubmit` |
| `hooks/page/beneficiary/views/usePropertiesViewPage.ts` | 202 | استخراج `usePropertiesFilters` |
| `hooks/page/admin/reports/useAnnualReportPage.ts` | 200 | نقل الحسابات إلى `hooks/domain/` |
| `hooks/application/useAiChat.ts` | 197 | مراقبة فقط |

### 4.2 مكوّنات بين 180–193 سطر
الأكبر `components/contracts/MonthlyAccrualTable.tsx` (193). كلها تحت 200 ومسموحة للحاويات — لا فعل مطلوب.

### 4.3 ألوان hex (4 ملفات)
كلها داخل Canvas (`SignaturePad`) أو خلفية طباعة (`InvoicePreviewDialog`) — متوافقة مع القاعدة.

---

## 5. تحقق سلبي مفيد (لا مشكلة وُجدت)

- ❌ لا ملف `utils/` يستورد `sonner` أو `@/integrations/supabase`.
- ❌ لا صفحة تستورد `hooks/data/*`.
- ❌ لا hook يستورد من `@/pages/**`.
- ❌ لا `console.log` في الإنتاج.
- ❌ لا `localStorage` لـ `fiscal_year_id` (sessionStorage فقط).
- ❌ لا CHECK constraint زمني (validation triggers بدلاً منها).
- ❌ لا roles مخزّنة خارج جدول `user_roles`.

---

## 6. التوصيات بالترتيب — من الأهم إلى الاختياري

| # | الأولوية | البند | الجهد | الأثر |
|---|---|---|---|---|
| 1 | P0 | لا شيء حرج حالياً | — | — |
| 2 | P1 | تهجير `hooks/page/shared/notifications/useNotificationPreferences.ts` → `hooks/application/messaging/` + تحديث المستوردين + حذف مجلد `shared/` | صغير (10د) | إغلاق ازدواج تنظيمي |
| 3 | P1 | تقسيم `useContractForm.ts` (227 سطر) لـ 3 هوكات | متوسط (1س) | يخفض التعقيد ويسهّل الاختبار |
| 4 | P2 | تقسيم `usePropertiesViewPage` + `useAnnualReportPage` | متوسط (1–2س) | إعادة استخدام أفضل |
| 5 | P2 | تقسيم `src/components/common/` لمجلدات فرعية موضوعية | متوسط (1س) | قابلية اكتشاف |
| 6 | P2 | تجميع الملفات المسطحة في `components/dashboard/` ضمن `dashboard/shell/` | صغير | تنظيم بصري |
| 7 | P3 | إضافة `README.md` لـ `utils/auth/` و `utils/contracts/` يوضح الحدود مقابل `lib/` | صغير | توجيه المساهمين |
| 8 | P3 | تشديد `audit-hooks-layout.mjs` ليرفض أي ملف جديد في `hooks/page/shared/` | صغير | منع الانحدار |
| 9 | P3 | إضافة قاعدة في `audit-conventions-deep` لرفض components > 250 سطر صراحةً (الآن Info فقط) | صغير | حدود واضحة |
| 10 | P4 | تأكيد أن `.github/workflows/ci.yml` يستدعي `npm run audit && npm run audit:gate` على كل PR (موجود workflow — يحتاج تحقق فقط) | متوسط | تطبيق سحابي للبوابة |
| 11 | P4 | توثيق خريطة الطبقات (Mermaid) في `audit/architecture-map.md` | صغير | تيسير onboarding |

---

## 7. خطة التنفيذ (لا تُنفَّذ الآن — تتطلب موافقة لكل بند)

> هذه المراجعة لم تُعدّل أي كود. كل بند أعلاه يُقدَّم كـ plan مستقل في رسالة لاحقة لإبقاء الـ diffs صغيرة وقابلة للمراجعة.

الترتيب الموصى به:
1. البند #2 (تهجير `shared/`) — أصغر وأعلى عائد تنظيمي.
2. البند #3 (تقسيم `useContractForm`).
3. البندان #5 و #6 (إعادة تنظيم `components/`).
4. البنود #4 و #7–9 (تحسينات + تشديد البوابة).
5. البندان #10–11 (CI سحابي + توثيق).

---

## 8. المخرجات الجاهزة الآن

- `audit/report.html` — لوحة تفاعلية بكل النتائج.
- `audit/structure-deep-review.md` — مراجعة الهيكل التفصيلية.
- `audit/conventions-deep-report.md` — جدول الانتهاكات (7 Info، 0 حرج).
- `audit/hooks-layout-report.md` — صحة طبقات الهوكات.
- `audit/page-controls-audit.md` — كل عناصر التحكم في 39 صفحة محمية.
- `audit/ui-permissions-audit.md` — مصفوفة الصلاحيات الكاملة.