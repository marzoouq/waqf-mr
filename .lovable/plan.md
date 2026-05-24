# تقرير تدقيق معماري شامل — قراءة فقط (لا تعديلات مقترحة في الكود)

> ملاحظة: هذا تقرير تقييمي خالص لا يتضمّن أي خطوة كتابة. عند الموافقة على الانتقال إلى Build، يُمكن استخراج بنود الإصلاح من القسم 7 إلى خطة تنفيذ منفصلة.

## 1) خريطة البنية كما هي فعليًا

```text
src/
├── app/          (providers, router, root-layout)         — نقطة تركيب
├── routes/       (admin/beneficiary/waqif/publicRoutes)   — حراس + lazy
├── pages/        (~70 صفحة)                                — رقيقة، تستهلك Page Hook
├── components/   (~30 مجلد ميزة + ui/ + shared/ + common/) — عرضية
├── contexts/     (Auth, FiscalYear, Contracts)            — 3 فقط ✓
├── hooks/
│   ├── auth/        (session/role/biometric/flows)
│   ├── data/    (129 ملف)   — Supabase خام + useQuery
│   ├── domain/  (16 ملف)    — حسابات أعمال خالصة فوق data
│   ├── page/    (91 ملف)    — تنسيق صفحة (orchestration)
│   ├── application/ (13)    — controllers عابرة للأدوار
│   └── ui/                  — hooks عرضية بحتة
├── lib/          (stateful: supabase, queryClient, notify, services, monitoring)
├── utils/        (pure: format, financial, pdf, export, validation, fiscalYear)
├── constants/    — جداول ثابتة + roles + routeRegistry
├── types/        — barrel موحّد + sub-barrels
└── integrations/supabase/ (محمي — لا يُلمس)

supabase/
├── functions/ (20 وظيفة، _shared للمصادقة والـCORS)
└── migrations/ (321 ملف)
```

## 2) الحكم العام

البنية **ناضجة ومنضبطة بدرجة عالية** وتتبع فعليًا الطبقات الموثّقة في الذاكرة (Page Hook Pattern, lib vs utils, Hooks Layering). الفحص التلقائي يُظهر:

| فحص | النتيجة |
|---|---|
| `console.*` في الكود المنتج | **0** انتهاك |
| `supabase` المستورد في `src/pages/` | **0** |
| `supabase` المستورد في `src/components/` | **0** (المطابقات السابقة كانت إيجابيات كاذبة لـ `Array.from`/`DateRange.from`) |
| `supabase` المستورد في `src/utils/` | **0** |
| `sonner` المستورد في `src/utils/` | **0** |
| ألوان hex داخل المكونات | **1 فقط** (`InvoicePreviewDialog` لـ Canvas — مسموح بقاعدة المشروع) |
| `useState` في `pages/` | **0** |
| `useQuery` في `pages/` أو `components/` | **0** |
| فحوصات الأدوار خارج `hooks/auth` | **0** (المطابقات في `types.ts` و`lib/auth/fetchUserRole.ts` شرعية) |
| Edge functions تستخدم `getSession()` | **0** (المطابقة الوحيدة في README) |
| ملفات > 200 سطر | **5 فقط** من ~700 ملف منتج |

النتيجة: لا توجد مخالفات فادحة (P0) لقواعد المعمارية في الكود الحالي.

## 3) منطق في غير مكانه (Misplaced Logic)

العناصر المرصودة جميعها صغيرة (P2/P3):

| # | الموقع | المشكلة | التصنيف |
|---|---|---|---|
| M1 | `src/components/beneficiary/disclosure/DisclosureContractsSection.tsx` | حسابات مالية داخل مكوّن عرض (يُفضّل نقلها إلى `hooks/domain/` أو `utils/financial/`) | P2 |
| M2 | `src/components/invoices/invoiceTemplateUtils.ts` + `templates/ProfessionalTotals.tsx` | منطق حساب إجماليات داخل مجلد components بدل `utils/financial/` | P2 |
| M3 | `src/components/contracts/accrual/accrualUtils.ts` | ملف utils مدفون داخل مجلد components (انتهاك حدود — رغم نقاوته) | P2 |
| M4 | `src/pages/dashboard/ContractsPage.tsx` يستورد `canModifyFiscalYear` من `@/utils/auth/permissions` | منطق تخويل في utils — يجب توحيده داخل `hooks/auth/` أو `lib/auth/` لإغلاق المصدر الموحّد للأدوار | P2 |

> الإيجابيات الكاذبة: مطابقات `supabase.rpc/from` في 14 مكوّن (مثل `MobileCardView`, `TablePagination`, `RecentContractsCard`) تبيّن بعد التحقق أنها `Array.from` / `DateRange.from`. **لا توجد** مكونات تستدعي Supabase مباشرة.

## 4) فصل المسؤوليات

| الطبقة | الالتزام | ملاحظات |
|---|---|---|
| UI ↔ Data | ممتاز | كل صفحة تستهلك Page Hook واحد، لا useQuery في الصفحات/المكونات |
| Data ↔ Domain | جيد | 129 data hook مقابل 16 domain فقط — قد يدلّ على أن بعض الحسابات لا تزال داخل Page Hooks بدلاً من رفعها إلى `domain/` |
| Auth/RBAC | جيد | `hooks/auth/` مقسّم بشكل سليم؛ ملف `utils/auth/permissions.ts` هو الاستثناء الوحيد (M4) |
| Validation | جيد | `utils/validation/` نقي |
| Business rules | جيد | معظمها في `utils/financial/` (contractAllocation, distribution, accrual) وبعضها domain hooks |

## 5) الاقتران والتبعيات

- **لا تبعيات دائرية مرصودة** بين barrels (تمّ التحقق من `src/types`, `src/hooks`, `src/lib`).
- `ContractsContext` + `ContractsContextValue` + `useContractsContext` مُقسّمة بشكل سليم لتفادي حلقات الـHMR.
- 91 ملف داخل `hooks/page/` — رقم كبير لكنه طبيعي لـ ~70 صفحة. لا يوجد توحّد ضدّ Page Hook Pattern.
- 321 ملف migration: تاريخ طويل وصحّي؛ لم نلاحظ migrations حديثة تكتب roles خارج `user_roles`.

## 6) أكبر الملفات (Hotspots للمراجعة المستقبلية)

| الملف | الأسطر | ملاحظة |
|---|---|---|
| `utils/pdf/reports/forensicAudit.ts` | 238 | PDF — استثناء طبيعي |
| `utils/pdf/reports/comprehensiveBeneficiaryTables.ts` | 213 | PDF — استثناء |
| `utils/export/printDistributionReport.ts` | 213 | استثناء |
| `utils/export/xlsx.ts` | 205 | حدّي |
| `hooks/application/useAiChat.ts` | 197 | قابل للتقسيم لاحقًا |
| `hooks/page/admin/management/useZatcaSettings.ts` | 195 | حدّي |
| `components/contracts/contract-form/ContractRentalModeSection.tsx` | 195 | حدّي — مكوّن نموذج |
| `components/contracts/MonthlyAccrualTable.tsx` | 193 | جدول معقّد |
| `hooks/page/admin/financial/useInvoicesPage.ts` | 191 | حدّي |
| `hooks/page/admin/financial/useAccountsPage.ts` | 188 | حدّي |
| `components/pwa/PwaUpdateNotifier.tsx` | 188 | يجمع UI + service worker logic |

## 7) توصيات مرتّبة (للنقاش — لا تنفيذ)

### P1 (تنظيم حدود)
- **R1**: نقل `utils/auth/permissions.ts` إلى `lib/auth/` لإلغاء الحاجة لاستيراد منطق صلاحيات من utils في الصفحات. (M4)
- **R2**: نقل `components/contracts/accrual/accrualUtils.ts` إلى `utils/financial/accrual/`. (M3)
- **R3**: استخراج الحسابات من `DisclosureContractsSection` و`invoiceTemplateUtils` إلى `utils/financial/` أو `hooks/domain/`. (M1, M2)

### P2 (نضج معماري)
- **R4**: مراجعة Page Hooks الكبيرة (>180 سطر) لاستخراج حسابات الأعمال إلى `hooks/domain/` (نسبة domain:data منخفضة 16:129).
- **R5**: تقسيم `useAiChat.ts` (197 سطر) إلى hook مزامنة + hook عرض.
- **R6**: فصل `PwaUpdateNotifier` إلى hook منطقي + مكوّن عرض.

### P3 (نظافة)
- **R7**: تثبيت قاعدة ESLint تمنع `supabase`/`sonner` داخل `src/utils/` و`src/components/` (تأمين الحالة الجيدة الحالية من الانحراف).
- **R8**: تثبيت قاعدة ESLint تمنع `useQuery`/`useMutation` داخل `src/pages/` و`src/components/`.
- **R9**: تثبيت حدّ ESLint للملف ≤200 سطر مع استثناءات لمجلدات `utils/pdf`, `utils/export`.

## 8) ما يجب **عدم** تغييره

- بنية `hooks/{auth, data, domain, page, application, ui}` — تعكس بدقّة Hooks Layering المعتمدة.
- 3 contexts فقط (Auth, FiscalYear, Contracts) — لا تضخّم.
- `verify_jwt = false` المتعمّد + `getUser()` يدويًا في Edge Functions.
- جدار `integrations/supabase/{client,types}.ts` + `config.toml`.

## 9) خلاصة المخاطر

| الفئة | الحالة |
|---|---|
| أمنية (RLS / Roles / Edge auth) | لا مشاكل مرصودة في الكود الحاضر |
| مالية (تسرّب حسابات إلى UI) | منخفضة جدًا — 3 حالات صغيرة فقط |
| تقنية (اقتران / حلقات) | لا حلقات مرصودة |
| صيانة (ملفات ضخمة) | محدودة — 5 ملفات فقط فوق 200 سطر |

**الحكم النهائي**: المستودع في حالة معمارية صحّية. التوصيات أعلاه تحسينات تجميل/تصلّب لا إصلاحات حرجة. لا حاجة لأي تعديل قسري؛ تنفيذ R1–R3 (P1) كافٍ لإغلاق آخر الفجوات الحقيقية.
