

# إصلاح 226 اختبار متعطل — خطة التنفيذ

## تحليل الأسباب الجذرية (6 أنماط)

| النمط | العدد | السبب الحقيقي |
|-------|-------|---------------|
| **A. mockReturnValue is not a function** | ~30 | الموك العالمي لـ `useAuth` في `setup.ts` يعيد كائن عادي — ليس `vi.fn()` — فيمنع الاختبارات المحلية من تجاوزه |
| **B. defaultNotify vs toast** | ~60 | الكود الإنتاجي يستخدم `defaultNotify.error()` (مع dedup) لكن الاختبارات تموك `sonner.toast` مباشرة — طبقة الـ dedup تمنع وصول الاستدعاء |
| **C. QueryClient مفقود** | ~26 | هوكات تستخدم `useQuery` بدون `QueryClientProvider` في wrapper الاختبار |
| **D. UI drift** | ~96 | المكونات تغيّرت (نصوص/هيكل) لكن الاختبارات لم تُحدّث |
| **E. ResizeObserver** | 1 | `jsdom` لا يوفره — يحتاج polyfill |
| **F. مصدر تغيّر جذرياً** | ~13 | `invoice.ts`, `printDistributionReport.ts`, `safeErrorMessage.ts` — الكود لم يعد يستدعي toast/logger لكن الاختبارات تتوقعه |

---

## خطوات الإصلاح (مرتبة بالتأثير)

### الخطوة 1: إصلاح `setup.ts` (يفتح الباب لـ ~57 إصلاح)
- إضافة `ResizeObserver` polyfill عالمي
- **تحويل موك `useAuth` العالمي** من كائن عادي إلى `vi.fn()` قابل للتجاوز:
  ```ts
  const defaultAuthMock = { ... };
  const useAuthFn = vi.fn(() => defaultAuthMock);
  vi.mock('@/hooks/auth/useAuthContext', () => ({ useAuth: useAuthFn }));
  ```
- إضافة helper `createTestQueryClient()` و `createTestWrapper()` لتوحيد wrappers

### الخطوة 2: إصلاح نمط toast/notify (~60 اختبار)
المشكلة الجذرية: الكود يستخدم `defaultNotify` → `dedupToast` → `toast` — لكن الاختبارات تموك `sonner.toast` مباشرة.

**الحل**: في الاختبارات المتأثرة، موك `@/lib/notify` بدلاً من `sonner`:
```ts
const mockNotify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/lib/notify', () => ({ defaultNotify: mockNotify }));
```
**الملفات**: `useWebAuthn.test.ts` (22)، `ResetPassword.test.tsx` (4)، `LoginForm.test.tsx` (7)، وغيرها

### الخطوة 3: تحديث اختبارات المصادر المتغيّرة (~13 اختبار)
- **`invoice.test.ts`** (4): الدالة لم تعد تستدعي `supabase.from` أو `toast` — تُرجع `{ blob, url }` أو `null` فقط. تحديث التوقعات
- **`paymentInvoice.test.ts`** (4): نفس النمط
- **`printDistributionReport.test.ts`** (1): لم يعد يستورد `toast` — يُرجع `false`
- **`printShareReport.test.ts`** (1): نفس النمط
- **`safeErrorMessage.test.ts`** (2): لم يعد يستدعي `logger.error` — حذف التوقعات
- **`annualReport.test.ts`** (2): تحقق من التوقعات

### الخطوة 4: تحديث اختبارات UI المتغيّرة (~96 اختبار)
- **`ProtectedRoute.test.tsx`** (1): لم يعد يعرض "جاري التحقق من الصلاحيات..." — يعرض spinner فقط
- **`LoginForm.test.tsx`**: يستخدم `useLoginForm` hook الذي يستدعي `defaultNotify` — تحديث mocks
- **صفحات المستفيد** (~45): `AccountsViewPage`, `ContractsViewPage`, `DisclosurePage`, `BeneficiaryMessagesPage`, `PropertiesViewPage`, `FinancialReportsPage`, `InvoicesViewPage` — تحديث النصوص/العناصر المتوقعة لتطابق المكونات الحالية
- **صفحات الإدارة** (~40): `AdminDashboard`, `ContractsPage`, `ExpensesPage`, `IncomePage`, `InvoicesPage`, `PropertiesPage`, `SettingsPage`, `ZatcaManagementPage`, `AuditLogPage`, `BylawsPage`, `ReportsPage`, `MessagesPage`, `AccountsPage` — نفس النمط
- **`Sidebar.test.tsx`** (1): لم يعد يعرض "وقف تجريبي"
- **`SignupForm.test.tsx`** (2): "Found multiple elements with role button"
- **`PublicPages.test.tsx`** (7): mockReturnValue بعد إصلاح setup.ts

### الخطوة 5: إضافة QueryClient wrapper (~26 اختبار)
- **`FiscalYearContext.test.tsx`** (4)
- **`FiscalYearSelector.test.tsx`** (5)
- **`NotificationBell.test.tsx`** (5)
- **`useRawFinancialData.test.ts`** (8)
- **`useSupportDashboardPage.test.ts`** (11) — لديه wrapper لكن الموك يتعارض مع `useAuth` العالمي

---

## التفاصيل التقنية

**الملفات المعدّلة**: ~50 ملف اختبار + `setup.ts`
**صفر تغيير** على كود إنتاجي
**النتيجة المتوقعة**: 226 → 0 فشل (أو أقل من 3 مرتبطة ببيئة)

**أولوية التنفيذ**: الخطوة 1 أولاً (تفتح الباب لكثير من الإصلاحات)، ثم 2، ثم 3-5 بالتوازي.

