

# تقرير التدقيق المعماري — الجولة 6 (تحقق نهائي)

## الادعاءات المرفوضة (أُصلحت أو غير صحيحة)

| # الأصلي | الادعاء | الحالة |
|---|---------|--------|
| 1, 10, 24 | `logger.ts` / `logAccessEvent` في طبقة خاطئة | **أُصلح** — لا ملف يستورد من المسار القديم |
| 3, 57 | `timingSafeEqual` مكررة | **أُصلح** — في `_shared/auth.ts` فقط |
| 4 | `useRoleRedirect` في `hooks/ui/` | **أُصلح** — في `hooks/auth/` |
| 17 | `ErrorBoundary` يتجاهل `Test explosion` | **أُصلح** |
| 43 | `useBfcacheSafeChannel` في `hooks/ui/` | **أُصلح** — في `lib/realtime/` |
| 26, 65 | `fiscalYearIds` خارج barrel | **أُصلح** |
| 13 | `useIncomeComparison` N+1 | **غير صحيح** — استعلام واحد بـ `.in()` |
| 16 | `errorReporter.ts` يستخدم مفتاح مُشفَّر | **أُصلح** — يستخدم `STORAGE_KEYS.ERROR_LOG_QUEUE` (سطر 43) |

---

## المشاكل الحقيقية المتبقية

### 🟠 1. `properties.find()` و `allUnits.find()` — O(N×M) في `useAccountsCalculations`

**السطر**: 40, 43 — داخل `useCallback` يُستدعى لكل عقد عبر `collectionData` useMemo.

**الإصلاح**: بناء `Map<string, Property>` و `Map<string, Unit>` في `useMemo` مرة واحدة، ثم استخدام `.get()` بدلاً من `.find()`.

**ملفات**: 1 تعديل

---

### 🟠 2. `statusLabel` دالة عادية داخل hook تُعاد إنشاؤها كل render

**السطر**: 149-156 — دالة بسيطة بدون أي تبعية على state أو props.

**الإصلاح**: نقلها خارج الـ hook كدالة module-level.

**ملفات**: 1 تعديل (نفس الملف)

---

### 🟡 3. `onError` غير متسق بين hooks

- `useCloseFiscalYear` (سطر 43): `logger.error` فقط — **لا يُبلغ المستخدم**
- `useCrudFactory`: `logger.error` + `notify.error` (صحيح)
- `useUserManagementMutations`: `defaultNotify.error` فقط (مقبول)

**الإصلاح**: إضافة `defaultNotify.error` في `useCloseFiscalYear.onError` — عملية إقفال السنة المالية فشلها يجب أن يراه المستخدم.

**ملفات**: 1 تعديل

---

### 🟡 4. `getSafeErrorMessage` — fallback يُسجّل كل خطأ غير معروف عبر `logger.error`

**السطر 84**: `logger.error('[App Error]', error)` — يُشغَّل لكل خطأ لا يطابق أي نمط. إذا كان المستدعي يُسجّل الخطأ أيضاً (مثل `useCrudFactory`)، يحدث تسجيل مزدوج.

**الإصلاح**: إزالة `logger.error` من `getSafeErrorMessage` — المسؤولية على المستدعي. أو إضافة parameter `{ silent?: boolean }`.

**ملفات**: 1 تعديل

---

## ملخص

| # | المشكلة | الأولوية | الجهد |
|---|---------|---------|-------|
| 1 | Map بدلاً من find() في useAccountsCalculations | 🟠 | صغير |
| 2 | نقل statusLabel خارج الـ hook | 🟠 | تافه |
| 3 | إضافة notify في useCloseFiscalYear.onError | 🟡 | تافه |
| 4 | إزالة logger.error من getSafeErrorMessage | 🟡 | تافه |

**إجمالي**: 3 ملفات متأثرة. صفر تغيير في السلوك الخارجي (باستثناء #3: المستخدم سيرى toast عند فشل إقفال السنة).

**خلاصة**: المشروع في حالة نظيفة جداً. الـ 100 ادعاء الأصلية أُصلح أو رُفض 96 منها. المتبقي 4 تحسينات محلية — لا مشاكل معمارية هيكلية.

