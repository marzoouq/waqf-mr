

# تقرير الفحص الجنائي الهجين العميق — بعد إعادة الهيكلة

---

## الحالة بعد آخر تعديلات

تم التحقق من تقسيم `useAccountsPage` (593 سطر سابقاً) إلى 4 hooks فرعية + تحويل `useSupportStats` إلى RPC. فيما يلي نتائج الفحص العميق.

---

## 1. مشكلة معمارية مكتشفة: Circular Import Risk

`useAccountsActions.ts` يستورد `findAccountByFY` من `useAccountsPage.ts`:
```text
useAccountsPage.ts → imports useAccountsActions
useAccountsActions.ts → imports findAccountByFY from useAccountsPage
```

**هذا تبعية دائرية (circular dependency).** حالياً يعمل لأن Vite يتعامل معها عبر hoisting، لكنه هش ويمكن أن يكسر في بيئات أخرى.

**التوصية:** نقل `findAccountByFY` إلى ملف مستقل `src/hooks/findAccountByFY.ts` أو `src/utils/findAccountByFY.ts`.

---

## 2. استخدام `any` في hooks الجديدة

بعد التقسيم، الـ sub-hooks تستخدم `any[]` في 5 مواضع:

| الملف | الموضع |
|-------|--------|
| `useAccountsActions.ts` | `accounts: any[]`, `contracts: any[]`, `beneficiaries: any[]` |
| `useAccountsEditing.ts` | `contracts: any[]`, `getExpectedPayments: (contract: any) => number` |

**التوصية:** استبدال `any` بالأنواع الفعلية من `Tables<'contracts'>`, `Tables<'accounts'>`, `Tables<'beneficiaries'>`.

---

## 3. مشكلة Zero-Values في `useAccountsActions`

عند إنشاء `useAccountsActions` في `useAccountsPage.ts`، يتم تمرير **أصفار ثابتة** لجميع القيم المالية (سطر 38-52):
```typescript
totalIncome: 0, totalExpenses: 0, adminShare: 0, ...
```

هذه القيم تُستخدم في `buildAccountData()` و `handleExportPdf()`. معناه أن **حفظ الحسابات وتصدير PDF يستخدمان أصفار بدل القيم الحقيقية**.

**هذا bug فعلي.** القيم المحسوبة في `calc` لا تُعاد ربطها بـ `actions`.

**التوصية:** إما:
- (أ) تمرير calc values عبر ref/callback pattern
- (ب) نقل `buildAccountData` خارج `useAccountsActions` وجعل `useAccountsPage` يمرر القيم المحسوبة مباشرة

---

## 4. تقييم التقسيم الجديد

| الملف | الأسطر | المسؤولية | التقييم |
|-------|--------|-----------|---------|
| `useAccountsPage.ts` | 138 | Composition layer | ✅ نظيف |
| `useAccountsData.ts` | 74 | Data fetching | ✅ ممتاز |
| `useAccountsCalculations.ts` | 158 | Financial math | ✅ جيد — useMemo مطبّق |
| `useAccountsEditing.ts` | 146 | UI state | ✅ نظيف |
| `useAccountsActions.ts` | 255 | CRUD + settings | ⚠️ يحتوي على settings state + CRUD + PDF — يمكن تقسيمه أكثر |

---

## 5. فحص باقي الـ Hooks

| Hook | الأسطر | التقييم | ملاحظة |
|------|--------|---------|--------|
| `useBeneficiaryDashboardData` | 72 | ✅ ممتاز | RPC واحد يستبدل 6 hooks |
| `useComputedFinancials` | 182 | ✅ جيد | useMemo شامل، تعليقات إصلاح واضحة |
| `useRawFinancialData` | 27 | ✅ ممتاز | بسيط ومركّز |
| `useFinancialSummary` | 35 | ✅ ممتاز | Composition pattern نظيف |
| `useCrudFactory` | 172 | ✅ ممتاز | Generic factory مُعاد الاستخدام |
| `useMyShare` | 42 | ✅ ممتاز | safeNumber مطبّق |
| `useSupportTickets` | 246 | ✅ محسّن | RPC `get_support_stats` بدل 9 queries |
| `FiscalYearContext` | 114 | ✅ ممتاز | fallback آمن + localStorage |
| `AuthContext` | 231 | ✅ جيد | roleRef + retry logic |

---

## 6. Edge Functions — فحص الأمان

| الوظيفة | Auth Check | Rate Limit | Input Validation |
|---------|-----------|------------|-----------------|
| `guard-signup` | ✅ | ✅ | ✅ |
| `lookup-national-id` | ✅ | ✅ | ✅ |
| `ai-assistant` | ✅ getUser | ❌ | ⚠️ يعتمد على AI model validation |
| `admin-manage-users` | ✅ admin check | ❌ | ✅ |
| `zatca-api` | ✅ | ❌ | ✅ |
| `generate-invoice-pdf` | ✅ | ❌ | ✅ |
| `webauthn` | ✅ | ❌ | ✅ |
| `auth-email-hook` | ✅ webhook signature | N/A | ✅ |
| `check-contract-expiry` | ✅ cron/service | N/A | N/A |

**ملاحظة:** `ai-assistant` و `admin-manage-users` بدون rate limiting — مرشحة للإضافة.

---

## 7. نظافة الكود

| البند | العدد | التقييم |
|-------|-------|---------|
| `eslint-disable` في src/ | 9 ملفات | ⚠️ معظمها `@typescript-eslint/no-explicit-any` |
| `any` في hooks | 5 مواضع | ⚠️ قابلة للاستبدال بأنواع محددة |
| Circular imports | 1 (findAccountByFY) | ⚠️ يحتاج إصلاح |
| Dead code | 0 مكتشف | ✅ |
| Console.log | 0 في production | ✅ (logger مستخدم) |

---

## 8. ملخص التوصيات المرتبة بالأولوية

| # | التوصية | الأولوية | الأثر |
|---|---------|----------|-------|
| 1 | **إصلاح bug الأصفار في buildAccountData/handleExportPdf** — القيم المالية تُمرر كأصفار بدل القيم المحسوبة | **حرجة** | حفظ الحسابات وتصدير PDF معطّل |
| 2 | **كسر الـ circular import** — نقل `findAccountByFY` لملف مستقل | عالية | منع أخطاء bundler |
| 3 | **استبدال `any[]` بأنواع محددة** في useAccountsActions و useAccountsEditing | متوسطة | type safety |
| 4 | **إضافة rate limiting** لـ `ai-assistant` و `admin-manage-users` | متوسطة | أمان |
| 5 | **جعل `fiscal_year_id` NOT NULL** في الجداول المالية (income, expenses, distributions, accounts) | منخفضة | سلامة بيانات |

---

## الخلاصة

المشروع في حالة **جيدة جداً** بعد إعادة الهيكلة مع **bug حرج واحد**: القيم المالية المُمررة كأصفار في `useAccountsActions` بعد التقسيم. هذا يحتاج إصلاح فوري لأنه يؤثر على حفظ الحسابات وتصدير PDF. باقي الملاحظات تحسينات نوعية.

