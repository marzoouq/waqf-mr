# خطة Stage 6 — البنود الخمسة المتبقية

تنفيذ ما تبقّى من تدقيق `audit-report-2026-06-03.md` بعد التحقق الفعلي:
- 7 بنود مُصلَحة فعلياً (مؤكَّدة)
- 5 بنود متبقية (هذه الخطة)
- 1 معلَّق بقرار منتج (خارج النطاق)

---

## ترتيب الأولويات

| # | البند | الأولوية | السبب | الجهد |
|---|---|---|---|---|
| **S6-1** | `PagePerformanceCard` → `usePagePerformanceCard` | 🟠 High | انتهاك Core Rule (Page Hook Pattern) | ~15د |
| **S6-2** | `FiscalYearWidget` → `useFiscalYearWidget` | 🟡 Medium | نفس الانتهاك، أصغر | ~10د |
| **S6-3** | `useAdminDashboardPage` IIFE → `useMemo` | 🔵 Low | تنظيف بسيط — يُنفَّذ مع S6-2 | ~3د |
| **S6-4** | `AiAssistant` Tabs → `SegmentedControl` يدوي | 🟡 Medium | إمكانية الوصول (Radix Tabs بلا TabsContent غير صحيح) | ~10د |
| **S6-5** | `BeneficiaryAdvanceCard` → فتح Dialog محلياً | 🟡 Medium | UX — يحتاج وجود dialog سلفة قابل لإعادة الاستخدام | ~20د (يحتاج فحص) |

التنفيذ يتم بالترتيب أعلاه. S6-5 الأخير لأنه قد يحتاج استخراج مكوّن مشترك.

---

## S6-1 — استخراج `PagePerformanceCard`

**المشكلة:** `useState` + `useSyncExternalStore` + `useMemo` داخل `src/components/dashboard/views/PagePerformanceCard.tsx` (انتهاك Page Hook Pattern).

**التنفيذ:**
- إنشاء `src/hooks/page/admin/dashboard/usePagePerformanceCard.ts` يحتوي:
  - `useSyncExternalStore(subscribePerfUpdates, getPerfRevision)`
  - `useState` لـ `showAll`
  - `useMemo` لـ `summaries` و `totalEntries`
  - يُرجع: `{ summaries, totalEntries, showAll, toggleShowAll, visibleSummaries }`
- `PagePerformanceCard.tsx` يصبح UI خالص يستهلك الـ hook.

**التحقق:**
1. `bunx vitest run src/test/e2e/adminDashboardFlow` — 5/5 يبقى أخضر
2. `code--view` على الملف الجديد < 80 سطر و UI < 100 سطر
3. تحميل `/dashboard` كناظر → البطاقة تعرض البيانات (فحص بصري)

---

## S6-2 — استخراج `FiscalYearWidget`

**المشكلة:** كتلتا `useMemo` (السطر 63, 74) تحسبان `timeProgress` و `financialProgress` داخل UI.

**التنفيذ:**
- إنشاء `src/hooks/page/admin/dashboard/useFiscalYearWidget.ts` يستقبل `(fiscalYear, totalIncome, contractualRevenue)` ويُرجع كل المشتقات المحسوبة.
- `FiscalYearWidget.tsx` يستهلكه فقط — لا `useMemo` ولا حسابات.

**التحقق:**
1. اختبار `accountantDashboardFlow` + `adminDashboardFlow` يبقيان أخضرين
2. الويدجت يعرض نفس الأرقام قبل/بعد على `/dashboard`

---

## S6-3 — `useAdminDashboardPage` IIFE → `useMemo`

**المشكلة:** السطر 92-99 يستخدم IIFE داخل return — يُعاد تنفيذه كل render.

**التنفيذ:**
- استخراج `heatmapBounds` إلى `useMemo` مستقل قبل return، مع dep array `[adminData.fiscalYear, secondary.heatmapInvoices]`.

**التحقق:**
1. كل اختبارات E2E تبقى خضراء
2. `bunx vitest run src/hooks/page/admin/dashboard` بدون أخطاء

---

## S6-4 — `AiAssistant` Tabs → SegmentedControl

**المشكلة:** Radix `<Tabs>` يتطلب `<TabsContent>` المرتبط بكل `TabsTrigger`. الاستخدام الحالي يكسر دلالة ARIA (`role="tablist"` بلا `tabpanel`).

**التنفيذ:**
- استبدال `Tabs/TabsList/TabsTrigger` بمجموعة `<button>` بسيطة داخل `<div role="radiogroup" aria-label="وضع المساعد الذكي">`، كل زر بـ `role="radio"` و `aria-checked`.
- الحفاظ على نفس `onChange` السلوك والشكل (يستخدم classes shadcn الحالية).

**التحقق:**
1. axe-core في DevTools (يدوي) — لا أخطاء ARIA على `AiAssistant`
2. النقر بين الأوضاع يبدّل `mode` كما قبل
3. لا اختبارات قائمة تكسر

---

## S6-5 — `BeneficiaryAdvanceCard` Dialog بدل التنقل

**المشكلة:** السطر 38 ينقل إلى `/beneficiary/my-share` بدل فتح dialog طلب سلفة فوراً.

**خطوة الاستكشاف الأولى** (قبل التنفيذ):
- `grep` عن `AdvanceRequestDialog` أو `RequestAdvanceDialog` في `src/components/beneficiary/`
- إن وُجد → استخدامه مباشرة
- إن لم يوجد → استخراج Dialog من صفحة `MySharePage` إلى مكوّن مشترك `src/components/beneficiary/dialogs/RequestAdvanceDialog.tsx`

**التنفيذ:**
- `BeneficiaryAdvanceCard` يحتفظ بحالة `open` محلية ويعرض `<RequestAdvanceDialog open onOpenChange ...>`
- إزالة `useNavigate` من المكوّن

**التحقق:**
1. النقر على زر السلفة من اللوحة → يفتح dialog (لا navigation)
2. زر "عرض حصتي" التفصيلي يبقى موجوداً للتنقل الكامل (إن أردنا الحفاظ على المسار البديل)
3. اختبار E2E `beneficiaryDashboardFlow` يبقى أخضر

---

## القسم D — تحقق نهائي مشترك

بعد كل البنود:
1. ✅ `bunx vitest run` — جميع الاختبارات خضراء
2. ✅ TypeScript build بدون أخطاء
3. ✅ ESLint — لا تحذيرات جديدة
4. ✅ كل ملف معدَّل ≤ 200 سطر (Container/Presentational)
5. ✅ زيارة بصرية يدوية:
   - `/dashboard` كناظر — `PagePerformanceCard` + `FiscalYearWidget` تعرضان نفس الأرقام
   - `/beneficiary` — زر السلفة يفتح dialog
   - `AiAssistant` على `/dashboard` — تبديل الوضع يعمل

---

## ملفات الإضافة والتعديل

### جديدة (3)
```text
src/hooks/page/admin/dashboard/usePagePerformanceCard.ts
src/hooks/page/admin/dashboard/useFiscalYearWidget.ts
src/components/beneficiary/dialogs/RequestAdvanceDialog.tsx   (مشروط — إن لم يوجد)
```

### معدَّلة (5)
```text
src/components/dashboard/views/PagePerformanceCard.tsx        ← UI خالص
src/components/dashboard/widgets/FiscalYearWidget.tsx         ← UI خالص
src/hooks/page/admin/dashboard/useAdminDashboardPage.ts       ← useMemo بدل IIFE
src/components/dashboard/AiAssistant.tsx                       ← radiogroup
src/components/beneficiary/dashboard/BeneficiaryAdvanceCard.tsx ← dialog محلي
.lovable/plan.md                                               ← Stage 6 lock
```

### ملفات محمية — **لن تُلمس**
`AuthContext.tsx`, `ProtectedRoute.tsx`, `supabase/config.toml`, `client.ts`, `types.ts`, `.env`

---

## خارج النطاق صراحةً

- ❌ سياسة إفصاح المحاسب على `FiscalYearWidget` (معلَّق بقرار منتج — يحتاج إجابة قبل التنفيذ)
- ❌ تعديل RLS / migrations / DB
- ❌ منطق RPC المالية
- ❌ AST UI Integrity (مُستبعد منذ Stage 5)

---

## المخاطر والتخفيف

| الخطر | التخفيف |
|---|---|
| S6-4: تغيير Tabs قد يكسر اختبار snapshot | لا snapshots على `AiAssistant`؛ تحقق يدوي قبل push |
| S6-5: عدم وجود dialog قابل لإعادة الاستخدام | استكشاف grep أولاً؛ إن لزم استخراج، يتم في commit منفصل |
| S6-1/S6-2: التحويل قد يكسر الـ hooks rules | اختبارات E2E تكشف ذلك فوراً |

## التقدير الزمني
~60 دقيقة إجمالاً (15+10+3+10+20 + تحقق نهائي 5).
