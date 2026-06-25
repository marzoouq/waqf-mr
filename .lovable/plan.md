# تقرير تدقيق معماري شامل (Read-Only)

**النطاق:** 1,311 ملف TS/TSX داخل `src/` + طبقة Supabase. **التاريخ:** 2026-06-25.

## 1. الحكم العام

البنية **نظيفة ومعيارية بدرجة عالية**. طبقات `pages → hooks/page → hooks/data → lib → supabase` مطبّقة فعلياً، ومدعومة بسكربتات حراسة (`audit-structure.mjs`, `audit-hooks-layout.mjs`, `security-gates.mjs`). لا توجد كسور معمارية حرجة. ما يلي ملاحظات تحسين، لا أعطال.

## 2. مؤشرات صحّية ممتازة (لا تحتاج عملاً)

- 0 `console.*` خارج `logger` (ما عدا `src/test/setup.ts` — مشروع).
- 0 `: any` فعلية في كود الإنتاج (نتيجة واحدة فقط، test util).
- 0 صفحة تستورد `@/integrations/supabase/client` مباشرة.
- 0 مكوّن `components/**` يستدعي Supabase مباشرة.
- 0 ملف في `utils/` يستورد `sonner` أو `supabase` أو `hooks/*`.
- `hooks/` مقسّم بشكل صحيح: `auth/{session,role,biometric,flows}`, `data/{financial/*, settings/*}`, `domain`, `page`, `application`, `ui` — تقرير `hooks-layout-report.md`: **0 issues**.
- متوسط حجم الملف منخفض (component 80 LOC، lib 71، hook-data 65). أكبر ملف غير-test هو `integrations/supabase/types.ts` (مُولَّد، محمي).

## 3. الملاحظات (مرتبة حسب الأولوية)

### حرجة (Critical)

*لا يوجد.*

### عالية (High) — يُنصح بالمعالجة قبل الإطلاق

1. **كسر اتجاه اعتماد واحد في `lib/`:**
  `src/lib/services/supportService.ts:8` يستورد نوعاً من `@/hooks/data/support/useSupportTickets`.
  - المخالفة: `lib/` يجب ألا يعتمد على `hooks/` (انعكاس الاعتماد).
  - الإصلاح المقترح: نقل `SupportTicket` إلى `src/types/support.ts` ثم استيراده من الجانبين.

### متوسطة (Medium) — تحسين صيانة

2. `**src/integrations/supabase/types.ts` (2,665 LOC) محمي ومُولَّد** — لا فعل، فقط استبعاده من حسابات الحجم في التقارير لتفادي تشويش الأرقام.
3. `**hooks/page/admin/financial/useExpensesPage.ts` (179)** و `**useFiscalYearManagement.ts` (178)** و `**useBylawsPage.ts` (178)**: قرب حدّ 200 LOC. يُنصح بتقسيم كل منها إلى:
  - `useXxxQueries.ts` (TanStack queries)
  - `useXxxMutations.ts` (mutations + toasts)
  - `useXxxPage.ts` (تركيب وتنسيق فقط)
4. **صفحات قرب الحد:** `AnnualReportPage.tsx` (196)، `DistributionsPage.tsx` (190)، `MySharePage.tsx` (189)، `ReportsPage.tsx` (187). معظمها تجميع أقسام؛ يمكن استخراج Sections إلى `components/<feature>/sections/` لتقليل JSX داخل الصفحة.
5. `**lib/services/diagnosticsReadService.ts` (223 LOC)** يتجاوز حدّ 200. يُقسم إلى ملفات حسب نوع الفحص (security/perf/financial).
6. `**utils/financial/collection/collectionCompute.ts` (199)** و `**utils/pdf/entities/accountsPdf.ts` (195)**: حالياً نقية لكنها كثيفة منطقياً — يفضّل فصل دوال المساعدة في ملفات `*Helpers.ts` لتيسير الاختبار المنفصل.

### منخفضة (Low) — تحسينات تجميلية

7. `**constants/navigation.ts` (218 LOC)** — يمكن تقسيمه حسب الدور (`navigation/admin.ts`, `navigation/beneficiary.ts`, …).
8. **عدد barrels = 34**: مقبول، لكن راجع أن أياً منها لا يستورد من barrel آخر (القاعدة محفوظة بالذاكرة). السكربت الحالي لا يفرضها — يُستحسن إضافة فحص في `scripts/audit-structure.mjs`.
9. **5 تعليقات TODO/FIXME** خارج tests — تستحق فرزها (open/close) في issue tracker.
10. `**components/ui/` يحوي 29 ملفاً**: بعضها (`native-select-dialog`) ليس shadcn أصلي. يُستحسن نقل المخصّص إلى `components/common/` لإبقاء `ui/` لـ shadcn primitives فقط.

### اختيارية (Optional Enhancements)

11. إضافة قاعدة ESLint مخصصة (`no-restricted-imports`) تمنع رسمياً:
  - `pages/** → @/integrations/supabase/*`
    - `components/** → @/integrations/supabase/*`
    - `lib/** → @/hooks/*`
    - `utils/** → sonner|supabase|@/hooks/*`
    حالياً يُحرس عبر سكربت Vitest gate؛ ESLint يعطي تغذية فورية في IDE.
12. توليد رسم اعتمادات تلقائي (madge / dependency-cruiser) ودمجه في CI لرصد circular deps.
13. تفعيل `import/no-cycle` و `import/order` في ESLint.
14. توحيد أحجام الملفات في `audit/structure-inventory.md` لاستبعاد `types.ts` المُولَّد و tests لتسهيل قراءة المؤشرات الحقيقية.
15. توثيق مختصر `ARCHITECTURE.md` في الجذر يلخّص المخطط من `audit/architecture-map.md` لمن لا يقرأ مجلد `audit/`.

## 4. خريطة الإجراءات المقترحة (مرتّبة)


| #   | الإجراء                                                                                                       | الأولوية | الحجم         |
| --- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| 1   | نقل نوع `SupportTicket` إلى `src/types/support.ts` وإزالة استيراد `hooks` من `lib/services/supportService.ts` | High     | دقائق         |
| 2   | تقسيم `useExpensesPage` / `useFiscalYearManagement` / `useBylawsPage` إلى queries+mutations+page              | Medium   | ساعة لكل واحد |
| 3   | تقسيم `diagnosticsReadService.ts` حسب فئة الفحص                                                               | Medium   | 30 د          |
| 4   | استخراج Sections من `AnnualReportPage` و `DistributionsPage` و `MySharePage` و `ReportsPage`                  | Medium   | ساعة لكل صفحة |
| 5   | تقسيم `constants/navigation.ts` حسب الدور                                                                     | Low      | 20 د          |
| 6   | نقل مكوّنات `components/ui/` غير-shadcn إلى `components/common/`                                              | Low      | 20 د          |
| 7   | إضافة قاعدة `no-restricted-imports` في ESLint لتطبيق حدود الطبقات                                             | Optional | 30 د          |
| 8   | إضافة فحص barrel-to-barrel في `scripts/audit-structure.mjs`                                                   | Optional | 20 د          |
| 9   | دمج madge/dependency-cruiser في CI                                                                            | Optional | 45 د          |
| 10  | إنشاء `ARCHITECTURE.md` ملخّص في الجذر                                                                        | Optional | 15 د          |


## 5. الخلاصة

لا توجد ديون معمارية حرجة. **خطوة واحدة فقط (#1) تكسر قاعدة طبقات فعلياً**؛ الباقي تلميع جودة. النظام جاهز للإطلاق من ناحية البنية، مع توصية بتنفيذ #1 قبل النشر و #2–#4 خلال أول دورة صيانة.

> هذا التقرير قراءة فقط. لم يُعدَّل أي ملف. اعتمد الخطة لأبدأ التنفيذ، أو حدّد بنوداً معيّنة فقط.  
>
> عند مواجهة الأخطاء، اتبع منهجية علمية لتصحيح الأخطاء بدلاً من إجراء تغييرات عشوائية. ابدأ بإعادة إنتاج المشكلة نفسها في بيئة مُحكمة. اجمع بيانات شاملة تتضمن سجلات وحدة التحكم، وطلبات الشبكة، وحالة المكونات، ورسائل الخطأ. ضع فرضيات متعددة حول الأسباب المحتملة واختبر كل فرضية بشكل منهجي. اعزل المشكلة بتضييق نطاق المكونات المتأثرة وتحديد ظروف التشغيل. وثّق عملية تصحيح الأخطاء ونتائجها للرجوع إليها مستقبلاً. استخدم أدوات تصحيح الأخطاء المناسبة، بما في ذلك أدوات مطوري المتصفح، وأدوات مطوري React، وتقنيات تصحيح الأخطاء على مستوى الكود. تأكد دائمًا من أن الحل الذي توصلت إليه يحل المشكلة تمامًا دون التسبب في مشاكل جديدة أو تراجعات في أي مكان آخر من التطبيق.