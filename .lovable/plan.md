
# Version I-R — خطة مصححة جنائيًا (Evidence-Based)

نطاق هذه الخطة: **refactor معماري داخلي فقط**. لا تغييرات على عقود API، RLS، schema، أو UX.  
هذه نسخة مُصححة من Version I بعد تدقيق المراجع الخارجي + تحقق مباشر بأوامر `rg`/`wc` على الكود.

---

## الأرقام المُتحقَّق منها مباشرة (read-only)

| المقياس | القيمة المُؤكَّدة الآن |
|---|---|
| ملفات `hooks/data/**` تستورد client Supabase | **58** ✅ |
| ملفات `hooks/data/**` تستدعي `supabase.from(` | **12** (≠ 13 من Version I) |
| إجمالي استدعاءات `supabase.from(` في hooks/data | **20** (≠ 22 من Version I) |
| Edge Functions الفعلية | **18** (≠ 19 من Version I) |
| Edge Functions تستورد `_shared/auth` | **4** (admin-manage-users, generate-invoice-pdf, check-contract-expiry, process-email-queue) |
| `src/App.tsx` | **116 سطر** ✅ |
| `src/contexts/FiscalYearContext.tsx` | **130 سطر** ✅ |
| `src/pages/waqif/` | **غير موجود** — يلزم إنشاؤه |
| `pages/beneficiary/WaqifDashboard.tsx` + `.test.tsx` | موجودان ✅ |

**ما لم نعد ندّعيه**: لا "5/19"، لا "≥15/19"، لا "10 functions على الأقل" كأهداف رقمية إلزامية.

---

## فلسفة التصحيح

اعتراضات المراجع الخارجي المقبولة:
1. **`hooks/data` يُسمح لها رسميًا** باستهلاك Supabase حسب `src/hooks/README.md`. لذلك هدف "≤5 imports" ليس إصلاح drift بل **تغيير سياسة معمارية**. لا نفرضه قبل تحديث الوثائق رسميًا.
2. **Edge Functions ليست متجانسة**: webhook, anon public, mixed dispatcher, service-role hybrid. ترحيل دفعة واحدة خطر. نُرحّل فقط ما يمكن توحيده فعلًا.
3. **الأرقام التعسفية** (`≤40 سطر` لـ App.tsx) ليست هدفًا هندسيًا. الهدف هو **فصل المسؤوليات**.
4. **نقل `useDashboardPrefetch` خارج Provider** غير مثبت كأفضل حل — يبقى داخل provider كـ hook منفصل.

---

## التقسيم الجديد: 3 مستويات حسب المخاطر

### المستوى 1 — آمن ومباشر (يُنفَّذ أولًا)

#### M1.1 — تفكيك `src/App.tsx` (116 سطر)
- `src/app/providers.tsx` — `ErrorBoundary`, `ThemeProvider`, `QueryClientProvider`, `AuthProvider`, `FiscalYearProvider`, `TooltipProvider`, `Sonner`.
- `src/app/router.tsx` — `createBrowserRouter` + composition.
- `src/app/root-layout.tsx` — `RootLayout` + `PagePerformanceTracker` + `RoleGatedAiAssistant`.
- `src/App.tsx` يبقى entry point مختصر.
- **معيار النجاح**: فصل المسؤوليات، وليس عدد سطور محدد.

#### M1.2 — تفكيك `FiscalYearContext.tsx` (130 سطر)
- `src/hooks/auth/useFiscalYearPersistence.ts` — sessionStorage hydration/cleanup.
- `src/hooks/auth/useResolvedFiscalYear.ts` — role-aware resolution.
- `useDashboardPrefetch` **يبقى داخل Provider** (لا يُنقَل لـ root layout — اعتراض المراجع مقبول).
- Provider يصبح composition خفيف.

#### M1.3 — نقل `WaqifDashboard` إلى domain صحيح
- إنشاء `src/pages/waqif/`.
- نقل `WaqifDashboard.tsx` + `WaqifDashboard.test.tsx` معًا.
- **re-export سطر واحد** من الموقع القديم لفترة انتقالية.
- تحديث `src/routes/waqifRoutes.tsx`.
- إزالة جملة "لأسباب تاريخية" من `README.md`.

#### M1.4 — تحديث الوثائق لتعكس الواقع
- `src/hooks/README.md` — توضيح متى يُسمح بـ `supabase.from` في `hooks/data` ومتى يُفضّل تمرير عبر `lib/services/`.
- `supabase/functions/README.md` — توثيق الأنماط المختلفة (JWT, anon, webhook, service-role) كأنماط مشروعة.

**0 تغيير على schema/RLS/types/client/config.toml. 0 تغيير على عقود API.**

---

### المستوى 2 — متوسط المخاطر (يُنفَّذ بعد M1، تدريجيًا)

#### M2.1 — استخراج خدمات للـ 12 hook المثبتة (تدريجي، PR صغيرة)
الـ 12 ملف المُثبَتة بالاسم:
- Financial: `useIncome.ts`, `useExpenses.ts`
- Properties: `useUnits.ts`
- Invoices: `useInvoices.ts`
- Settings: `useAppSettingsRead.ts`, `useAppSettingsWrite.ts`
- Notifications: `useNotificationActions.ts`
- Messaging: `useMessaging.ts`
- Support: `useSupportTicketMutations.ts`
- Content: `useAnnualReport.ts`
- ZATCA: `useZatcaInvoices.ts`, `useZatcaOnboardingReadiness.ts`

**القاعدة**: لا نُنشئ خدمة إلا حين تُستخدم في hook فعلي. لا overdesign.

**الترتيب المقترح حسب الفائدة**:
1. `incomeService` + `expensesService` (تكرار منطق fiscal year filtering).
2. `invoicesService` (يربط مع `invoiceStorageService` الموجود).
3. `appSettingsService` (يدمج Read + Write).
4. `notificationsService`, `messagingService`, `supportService` (مجموعة واحدة).
5. `zatcaInvoicesService` + extension لـ `zatcaService` الموجود.
6. `unitsService`, `annualReportService` (آخرها).

**شرط القبول لكل PR**:
- نفس `queryKey` بالحرف الواحد (لمنع كسر cache invalidation).
- نفس بنية البيانات المُرجعة.
- لا تغيير على signature الـ hook.

#### M2.2 — توسيع `createCrudFactory` بـ `customQuery` **فقط إن ظهرت حاجة فعلية** أثناء M2.1
لا نوسّع spec بشكل استباقي.

---

### المستوى 3 — عالي المخاطر (يُنفَّذ بعد inventory أدق)

#### M3.1 — Inventory دقيق لـ Edge Functions auth
قبل أي ترحيل، تصنيف الـ 18 function إلى 5 فئات:

| الفئة | الـ Functions | استراتيجية الترحيل |
|---|---|---|
| **A** — JWT-protected متجانسة | beneficiary-summary, dashboard-summary, email-admin | **مرشّحة للترحيل** عبر `authenticate({ requiredRole? })` |
| **B** — ZATCA cluster | zatca-onboard, zatca-renew, zatca-report, zatca-signer, zatca-xml-generator | **ترحيل بعد فحص** كل واحدة على حدة (قد تحتاج params مختلفة) |
| **C** — Mixed dispatcher | webauthn (auth-options/verify + register-options/verify) | **لا تُرحَّل قسرًا** — يبقى dispatcher ويستخدم helpers انتقائيًا |
| **D** — Public/anon مقصودة | guard-signup, lookup-national-id, health-check | **لا تُرحَّل** — تبقى مع تعليق `// intentionally bypasses _shared/auth: <reason>` |
| **E** — Hybrid/special | auth-email-hook (HMAC webhook), check-contract-expiry (service-role + admin), process-email-queue (verify_jwt=true), ai-assistant (streaming), admin-manage-users + generate-invoice-pdf (مُرحَّلة بالفعل) | **بحالها** — تستخدم `_shared/auth` بشكل انتقائي حسب الحاجة |

**الهدف الواقعي**: الفئة A (3 functions) + الفئة B بعد فحص (حتى 5 إضافية) = **حد أقصى 8 functions جديدة تستخدم `_shared/auth`**، بدلًا من ادعاء "15/19" غير المُبرَّر.

#### M3.2 — توسيع `_shared/auth.ts` بحذر
إضافة خيار `consumeBody: false` (أو تصميم helper يقرأ headers فقط) **قبل** المساس بـ `ai-assistant`.

#### M3.3 — توحيد CORS
سياسة موثقة: "افتراضيًا `_shared/cors.ts`، أي استثناء يجب أن يحمل تعليق سبب".  
لا فرض قسري على functions ذات Origin policy خاصة.

#### M3.4 — حواجز ESLint **فقط بعد** اكتمال M2 + M3
- `no-restricted-imports` لـ `@/integrations/supabase/client` خارج `lib/`, `integrations/`, `contexts/AuthContext.tsx`, **و `hooks/data/` (مع allowlist موثقة للـ 12 ملف المتبقية إن لم تُرحَّل كلها)**.
- لا نضيف rules تكسر الـ build قبل refactor الكافي.

---

## معايير القبول النهائية (مُصححة، بدون أرقام تعسفية)

### M1 (آمن — يجب اكتماله)
- ✅ `src/App.tsx` مفكَّك إلى providers/router/root-layout (حجم نهائي غير مهم — المهم الفصل).
- ✅ `FiscalYearContext.tsx` مفكَّك مع بقاء prefetch داخل Provider.
- ✅ `WaqifDashboard.tsx` + `.test.tsx` في `pages/waqif/`، re-export في الموقع القديم.
- ✅ `README.md` و`hooks/README.md` و`functions/README.md` محدّثة.
- ✅ `bun run build` ناجح، اختبارات موجودة تمر.

### M2 (متوسط — تدريجي PR-by-PR)
- ✅ كل PR يُرحّل hook واحد أو مجموعة صغيرة بنفس `queryKey` بالحرف.
- ✅ لا تغيير على signatures.
- ✅ عدد ملفات `hooks/data` التي تستدعي `supabase.from(` ينخفض **تدريجيًا** من 12 (لا هدف رقمي إلزامي).

### M3 (عالي — اختياري ومتدرج)
- ✅ Inventory موثق في `docs/api/edge-functions.md`.
- ✅ ترحيل **فقط** الفئة A بعد PoC ناجح.
- ✅ لا ترحيل للفئة C/D/E.
- ✅ لا تغيير على شكل الخطأ المُرجَع (`{ error, status }`, messages, status codes).

---

## المخاطر المُؤكَّدة وتخفيفاتها

| الخطر | التخفيف |
|---|---|
| كسر cache invalidation أثناء M2 | **الإبقاء على `queryKey` بالحرف الواحد** (ميزة خاصة من Version I محفوظة). |
| كسر streaming في `ai-assistant` (M3) | تصميم helper بدون استهلاك body؛ اختبار PoC قبل المساس بـ ai-assistant. |
| تغيير شكل الخطأ المُستهلَك من frontend (M3) | الحفاظ على نفس `{ error, status }` + نفس messages + نفس status codes. |
| كسر روابط `WaqifDashboard` (M1.3) | re-export سطر واحد + نقل test معًا في نفس PR. |
| ESLint rules تكسر build قبل refactor كاف | rules تُضاف **بعد** M2، مع allowlist للملفات غير المُرحَّلة. |

**0 تغيير على**: `supabase/config.toml`, `client.ts`, `types.ts`, `.env`, RLS, schema, عقود API.

---

## ترتيب التنفيذ (PRs)

| PR | المحتوى | المستوى |
|---|---|---|
| **PR-1** | M1.1 — تفكيك `App.tsx` | آمن |
| **PR-2** | M1.2 — تفكيك `FiscalYearContext.tsx` | آمن |
| **PR-3** | M1.3 — نقل `WaqifDashboard` + re-export | آمن |
| **PR-4** | M1.4 — تحديث docs | آمن |
| **PR-5..N** | M2.1 — ترحيل hooks، PR صغير لكل مجموعة | متوسط |
| **PR-X** | M3.1 — Inventory موثق فقط (لا كود) | بحث |
| **PR-X+1** | M3.2 — توسيع `_shared/auth.ts` + PoC على function واحدة من الفئة A | عالي |
| **PR-X+2..** | ترحيل بقية الفئة A + الفئة B بعد فحص | عالي |
| **PR-أخير** | حواجز ESLint بعد اكتمال M2 + M3 | آمن (بعد ما سبق) |

---

## ما حُذف من Version I بعد التدقيق

- ❌ هدف "ملفات `hooks/data` تستورد supabase ≤ 5" — غير متسق مع README الحالي.
- ❌ هدف "Edge Functions تستخدم `_shared/auth` ≥ 15/19" — مبالغ فيه ومخاطره أعلى من فائدته.
- ❌ هدف "App.tsx ≤ 40 سطر" — رقم تعسفي بدون قيمة هندسية.
- ❌ هدف "FiscalYearContext.tsx ≤ 50 سطر" — نفس السبب.
- ❌ نقل `useDashboardPrefetch` خارج Provider — غير مثبت كأفضل حل.
- ❌ ترحيل 14 Edge Function دفعة واحدة — مخاطر عالية بلا مبرر.
- ❌ توسيع `createCrudFactory` بـ `customQuery` استباقيًا — يُضاف فقط عند الحاجة الفعلية.
- ❌ إنشاء قائمة طويلة من الخدمات دفعة واحدة — استبدلت بنهج "خدمة عند الحاجة".

