# خطة عاجلة — إصلاح imports مكسورة + إكمال الدمج

## الوضع الحالي (مؤكَّد بالفحص)

- ✗ `src/lib/services/{expensesService,incomeService,unitsService,notificationsCrudService}.ts` **محذوفة فعلاً** (rm نجح في دورة سابقة).
- ✗ 4 hooks ما زالت تستوردها → **البناء/typecheck مكسور**.
- ✓ `invoicesService.ts` موجود وسليم (Storage boundary).
- ✓ `src/lib/services/index.ts` لا يصدّر أياً من الأربعة (لا حاجة لتعديله).

يجب التحويل إلى **build mode** لتنفيذ الإصلاح فوراً.

## الإصلاح (4 ملفات داخل `hooks/data/` فقط)

### 1. `src/hooks/data/financial/useExpenses.ts`

- إزالة import من `@/lib/services/expensesService`.
- إضافة `EXPENSE_SELECT` محلياً وتصديره (للتوافق إن استُورد من مكان آخر).
- إضافة `fetchExpensesByFiscalYear(fiscalYearId)` محلياً (نفس منطق `listByFiscalYear` السابق: `isFyAll` → بدون `eq`، وإلا `eq + limit(PER_FY_LIMIT)`).
- استبدال `queryFn` بـ `() => fetchExpensesByFiscalYear(fiscalYearId)`.
- الحفاظ على API: `useExpenses`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`, `useExpensesByFiscalYear`, `EXPENSE_SELECT`.

### 2. `src/hooks/data/financial/useIncome.ts`

- نفس النمط: نقل `INCOME_SELECT` محلياً، إضافة `fetchIncomeByFiscalYear` محلياً، استبدال `queryFn`.
- الحفاظ على: `useIncome`, `useCreateIncome`, `useUpdateIncome`, `useDeleteIncome`, `useIncomeByFiscalYear`, `INCOME_SELECT`.

### 3. `src/hooks/data/properties/useUnits.ts`

- إزالة import من `@/lib/services/unitsService`.
- إضافة `UNITS_SELECT` محلياً + `fetchUnitsByProperty(propertyId)`.
- داخل `useDeleteUnit`: `supabase.from('units').delete().eq('id', id)` مباشرة قبل `return propertyId`.
- الحفاظ على: `useAllUnits`, `useCreateUnit`, `useUpdateUnit`, `unitsQueryOptions`, `useUnits`, `useDeleteUnit`, `UnitRow`, `UnitInsert`.

### 4. `src/hooks/data/notifications/useNotificationActions.ts`

- إزالة import من `@/lib/services/notificationsCrudService`.
- إضافة 4 دوال محلية بنفس التواقيع **حرفياً**:
  - `markOneAsRead(id, userId)` — `update is_read=true`.
  - `markEveryAsRead(userId)` — `update is_read=true where is_read=false`.
  - `deleteReadExcluding(userId, disabledTypes)` — `delete where is_read=true` مع استثناء `disabledTypes` عبر `.not('type', 'in', ...)` **بنفس صياغة `("a","b")` بالضبط**.
  - `deleteOneNotification(id, userId)` — حذف بـ id+user_id.
- ربط mutationFns بالدوال الجديدة. لا تغيير على Realtime ولا على API الخارجي للهوك.

## البند الإضافي — حارس linter (تحذير غير قاتل)

**`scripts/check-conventions.mjs`** — قاعدة 11 (warning فقط):

- نطاق: ملفات `.ts` في `src/lib/services/` (باستثناء `index.ts`, `README.md`, `dataFetcher.ts`).
- استثناءات صريحة (whitelist لا تُفحص): الـservices الشرعية الموجودة فعلاً —
  `invoicesService`, `invoiceStorageService`, `notificationService`, `fiscalYearService`, `securityService`, `accessLogService`, `zatcaService`, `zatcaInvoicesService`, `advanceService`, `annualReportService`, `appSettingsService`, `diagnosticsService`, `messagingService`, `searchService`, `supportService`.
- المنطق للملفات غير المدرجة: إن لم تحوِ `functions.invoke|storage.from|rpc(` ولم تُستهلَك من ≥3 ملفات في `src/hooks/` → `warnings.push("single-table service مرشّح للدمج")`.
- لن يفشل البناء إلا مع `LINT_STRICT=1`.

## التحقق بعد التنفيذ

- `rg "expensesService|incomeService|unitsService|notificationsCrudService" src` يجب أن يعود فارغاً.
- `npm run lint:conventions` → 0 violations، 0 warnings جديدة (الـservices المتبقية كلها شرعية).
- `npm test` يمر — لا اختبار يستورد من الـservices المحذوفة (تم التحقق سابقاً).
- typecheck/build يمر — لم يتم تعديل أي صفحة أو مكون أو ملف اختبار.

## نقاط حذرة

- **`useNotificationActions.deleteRead`**: نسخ منطق `disabledTypes` بصيغته الأصلية حرفياً (`("a","b","c")` بعلامات اقتباس مزدوجة محاطة بأقواس) — أي اختلاف يكسر السلوك.
- **`PER_FY_LIMIT`**: استدعاء `.limit(PER_FY_LIMIT)` في كلا فرعي `isFyAll` و`!isFyAll` كما في الكود الأصلي.
- **`invoicesService` لا يُمَس** — Storage boundary شرعي.
- لا تعديل قاعدة بيانات، لا تعديل أمني، لا لمس صفحات/مكونات/اختبارات.

عند الموافقة سأنفذ مباشرة في build mode.
