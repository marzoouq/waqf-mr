# قائمة الإغلاق النهائية — العناصر المفتوحة فقط

مرتبة حسب الأولوية مع ترتيب تنفيذ عملي. كل بند مستقل ويمكن إغلاقه على حدة.

---

## 🔴 حرج (يجب البدء بها — أمان/صحة بيانات/توثيق مضلِّل)

### 1. التحقق من runtime validation في `useDashboardSummary`
- **الملف:** `src/hooks/data/useDashboardSummary.ts`
- **المطلوب:** التأكد من استخدام `parseOrThrow(dashboardSummarySchema, ...)` بدلاً من cast مباشر
- **الإغلاق:** إذا غير موجود، إضافته على نفس نمط `useSupportAnalytics`
- **حجم:** صغير (15 دقيقة)

### 2. مزامنة `docs/api/edge-functions.md` بالكامل مع الكود
- **المشكلة الحرجة:** الوثيقة تدّعي `verify_jwt = false` لكل الدوال — وهذا **مضلِّل** ويتعارض مع `supabase/config.toml`
- **المطلوب:**
  - مراجعة كل endpoint (11 دالة) مقابل `supabase/functions/*/index.ts`
  - تصحيح `health-check` response shape
  - إزالة claim العام عن `verify_jwt`
- **حجم:** متوسط (45 دقيقة)

### 3. مزامنة `docs/API.md` بالكامل
- **المطلوب:** sync endpoint contracts لـ `guard-signup`, `lookup-national-id`, `check-contract-expiry`, `dashboard-summary`
- **حجم:** متوسط (30 دقيقة)

### 4. اعتماد مصدر حقيقة واحد للوثائق
- **القرار المطلوب:** `network-inventory.md` أو `docs/API.md`؟
- **بعد القرار:** بقية الوثائق تصبح references مختصرة تشير للمصدر الواحد
- **حجم:** صغير (قرار) + متوسط (تطبيق)

---

## 🟡 متوسط (تنظيمي/معماري بدون أثر تشغيلي مباشر)

### 5. نقل `WaqifDashboard` من `pages/beneficiary/` إلى `pages/waqif/`
- **الملفات:**
  - `src/pages/beneficiary/WaqifDashboard.tsx` → `src/pages/waqif/WaqifDashboard.tsx`
  - `src/pages/beneficiary/WaqifDashboard.test.tsx` → `src/pages/waqif/WaqifDashboard.test.tsx`
- **التحديثات اللاحقة:** routes (`waqifRoutes.tsx` أو ما يقابله)، imports، إزالة الفقرة التاريخية من `pages/beneficiary/README.md`
- **حجم:** صغير (20 دقيقة)

### 6. تفعيل ESLint architectural guards
- **المطلوب:**
  - قراءة `eslint.config.js` (أو `.eslintrc`)
  - إضافة `no-restricted-imports` لمنع import مباشر من `@/integrations/supabase/client` خارج `lib/`
  - إضافة `no-restricted-syntax` لمنع `console.*` (يجب استخدام `logger`)
- **حجم:** صغير (20 دقيقة)

---

## 🟢 منخفض (refactors معمارية كبيرة — تحتاج قرار مستقل)

### 7. تفكيك `src/App.tsx`
- **التقسيم المقترح:** `providers.tsx` + `router.tsx` + `root-layout.tsx`
- **مخاطرة:** متوسطة — يلمس bootstrap التطبيق
- **حجم:** كبير (60 دقيقة + اختبار)

### 8. تفكيك `src/contexts/FiscalYearContext.tsx`
- **التقسيم المقترح:** hooks فرعية (`useFiscalYearPersistence`, `useFiscalYearRolePolicy`, `useFiscalYearResolution`, `useFiscalYearPrefetch`)
- **مخاطرة:** عالية — Context مركزي تستهلكه عشرات المكونات
- **حجم:** كبير جداً (يوم عمل + اختبارات regression)

### 9. توحيد `_shared/auth.ts` عبر كل Edge Functions
- **المطلوب:** refactor الدوال التي ما زالت تستخدم auth يدوي للاعتماد على wrapper موحَّد
- **مخاطرة:** متوسطة — تلمس نقاط مصادقة حساسة
- **حجم:** كبير (يحتاج اختبار حقيقي لكل function)

### 10. تقليل `supabase.from(...)` المباشر داخل `hooks/data/**`
- **القرار المطلوب أولاً:** هل السياسة المعمارية الحالية (السماح بـ `supabase.from` في `hooks/data`) مقبولة أم تتغير؟
- **إذا تغيرت:** نقل كل استدعاءات DB إلى `lib/services/*` ثم استهلاكها من hooks
- **حجم:** كبير جداً (refactor واسع)

---

## ترتيب التنفيذ العملي الموصى به

**المرحلة A — إغلاقات سريعة (≈ ساعتان):**
1 → 5 → 6 → 2 → 3 → 4

**المرحلة B — refactors معمارية (تحتاج قرار منفصل لكل واحدة):**
7 → 9 → 8 → 10

---

## السؤال المطلوب قبل البدء

أي مرحلة أُنفذ الآن؟
- **(أ)** المرحلة A كاملة (البنود 1–6) — إغلاق توثيقي/تنظيمي شامل
- **(ب)** البنود الحرجة فقط (1–4) — تركيز على دقة الوثائق
- **(ج)** بند واحد محدد — اذكر رقمه
- **(د)** المرحلة B (refactor معماري) — يحتاج قرار منفصل لكل بند
