

# تقرير الفحص الجنائي الهجين العميق — مارس 2026

---

## ملخص تنفيذي

تم فحص المشروع بالكامل بعد آخر جولة إصلاحات. المعمارية **نظيفة ومنظمة** مع **bug حرج واحد لا يزال قائماً** رغم محاولة إصلاحه.

---

## 1. Bug حرج: الأصفار في useAccountsActions — لم يُحل بشكل كامل

**المشكلة:** في `useAccountsPage.ts` سطر 24-45، القيم المالية تُمرر كأصفار ثابتة:

```text
totalIncome: 0, totalExpenses: 0, adminShare: 0, ...
```

**محاولة الإصلاح السابقة** استخدمت `paramsRef`:
```text
const paramsRef = useRef(params);
paramsRef.current = params;  // سطر 51 في useAccountsActions
```

**لكن هذا لا يحل المشكلة** لأن:
- `params` المُمرر من `useAccountsPage` يحتوي **دائماً** على `totalIncome: 0` (literal zero)
- `paramsRef.current = params` يُحدّث المرجع لكن بنفس الأصفار
- `calc` يُحسب **بعد** إنشاء `actions` (سطر 48-57) لكن قيمه لا تُمرر أبداً إلى `actions`
- النتيجة: `buildAccountData()` و `handleExportPdf()` يستخدمان أصفار دائماً

**الإصلاح الصحيح:** إضافة `useEffect` في `useAccountsPage` يُحدّث `paramsRef` بقيم `calc` بعد حسابها:

```text
// في useAccountsPage.ts بعد سطر 57:
useEffect(() => {
  actions.updateFinancials({
    totalIncome: calc.totalIncome,
    totalExpenses: calc.totalExpenses,
    adminShare: calc.adminShare,
    ...
  });
}, [calc values]);
```

أو الأبسط: تعريض `paramsRef` من `useAccountsActions` وتحديثه مباشرة:
```text
actions.paramsRef.current = { ...actions.paramsRef.current, ...calc };
```

---

## 2. فحص المعمارية — ✅ ممتازة

| الطبقة | الحالة | ملاحظة |
|--------|--------|--------|
| `useAccountsPage.ts` (138 سطر) | ✅ | Composition layer نظيف |
| `useAccountsData.ts` (74 سطر) | ✅ | جلب بيانات فقط — لا حسابات |
| `useAccountsCalculations.ts` (158 سطر) | ✅ | useMemo شامل |
| `useAccountsEditing.ts` (146 سطر) | ✅ | UI state مستقل |
| `useAccountsActions.ts` (267 سطر) | ⚠️ | Bug الأصفار + 3 `any[]` |
| `findAccountByFY.ts` (ملف مستقل) | ✅ | Circular dependency مكسور |

---

## 3. نظافة الكود

| البند | العدد | الحالة |
|-------|-------|--------|
| `eslint-disable` | 7 مواضع | ⚠️ كلها `no-explicit-any` أو `exhaustive-deps` مبرر |
| `any[]` في hooks | 5 مواضع | ⚠️ في `useAccountsActions` و `useAccountsEditing` |
| `console.*` في production | 0 | ✅ (logger مستخدم حصراً) |
| Dead code | 0 | ✅ |
| Circular imports | 0 | ✅ (تم الإصلاح) |

---

## 4. Query & Caching — ✅ ممتاز

| البند | القيمة |
|-------|--------|
| `staleTime` default | 5 دقائق |
| `gcTime` default | 30 دقيقة |
| `refetchOnWindowFocus` | `false` |
| `retry` | مرة واحدة (يتوقف عند 4xx) |
| `QueryCache.onError` | يتجاهل 401/403 |
| `MutationCache.onError` | toast عالمي إذا لم يوجد `onError` خاص |

---

## 5. Contexts — ✅ مركّزة

- **AuthContext** (231 سطر): `roleRef` + retry logic + security alerts — جيد
- **FiscalYearContext** (114 سطر): localStorage + validation + fallback آمن — ممتاز
- **فقط 2 contexts** — لا يوجد context soup

---

## 6. Edge Functions — فحص أمني

| الوظيفة | Auth | Rate Limit | Input Validation |
|---------|------|------------|-----------------|
| `guard-signup` | ✅ | ✅ | ✅ |
| `lookup-national-id` | ✅ | ✅ | ✅ |
| `admin-manage-users` | ✅ | ✅ (تمت الإضافة) | ✅ |
| `ai-assistant` | ✅ | ❌ | ⚠️ |
| `zatca-api` | ✅ | ❌ | ✅ |
| `generate-invoice-pdf` | ✅ | ❌ | ✅ |

---

## 7. ملخص التوصيات

| # | التوصية | الأولوية | الحالة |
|---|---------|----------|--------|
| 1 | **إصلاح bug الأصفار فعلياً** — تمرير قيم `calc` إلى `paramsRef` بعد الحساب | **حرجة** | لم يُحل |
| 2 | استبدال `any[]` بأنواع محددة (5 مواضع) | متوسطة | لم يُنفذ |
| 3 | إضافة rate limiting لـ `ai-assistant` | متوسطة | لم يُنفذ |
| 4 | جعل `fiscal_year_id` NOT NULL | منخفضة | لم يُنفذ |

---

## الخلاصة

المشروع في حالة **ممتازة معمارياً** بعد تقسيم `useAccountsPage` وكسر الـ circular dependency. المشكلة الوحيدة المتبقية هي **bug الأصفار في `buildAccountData`/`handleExportPdf`** الذي لم يُحل رغم إضافة `paramsRef` — لأن القيم المُمررة نفسها أصفار ثابتة ولا تُحدّث بقيم `calc` المحسوبة.

