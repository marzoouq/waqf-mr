## الهدف

اختبار Playwright E2E يتحقق أن **نسبة التوثيق** و**عدد الفواتير المرفقة لكل مصروف** متطابقة تماماً بين:
- لوحة الناظر: `/dashboard/expenses`
- لوحة المستفيد: `/beneficiary/expenses`

لنفس السنة المالية (منشورة).

## فحص مسبق (نتائج)

- لا يوجد إعداد Playwright في المشروع حالياً (لا `playwright.config.ts`، لا مجلد `tests/`، لا تبعية في `package.json`). سيُضاف من الصفر.
- المكوّنات المستهدفة موجودة: `ExpenseSummaryCards.tsx` (يعرض `documentationRate` + `documentedCount/expenses.length`) و `ExpensesDesktopTable.tsx` (يحسب `attachCount = expenseInvoiceMap.get(item.id)`).
- لا `data-testid` في مكونات المصروفات — يجب إضافتها.
- منطق الحساب موحد فعلاً في `computeDocumentationStats` ومُستخدَم في هوكَي الصفحتين، لذا الاختبار قبل كل شيء **جسر حماية ضد الانحراف المستقبلي**.
- مفتاح `sessionStorage` للسنة المالية = `fiscal_year_id` (وفق قواعد المشروع).

## الملفات الجديدة

1. **`playwright.config.ts`** (جذر المشروع):
   - `testDir: 'tests/e2e'`, `baseURL: 'http://localhost:8080'`
   - `use: { viewport: {width:1280,height:1800}, locale: 'ar-SA', trace: 'retain-on-failure', screenshot: 'only-on-failure' }`
   - مشروع Chromium واحد headless.
   - `webServer` غير مطلوب (الـ dev server يعمل مسبقاً في بيئتنا).

2. **`tests/e2e/helpers/auth.ts`**:
   - `restoreAdminSession(context, page)` — يستخدم `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` + `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` + `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` (الجلسة المحقونة = الناظر الحالي).
   - `loginViaUi(page, email, password)` — يزور `/auth`، يملأ النموذج ويضغط دخول (للمستفيد عبر `E2E_BENEFICIARY_EMAIL` / `E2E_BENEFICIARY_PASSWORD`).
   - `selectFiscalYear(page, fiscalYearId)` — يضبط `sessionStorage.setItem('fiscal_year_id', id)` قبل التنقل، ثم يتحقق من ظهورها في `FiscalYearSwitcher` بعد الرندر.

3. **`tests/e2e/helpers/readExpensesStats.ts`**:
   - `readSummaryStats(page)` → `{ rate: number, documented: number, total: number }` بقراءة `[data-testid="documentation-rate"]` و `[data-testid="documented-count"]`.
   - `readAttachmentCounts(page)` → `Record<expenseId, number>` بقراءة كل `[data-testid^="expense-row-"]` واستخراج `[data-testid="attachments-count"]`.

4. **`tests/e2e/expenses-documentation-parity.spec.ts`**:
   - `test.skip(!process.env.E2E_BENEFICIARY_EMAIL, 'missing beneficiary creds')`.
   - Step 1: استعادة جلسة الناظر → زيارة `/dashboard/expenses` → اختيار سنة منشورة معروفة (`E2E_FISCAL_YEAR_ID`) → انتظار `[data-testid="documentation-rate"]` → التقاط `adminStats` + `adminCounts` + screenshot.
   - Step 2: `context.clearCookies()` + `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })` → `loginViaUi` بمستفيد → زيارة `/beneficiary/expenses` → اختيار نفس السنة → التقاط `benStats` + `benCounts` + screenshot.
   - Assertions:
     - `expect(benStats.rate).toBe(adminStats.rate)`
     - `expect(benStats.documented).toBe(adminStats.documented)`
     - `expect(benStats.total).toBe(adminStats.total)`
     - `expect(benCounts).toEqual(adminCounts)` (تطابق الخريطة كاملةً)
   - Screenshots تُحفظ تحت `test-results/` بواسطة Playwright تلقائياً + استدعاءات صريحة لـ `page.screenshot({ path: 'test-results/parity/{step}.png' })`.

## تعديلات صغيرة لدعم القراءة الآلية

5. **`src/components/expenses/ExpenseSummaryCards.tsx`**:
   - `data-testid="documentation-rate"` على `<p>` قيمة النسبة.
   - `data-testid="documented-count"` على `<p>` نص `{documentedCount}/{expenses.length}`.

6. **`src/components/expenses/ExpensesDesktopTable.tsx`**:
   - `data-testid={\`expense-row-${item.id}\`}` على `<tr>` الرئيسي.
   - `data-testid="attachments-count"` على العنصر الذي يعرض `attachCount`.

(الاختبار يعتمد على الجدول Desktop فقط لأن viewport = 1280.)

## التبعيات وسكربتات npm

7. **`package.json`** — إضافة devDependency `@playwright/test` وسكربت `"test:e2e": "playwright test"` وسكربت `"test:e2e:parity": "playwright test expenses-documentation-parity"`.

## متغيرات البيئة المطلوبة

- `LOVABLE_BROWSER_SUPABASE_*` — محقونة تلقائياً (جلسة الناظر).
- `E2E_BENEFICIARY_EMAIL`, `E2E_BENEFICIARY_PASSWORD` — حساب مستفيد اختباري مرتبط بسنة منشورة.
- `E2E_FISCAL_YEAR_ID` — UUID لسنة منشورة تحوي ≥ مصروفَين (أحدهما بمرفق، الآخر بدونه) لضمان نسبة توثيق ذات معنى.

في غياب أيّ منها، الاختبار يُتخطّى مع رسالة `console.info` واضحة (لا يفشل CI).

## خطوات التحقق من نجاح التنفيذ بالكامل

1. `bun add -D @playwright/test` ثم `bunx playwright install chromium` (تلقائي في السكربت).
2. `tsgo --noEmit` — نظيف (خصوصاً بعد إضافة `data-testid`).
3. `bunx vitest run` — الاختبارات القائمة (`useExpensesPage.test.ts`, `documentationRate.test.ts`) لا تنكسر.
4. `bunx playwright test tests/e2e/expenses-documentation-parity.spec.ts --reporter=list`:
   - المتوقّع: `1 passed` عند توفر env vars، أو `1 skipped` مع رسالة واضحة عند غيابها.
5. فحص Screenshots المولّدة في `test-results/parity/` بصرياً للتأكد أن السنة المالية المعروضة هي نفسها في اللقطتين.
6. **اختبار قوة**: تشغيل الاختبار بعد رفع مرفق جديد لمصروف عبر واجهة الناظر يدوياً — يجب أن يظل الاختبار ناجحاً (لأن الحساب موحّد المصدر).

## خارج النطاق

- لا تعديل على `computeDocumentationStats` أو أي منطق حساب.
- لا Migration، لا RLS، لا تغييرات UI مرئية (فقط `data-testid`).
- لا يشمل مقارنة نسخة الموبايل (`ExpensesMobileCards`) — تُترك لتكرار لاحق إن طُلب.
