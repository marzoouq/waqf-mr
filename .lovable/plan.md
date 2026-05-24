## النطاق
إصلاح جميع أخطاء ESLint الـ22 (React 19 Compiler) لإغلاق فشل `test.yml` على CI. لا تغيير في منطق الأعمال ولا في سلوك UX.

## تثبيت الأرقام (مُتحقَّق)

```
TOTAL ERRORS: 22
react-hooks/set-state-in-effect       : 16
react-hooks/refs                      : 3
react-hooks/purity                    : 2
react-hooks/preserve-manual-memoization: 1
```

## مرحلة 0 — جمع المرجع الكامل (إلزامية)

```bash
npx eslint src/ --format json > /tmp/eslint-report.json
```
نقرأ **الرسالة الكاملة** لكل خطأ — `preserve-manual-memoization` تخبرنا بالـ inferred vs declared deps.

## استراتيجيات الإصلاح

### أ) `set-state-in-effect` (16) — شجرة قرار، لا حل عام

1. **state مشتقّة بالكامل** → احذف الـ state واستبدلها بـ `useMemo` أو حساب مباشر.

2. **state قابلة للتحرير + مزامنة مع مصدر** → نمط **default + override** (مُعتمد في `useLandingStatsSettings`):
   ```ts
   const defaults = useMemo(() => fromSource(source), [source]);
   const [overrides, setOverrides] = useState<Partial<T>>({});
   const formData = useMemo(() => ({ ...defaults, ...overrides }), [defaults, overrides]);
   ```
   لتصفير `overrides` عند تغيّر سياق جوهري نستخدم **derived key reset** أثناء render:
   ```ts
   const [lastKey, setLastKey] = useState(currentKey);
   if (lastKey !== currentKey) { setLastKey(currentKey); setOverrides({}); }
   ```
   **بعد `save` ناجح** نُصفّر `overrides` (إن كان refetch مضموناً يُعيد القيم الصحيحة):
   ```ts
   await updateSettingsBatch.mutateAsync(rows);
   setOverrides({});
   ```

3. **مزامنة مع نظام خارجي** (matchMedia, idle, storage) → `useSyncExternalStore`.

4. **state تابعة لـ TanStack Query مباشرة في نفس الهوك** → `select` أو `onSuccess`.

5. **`useSyncedFormState`** الموجود للحالات البسيطة، بشرط ألا يمسح تعديلات المستخدم عند refetch غير مقصود.

> **ممنوع**: استخدام `onSuccess` كحل عام للهوكس التي تستهلك `data` من هوك آخر.

### ب) `react-hooks/refs` (3)

- **`useDashboardRealtime.ts:30,35`** — نقل تحديث refs إلى `useEffect`. (`useRef(tables)` مهيّأ بالقيمة الأولى، subscribe آمن).
- **`useAccountsActions.ts:50`** — حذف `paramsRef` إن أمكن وقراءة `params` مباشرة. إن كانت handlers تُمرَّر لمكوّنات memoized تعتمد ثبات المرجع، نُبقي `useCallback` ونحدّث `paramsRef` داخل `useEffect([params])`.

### ج) `react-hooks/purity` (2)

```ts
const startRef = useRef<number>(0);
useEffect(() => { if (!startRef.current) startRef.current = performance.now(); }, []);
```
وداخل أي effect يقرأ `startRef.current`، نضع fallback:
```ts
if (!startRef.current) startRef.current = performance.now();
```

### د) `preserve-manual-memoization` (1) — **مُصحَّح بناءً على المراجعة**

**`useSystemDiagnostics.ts:18`**:
- `run` **مستخدمة داخل `useEffect([autoRun, run])`** (سطر 62-64). إزالة `useCallback` ستجعل `run` تُعاد إنشاؤها في كل render → loop أو تشغيل diagnostics متكرر.
- **القرار الصحيح**: الإبقاء على `useCallback` وتعديل dependency من `[user?.id]` إلى `[user]` (كما يستنتج المُجمِّع).
- **`runSingle`**: dep array فارغ `[]` ولا يدخل في effects. يُترك كما هو إن لم يُبلَّغ عنه ESLint، أو يُعدَّل حسب رسالته الدقيقة فقط. **لا يُزال** حتى لو لم يستخدم `user` خشية كسر ثبات المرجع للمستهلكين.

## معالجة خاصة لكل ملف

| الملف | النمط |
|---|---|
| `useIsMobile.ts` | `useSyncExternalStore` + fallback صارم لـ SSR/jsdom: `if (typeof window === 'undefined' \|\| !window.matchMedia) return () => {};` في كل من `subscribe` و`getSnapshot` |
| `usePagePerformance.ts` | lazy ref + fallback داخل effect لتفادي قراءة 0 |
| `useIdleTimeout.ts` | فصل "جدولة المؤقتات" عن "إخفاء التحذير"؛ `resetTimer({hideWarning?: boolean})`؛ mount effect يجدول فقط |
| `useDashboardRealtime.ts` | نقل تحديث refs إلى effects مع deps دقيقة |
| `useAccountsActions.ts` | حذف `paramsRef` كخيار أول؛ بديل: تحديث في `useEffect([params])` |
| `InvoicePreviewDialog.tsx` | `defaultTemplate` مشتق + `templateOverride` state + reset عبر **derived key مستقر**: `invoiceKey = invoice?.id ?? invoice?.invoiceNumber ?? null` (لا تعتمد على object reference) |
| `InvoiceViewer.tsx` | نفس نمط Dialog (يُحدَّد بعد قراءة السياق) |
| `useSystemDiagnostics.ts` | تعديل dep من `[user?.id]` إلى `[user]` فقط، لا إزالة |
| 8 ملفات إعدادات Admin | نمط default+override + derived key reset + تصفير override بعد save ناجح |
| 6 ملفات متبقية | تُصنَّف فردياً بعد قراءة كل ملف (نمط 1 من أ.1-أ.5) |

## قائمة الملفات الـ19 (الأسطر مؤكدة)

```text
src/components/invoices/InvoicePreviewDialog.tsx           : 38
src/components/invoices/InvoiceViewer.tsx                  : 43
src/hooks/application/useSecuritySettings.ts               : 12
src/hooks/auth/flows/useResetPassword.ts                   : 30
src/hooks/data/core/useDashboardRealtime.ts                : 30, 35
src/hooks/domain/financial/useAccountsActions.ts           : 50
src/hooks/page/admin/contracts/useContractsBulkRenew.ts    : 18
src/hooks/page/admin/management/useEmailMonitorPage.ts     : 152
src/hooks/page/admin/management/useSystemDiagnostics.ts    : 18, 63
src/hooks/page/admin/management/useZatcaSettings.ts        : 75
src/hooks/page/admin/reports/useYearComparisonState.ts     : 31
src/hooks/page/admin/settings/useAdvanceSettingsTab.ts     : 23
src/hooks/page/admin/settings/usePermissionsControlPanel.ts: 43
src/hooks/page/admin/settings/useSystemSettingsTab.ts      : 40
src/hooks/page/admin/settings/useWaqfSettingsTab.ts        : 36
src/hooks/page/beneficiary/views/useContractsViewPage.ts   : 65
src/hooks/ui/useIdleTimeout.ts                             : 26, 75
src/hooks/ui/useIsMobile.ts                                : 14
src/hooks/ui/usePagePerformance.ts                         : 12
```

## ترتيب التنفيذ

### المرحلة 1 — UI/Infra (4 ملفات)
`useIsMobile`, `usePagePerformance`, `useIdleTimeout`, `useDashboardRealtime`.

### المرحلة 2 — `useSystemDiagnostics` (تعديل dep فقط)
`[user?.id]` → `[user]`. اختبار صفحة Admin Diagnostics (autoRun يعمل مرة واحدة).

### المرحلة 3 — إعدادات Admin (8 ملفات، نمط default+override)
اختبار يدوي: فتح، تعديل، حفظ، تأكيد أن refetch لا يمسح التعديلات وأن `overrides` تُصفَّر بعد الحفظ.

### المرحلة 4 — Dialogs الفواتير + باقي الهوكس (6 ملفات)
اختبار يدوي: فتح فاتورة، تغيير القالب، استعراض فواتير مختلفة بالتتابع (التحقق أن templateOverride يُصفَّر مع تغيّر `invoiceKey`).

### المرحلة 5 — التحقق النهائي (محاكاة CI حرفياً)
```bash
npx eslint src/                # محاكاة CI (لا --quiet)، يجب: 0 errors
npx eslint src/ --quiet        # تأكيد إضافي
npx tsc --noEmit               # يجب: clean
npx vitest run                 # يجب: 1776/1776 pass
```

## اختبارات يدوية حرجة (لا تُتجاوز)

### `useIdleTimeout`
- بداية الجلسة: لا تحذير
- قرب الانتهاء: يظهر التحذير
- حركة بعد التحذير: يختفي
- رجوع التبويب بعد timeout: تسجيل خروج
- تغيير `timeout`/`warningBefore`: لا تحذير عالق

### `useIsMobile`
- تغيير viewport بين mobile/desktop
- اختبارات jsdom (`window.matchMedia` غير موجود)

### `InvoicePreviewDialog`
- تغيير قالب يدوياً يبقى
- التنقل بين فواتير مختلفة يُصفّر القالب للقيمة الافتراضية

### Admin Settings (نموذج واحد على الأقل من كل tab)
- تعديل + حفظ + refetch لا يكسر التعديلات
- لا warning في console

## معيار القبول

| فحص | الهدف |
|---|---|
| `npx eslint src/` (CI mode) | 0 errors |
| `tsc --noEmit` | clean |
| `vitest run` | 1776/1776 pass |
| اختبارات يدوية أعلاه | كل السيناريوهات تمر |
| CI `test.yml` على main | green |

## المخاطر والتخفيف

| الخطر | التخفيف |
|---|---|
| نمط override يمسح تعديلات عند refetch صامت | derived key مرتبط بـ id الجوهري فقط |
| `useIsMobile` يكسر jsdom | fallback `typeof window === 'undefined'` في subscribe+getSnapshot |
| `useIdleTimeout` ينطفئ التحذير في غير وقته | فصل صريح + اختبار يدوي للجلسة |
| تعديل `useSystemDiagnostics` dep يكسر autoRun | اختبار الصفحة يدوياً، التأكد من تشغيل واحد فقط |
| حذف `paramsRef` في `useAccountsActions` يفقد ثبات handler | فحص references بـ `lsp--code_intelligence` قبل الحذف؛ بديل: effect-based update |

## التقدير الزمني
- المرحلة 0: دقائق
- المرحلة 1: ~25 دقيقة
- المرحلة 2: ~5 دقائق (تعديل سطر واحد + اختبار)
- المرحلة 3: ~40 دقيقة
- المرحلة 4: ~30 دقيقة
- المرحلة 5: ~15 دقيقة

**الإجمالي: ~2 ساعة** مع الاختبار اليدوي.
