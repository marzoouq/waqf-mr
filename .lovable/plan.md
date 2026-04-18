

## التدقيق الجنائي العميق — تقرير ما بعد موجة P0 (الجولة الثالثة)

### الحالة العامة: ممتازة ✅
البنية v7 صلبة. مقارنة بالتدقيق السابق: **#3 (RPC نقل) أُنجز** ✅ — لكن `useMySharePage.ts` ما زال يستورد supabase. الباقي ثابت.

### المؤشرات الكمية (مُحدّثة)
| المؤشر | القيمة | الحالة |
|--------|--------|--------|
| إجمالي مشاكل ESLint | **53** (34 خطأ + 19 تحذير) | ⚠️ |
| `react-hooks/refs` | **14** (10 منها في DashboardLayout) | 🔴 P0 |
| `react-hooks/purity` (Date.now/Math.random) | **10** | 🔴 P0 |
| `react-hooks/static-components` | **4** (PaymentInvoiceDesktopTable) | 🔴 P0 |
| `react-hooks/incompatible-library` | **1** (VirtualTable — react-virtual) | 🟡 معلوماتي |
| `react-hooks/preserve-manual-memoization` | **1** (useBeneficiaryFinancials) | 🟠 P1 |
| `eqeqeq` | **5** | 🟠 P1 |
| `react-refresh/only-export-components` | **9** | 🟠 P1 |
| `exhaustive-deps` | **1** (useAuditLogPage) | 🟠 P1 |
| Page hooks تستورد supabase مباشرة | **1** (`useMySharePage.ts`) | 🟠 P1 |
| `sonner` مباشر خارج lib/notify | **1** (`useAuthCleanup.ts` — `toast.dismiss()`) | 🟢 مبرر |
| `console.*` خارج logger | **0** | ✅ |
| `any` خام | **1** | ✅ |
| TODO/FIXME | **3** | ✅ |

---

### 🔴 الانتهاكات الحرجة (P0)

#### 1. `react-hooks/refs` — `ref.current = X` في render body (14 موضع)

**المصدر الرئيسي**: `DashboardLayout.tsx` يصل لـ `swipe.overlayRef`, `swipe.sidebarRef`, `swipe.handleTouchStart/Move/End`, `swipe.overlayOpacity`, `swipe.sidebarTranslateX` مباشرة في render. **التشخيص الفعلي**: `useSidebarSwipe` يُعيد refs مباشرة كقيم — Compiler يعتبر قراءة `.current` في render انتهاكاً.

**الحل**: إعادة هيكلة `useSidebarSwipe` ليُعيد:
- `overlayProps`, `sidebarProps` (objects تحوي ref + handlers + style مُحسوب)
- بدلاً من تعريض refs خام للـ caller

**أنماط أخرى**:
- `useRetryQueries.ts:11` — `keysRef.current = queryKeys` → استبدل بـ `useEffect`
- `useMessaging.ts:33,92` — نمط `queryClientRef.current = queryClient` (مرتين) → استخراج `useStableRef(value)` helper
- `useAccountsSettings.ts:56` — `updateSettingRef.current = ...` → نفس النمط

#### 2. `react-hooks/purity` — `Date.now()` في render (10 مواضع)

كلها داخل `useMemo` لكن **dep array لا يحوي قيمة زمنية** → Compiler يعتبره impure. ملفات:
- `SlaIndicator.tsx:13`, `TicketDetailDialog.tsx:43`, `OverdueTenantsReport.tsx:33`, `ZatcaHealthPanel.tsx:31`, `FiscalYearWidget.tsx:62`, `useContractsPage.ts:41`, `useBeneficiaryDashboardPage.ts:47-50` (×3)
- `sidebar.tsx:536` — `Math.random()` في skeleton

**أنماط الحل**:
- **عرض زمني (SLA, overdue)**: `useState(() => Date.now())` + `useEffect` بـ `setInterval` كل دقيقة
- **حساب لحظي one-shot**: نقل لـ `useEffect` يُحدّث state
- **sidebar skeleton**: استخدم `useId()` + hash بدل `Math.random()`

#### 3. `react-hooks/static-components` — `SortIcon` داخل `PaymentInvoiceDesktopTable` (4 مواضع)

تعريف مكوّن داخل المكوّن الأب → state reset كل render. **الحل**: نقل خارج المكوّن، تمرير props.

---

### 🟠 الانتهاكات المعمارية (P1)

#### 4. `useMySharePage.ts` يستورد supabase مباشرة
استدعاء `supabase.from('contracts').select(...)` في `fetchContracts` (lazy للـ PDF). **الحل**: استخراج لـ `hooks/data/contracts/useContractsForPdf.ts` يُعيد `fetchContractsByFY(fyId)` async function.

#### 5. `useBeneficiaryFinancials.ts:40` — `preserve-manual-memoization`
Compiler يفشل بتحسين useMemo. الحل: مراجعة deps أو إزالة manual memo.

#### 6. 5 أخطاء `eqeqeq`
- `useAccountsSettings.ts:97` — `appSettings.data?.['x'] == null` (×2) — هذا **مقصود** للتحقق من null+undefined معاً → إصلاح ليكون `=== null || === undefined` أو `eslint-disable-next-line` مع تبرير
- `useAdminDashboardData.ts:59` — نفس النمط (×3)

#### 7. 9 تحذيرات `react-refresh/only-export-components`
`AccrualHelpers.tsx`, `AccordionParts.tsx`, `OverdueRow.tsx`, `ContractsContext.tsx`. الحل: استخراج constants/hooks/types لملف منفصل.

#### 8. `useAuditLogPage.ts:39` — `exhaustive-deps`
useCallback dep يحوي logical expression متغيرة → مراجعة dep array.

---

### 🟡 ملاحظات مبررة (لا تعديل)

- **`useAuthCleanup.ts` يستورد `sonner`** — لـ `toast.dismiss()` فقط. مبرر لأن `lib/notify` يلف `toast` لكن لا يصدّر `dismiss`. **توصية**: إضافة `notify.dismissAll()` في `lib/notify` ثم تنظيف هذا الملف.
- **`VirtualTable.tsx:91` — `incompatible-library`** — `@tanstack/react-virtual` غير متوافق مع Compiler. لا حل من جانبنا، انتظر تحديث المكتبة.
- **`useAccountsSettings.ts:97` `== null`** — نمط TS صحيح للـ nullish check؛ يحتاج تبرير eslint-disable.

---

### 🟡 تحسينات هيكلية (P2) — بدون تغيير من السابق

- `useAppSettings.ts` (220) → split لـ read/write/utils + `useWaqfInfo`
- `useMessaging.ts` (185) → استخراج `useStableQueryClient` يحل البنود ref تلقائياً
- `DashboardLayout.tsx` (162) → جزء من إصلاح #1
- `ReportsPage.tsx` (220) → استخراج `useReportsTabs`

---

### 🟢 P3 — تنظيفات بسيطة
- `lazyWithRetry.ts:24` — حذف `_` غير مستخدم
- `viewHelper.ts:14,16` — `any` + توجيه مهجور
- 4 توجيهات `eslint-disable` مهجورة في `FiscalYearContext`, `ContractsContext`, `useBeneficiaryDashboardPage`

---

### خارطة الطريق المقترحة (مرتّبة بالأثر/الجهد)

| # | الإجراء | الأولوية | الجهد | الأثر |
|---|---------|----------|-------|-------|
| 1 | استخراج `useStableRef<T>(value)` في `lib/hooks` + استبداله في `useRetryQueries`, `useMessaging` (×2), `useAccountsSettings`, `useBeneficiaryDashboardPage` | 🔴 P0 | S | يحل 5 من 14 خطأ ref |
| 2 | إعادة هيكلة `useSidebarSwipe` ليُعيد `overlayProps`/`sidebarProps` بدل refs خام | 🔴 P0 | M | يحل 10 أخطاء refs في DashboardLayout |
| 3 | إصلاح 10 أخطاء `purity`: نمط ساعة (`useState+useInterval` للـ SLA/overdue، `useEffect→setState` للحسابات اللحظية، `useId()` لـ sidebar skeleton) | 🔴 P0 | S | توافق Compiler |
| 4 | نقل `SortIcon` خارج `PaymentInvoiceDesktopTable` | 🔴 P0 | XS | أداء |
| 5 | استخراج `fetchContracts` من `useMySharePage` لـ `hooks/data/contracts/useContractsForPdf.ts` | 🟠 P1 | S | التزام v7 |
| 6 | إضافة `notify.dismissAll()` في `lib/notify` + تنظيف `useAuthCleanup` | 🟠 P1 | XS | إغلاق نقطة sonner مباشرة |
| 7 | إصلاح 5 أخطاء `eqeqeq` (تحويل لـ `=== null \|\| === undefined`) | 🟠 P1 | XS | best practice |
| 8 | حل 9 تحذيرات `react-refresh` (استخراج constants/types) | 🟠 P1 | S | تحسين HMR |
| 9 | تقسيم `useAppSettings.ts` لـ read/write/utils + `useWaqfInfo` | 🟡 P2 | S | فصل اهتمامات |
| 10 | تنظيف `lazyWithRetry`, `viewHelper`, و 4 توجيهات eslint-disable مهجورة | 🟢 P3 | XS | نظافة |

---

### توصية المسار التالي
**موجة واحدة P0 ثلاثية**: #1 → #2 → #4 → #3 (بهذا الترتيب تحديداً، لأن #1 ينشئ helper يستفيد منه #2). متوقع: من **34 خطأ → 5 أخطاء** (يبقى فقط incompatible-library + memoization). ثم #5 يُنهي انتهاك v7 الوحيد المتبقي.

### ملاحظات إيجابية ثابتة
- ✅ صفر انتهاكات أمنية (RLS, auth files, types)
- ✅ صفر `console.*` خارج logger
- ✅ صفر supabase في pages/components
- ✅ Page Hook Pattern مطبق 99% (انتهاك #5 فقط)
- ✅ `lib/` vs `utils/` فصل نظيف 100%
- ✅ موجة P0 السابقة (bfcache + RPC + memoization) ثابتة بدون انحدار
