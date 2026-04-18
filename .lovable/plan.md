
## التدقيق المعماري الشامل — تقرير ما بعد موجة P0

### الحالة العامة: ممتازة ✅
المعمارية v7 محترمة بشكل شبه كامل. التحسينات السابقة (P0 hooks, P3 docs, refactors) أعطت نتائج ملموسة.

### المؤشرات الإيجابية
| المؤشر | الحالة |
|--------|--------|
| `console.*` خارج logger | **0** ✅ |
| `utils/` يستورد `sonner`/`supabase` | **0** ✅ (الذكر الوحيد في README كمثال) |
| Pages تستورد supabase مباشرة | **0** ✅ |
| Components تستورد supabase مباشرة | **0** ✅ |
| `toast` مباشر خارج `lib/notify` | **0** ✅ |
| TODO/FIXME/HACK | **1** فقط |
| استخدامات `any` خام | **3** فقط |

### الانتهاكات المتبقية (مرتبة بالأولوية)

#### 🔴 P0 — أخطاء حرجة

**1. `lib/realtime/bfcacheSafeChannel.ts:22` — `Math.random()` في render**
```ts
const instanceIdRef = useRef(`i${Math.random().toString(36).slice(2, 10)}`);
```
React Compiler يرفضها (impure). الحل: `useRef<string|null>(null)` ثم تعيين lazy في first render أو `crypto.randomUUID()` داخل `useState(() => ...)`.

**2. `useBeneficiaryMessages.ts:45,55,72` — `preserve-manual-memoization` (×4)**
useCallback dependencies غير متطابقة مع inferred deps من Compiler — `setSelectedConv`, `setActiveTab`, `setChatDialogOpen`, `setChatSubject` مفقودة. الحل: إضافتها أو إزالة `useCallback` (Compiler سيحسّن تلقائياً).

#### 🟠 P1 — انتهاكات معمارية

**3. تبعية معكوسة: page hooks تستدعي `supabase` مباشرة**
- `hooks/page/beneficiary/dashboard/useBeneficiaryDashboardData.ts:110` → `supabase.rpc('get_beneficiary_dashboard')`
- يجب نقل الاستدعاء إلى `hooks/data/` (مثل `useBeneficiaryDashboardRpc`) ثم استهلاكه من page hook.

**4. `set-state-in-effect` متبقية (5 أخطاء + 16 effect issues)**
ملفات: `DashboardLayout.tsx` (8 مواضع)، `OverdueTenantsReport.tsx`، `TicketDetailDialog.tsx`، `SlaIndicator.tsx`، `FiscalYearWidget.tsx`، `VirtualTable.tsx`، `PaymentInvoiceDesktopTable.tsx` (5 مواضع).

**5. `eqeqeq` (5 مواضع)**
`==` بدلاً من `===` — إصلاح آلي تقريباً.

**6. `react-refresh/only-export-components` (9 تحذيرات)**
ملفات تصدّر مكونات + ثوابت/types معاً → يكسر HMR. الحل: نقل non-component exports إلى ملف منفصل.

#### 🟡 P2 — تحسينات هيكلية

**7. `useAppSettings.ts` (220 سطر) — مرشح للتقسيم**
يخلط: read query + write mutations + cache management + category logic + WaqfInfo helpers.
**اقتراح**: 
- `useAppSettings.ts` (read-only)
- `useUpdateSettings.ts` (mutations)
- `utils/settings/category.ts` (`getCategoryFromKey` pure)
- `useWaqfInfo.ts` (helper مستقل)

**8. `ReportsPage.tsx` (220 سطر)** — يحتوي عدد كبير من lazy imports + tab orchestration. مرشح لاستخراج `useReportsTabs()` + مكوّن `ReportsTabsRenderer`.

**9. `useCrudFactory.ts` (208 سطر)** — معقد لكن مبرر (factory مركزي). تركه كما هو، فقط إضافة JSDoc أكثر.

#### 🟢 P3 — تحسينات اختيارية

**10. `lib/lazyWithRetry.ts:24` — متغير غير مستخدم `_`** — حذف بسيط.

**11. `lib/realtime/bfcacheSafeChannel.ts:57,74` — set-state-in-effect إضافية** — معالجة مع البند #1.

**12. `viewHelper.ts:14,16` — `any` غير مبرر + توجيه eslint-disable غير مستخدم** — تنظيف.

**13. `useRetryQueries.ts:11`, `useMessaging.ts:33,92`, `useAccountsSettings.ts:56`, `useContractsPage.ts:41`, `useBeneficiaryDashboardPage.ts:47-50`, `useBeneficiaryFinancials.ts:40`** — تحذيرات effects/refs/purity متفرقة.

### خارطة الطريق المقترحة (مرتّبة)

| # | الإجراء | الأولوية | الجهد |
|---|---------|----------|-------|
| 1 | إصلاح `bfcacheSafeChannel.ts` (`Math.random` + 2 effects) | 🔴 P0 | XS |
| 2 | إصلاح 4 أخطاء `preserve-manual-memoization` في `useBeneficiaryMessages.ts` | 🔴 P0 | XS |
| 3 | نقل `get_beneficiary_dashboard` RPC من page hook إلى data hook جديد | 🟠 P1 | S |
| 4 | إصلاح 5 أخطاء `eqeqeq` | 🟠 P1 | XS |
| 5 | إصلاح موجة `set-state-in-effect` المتبقية (`DashboardLayout` وغيره) | 🟠 P1 | M |
| 6 | معالجة 9 تحذيرات `react-refresh/only-export-components` | 🟠 P1 | S |
| 7 | تقسيم `useAppSettings.ts` لـ read/write/utils | 🟡 P2 | S |
| 8 | استخراج `useReportsTabs` من `ReportsPage.tsx` | 🟡 P2 | S |
| 9 | تنظيف `viewHelper.ts` + `lazyWithRetry.ts` (تحذيرات بسيطة) | 🟢 P3 | XS |
| 10 | إصلاح التحذيرات المتفرقة (effects/refs) | 🟢 P3 | M |

### توصية المسار التالي
البدء بـ **#1 + #2** (P0 — حماية runtime + توافق React Compiler) ثم **#3** (انتهاك معماري واضح). هذه الثلاثة معاً تستحق موجة واحدة قصيرة قبل الانتقال لـ P1.

### ملاحظات إيجابية
- لا انتهاكات للحدود الأمنية (RLS, auth files, types.ts)
- الفصل بين `lib/` و `utils/` نظيف 100%
- نمط Page Hook مطبق بشكل ممتاز (استثناء واحد فقط: البند #3)
- الاختبارات co-located بكثافة عالية (الملفات الكبرى في القائمة هي اختبارات، إشارة صحية)
