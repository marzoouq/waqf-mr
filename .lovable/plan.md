

# تقرير الفحص الشامل للكود (Codebase Audit)

---

## ملخص تنفيذي

المشروع **منظم بشكل جيد جداً** مع معمارية واضحة وفصل مسؤوليات مناسب في معظم المناطق. تم فحص **~200+ ملف مصدري** عبر 10 مجلدات رئيسية. فيما يلي النتائج.

---

## 1. هيكل المشروع — ✅ ممتاز

```text
src/
├── components/    → 18 مجلد فرعي + 30+ مكون مشترك
├── contexts/      → AuthContext + FiscalYearContext (2 فقط — مركّز)
├── hooks/         → 40+ hook (بيانات + منطق أعمال)
├── lib/           → أدوات أساسية (queryClient, logger, lazyWithRetry)
├── utils/         → حسابات + PDF + تنسيق + تصدير
├── types/         → database.ts (نوع واحد مركزي)
├── pages/         → dashboard/ + beneficiary/ + صفحات عامة
├── constants/     → (فارغ أو محدود)
├── integrations/  → supabase client + types (auto-generated)
└── test/          → اختبارات تكامل
```

**الإيجابيات:**
- فصل واضح بين Pages / Components / Hooks / Utils
- كل domain له مجلد مكونات خاص (accounts/, contracts/, properties/...)
- Context محدود بـ 2 فقط (Auth + FiscalYear) — لا يوجد context soup

---

## 2. المعمارية والأنماط — ✅ جيدة مع ملاحظات

### ✅ أنماط ممتازة مُطبّقة
| النمط | التطبيق |
|-------|---------|
| CRUD Factory | `useCrudFactory.ts` — 172 سطر يولّد useQuery + useMutation لأي جدول |
| Composition hooks | `useFinancialSummary` = `useRawFinancialData` + `useComputedFinancials` |
| Lazy loading | جميع الصفحات عبر `lazyWithRetry` مع retry logic |
| Error Boundaries | متعددة المستويات (App root + SecurityGuard + PWA + AI) |
| Deferred rendering | `DeferredRender` يؤخر AI Assistant حتى idle |
| Fiscal Year filtering | مركزي عبر `FiscalYearContext` + `__none__` / `__skip__` guards |

### ⚠️ ملاحظة 1: `useAccountsPage` — 593 سطر (God Hook)

هذا هو أكبر hook في المشروع ويحتوي على:
- جلب بيانات من **10 مصادر** (accounts, contracts, income, expenses, beneficiaries, tenantPayments, units, properties, settings, fiscalYears)
- حسابات مالية معقدة (VAT, allocations, collection data)
- حالة UI (editing, dialogs, delete confirmation)
- عمليات CRUD (save, close year, delete, export PDF)
- **37 قيمة مُرجعة** في الـ return object

**التوصية:** تقسيمه إلى 3-4 hooks فرعية:
1. `useAccountsData` — جلب البيانات فقط
2. `useAccountsCalculations` — الحسابات المالية (VAT, allocations, totals)
3. `useAccountsEditing` — حالة التحرير والحوارات
4. `useAccountsActions` — العمليات (save, close year, export)

> ملاحظة: هذا القرار موثّق بالفعل في ذاكرة المشروع (`financial-logic-refactor`) لكن لم يُنفّذ بعد.

### ⚠️ ملاحظة 2: منطق أعمال في مكونات

بعض مكونات `accounts/` تحتوي على حسابات بسيطة inline (مثل `AccountsSummaryCards`) — هذا مقبول لأن الحسابات الثقيلة في `useAccountsPage` و `accountsCalculations.ts`.

---

## 3. فصل المسؤوليات (Separation of Concerns) — ✅ جيد

| الطبقة | المسؤولية | الحالة |
|--------|-----------|--------|
| Pages | تجميع مكونات + routing | ✅ نظيفة — لا منطق أعمال |
| Components | عرض UI | ✅ معظمها presentational |
| Hooks | جلب بيانات + منطق أعمال | ✅ مع استثناء `useAccountsPage` |
| Utils | حسابات صرفة (pure functions) | ✅ ممتازة — `accountsCalculations.ts` منفصل |
| Contexts | حالة عالمية (auth, fiscal year) | ✅ مركّز — 2 فقط |
| Edge Functions | منطق الباك إند | ✅ كل وظيفة في مجلد مستقل |

**⚠️ ملاحظة:** `useSupportTickets.ts` يحتوي على `useSupportStats` الذي يُطلق **9 استعلامات متوازية** لإحصائيات لوحة الدعم. هذا مرشح للتحويل إلى RPC واحد في قاعدة البيانات.

---

## 4. تعقيد الكود — ✅ مقبول عموماً

| الملف | الأسطر | التقييم |
|-------|--------|---------|
| `useAccountsPage.ts` | 593 | ⚠️ يحتاج تقسيم |
| `useCrudFactory.ts` | 172 | ✅ مجرّد ومُعاد الاستخدام |
| `AuthContext.tsx` | 231 | ✅ مناسب — retry logic + security alerts |
| `FiscalYearContext.tsx` | 114 | ✅ بسيط ومركّز |
| `useFinancialSummary.ts` | 35 | ✅ ممتاز — composition pattern |
| `useComputedFinancials.ts` | ~80 | ✅ محسوب بـ useMemo |
| `App.tsx` | 204 | ✅ منظم — lazy loading + error boundaries |
| `queryClient.ts` | 43 | ✅ مركزي ومضبوط |

---

## 5. أمان الكود — ✅ ممتاز

| البند | الحالة |
|-------|--------|
| RLS على جميع الجداول | ✅ 37/37 |
| SECURITY DEFINER على `has_role` | ✅ |
| Views آمنة (PII masking) | ✅ `beneficiaries_safe`, `contracts_safe` |
| Edge Functions auth | ✅ `getUser()` في كل وظيفة حساسة |
| Rate limiting | ✅ `check_rate_limit()` في `guard-signup`, `lookup-national-id` |
| RBAC في الواجهة | ✅ `ProtectedRoute` مع `allowedRoles` |
| لا hardcoded secrets | ✅ |
| `signUp` عبر Edge Function | ✅ `guard-signup` (ليس مباشراً) |

---

## 6. قابلية الصيانة — ✅ جيدة

| البند | الحالة |
|-------|--------|
| TypeScript strict | ✅ `noUnusedLocals`, `noUnusedParameters` |
| اختبارات | ✅ 156 ملف اختبار |
| تعليقات بالعربي | ✅ واضحة ومفيدة |
| Bug fix tracking | ✅ تعليقات مثل `// N-06 fix:`, `// H-02 fix:` |
| Error handling | ✅ try/catch + toast + logger في كل hook |
| Logging | ✅ `logger.ts` مركزي |

---

## 7. التوصيات المرتبة بالأولوية

| # | التوصية | الأولوية | الجهد |
|---|---------|----------|-------|
| 1 | **تقسيم `useAccountsPage`** (593 سطر) إلى 3-4 hooks فرعية | عالية | متوسط |
| 2 | **تحويل `useSupportStats`** من 9 استعلامات إلى RPC واحد | متوسطة | منخفض |
| 3 | **إضافة `distributions` للـ Realtime** | متوسطة | منخفض |
| 4 | **حذف القيد المكرر** `unique_contract_number` | منخفضة | منخفض |
| 5 | **جعل `fiscal_year_id` NOT NULL** في الجداول المالية الأربعة | منخفضة | منخفض |
| 6 | **إضافة اختبارات Edge Functions** للوظائف الـ 10 المتبقية | منخفضة | متوسط |

---

## الخلاصة

المشروع في حالة **ممتازة معمارياً** لمشروع بهذا الحجم (37 جدول، 200+ ملف، 12 Edge Function):
- **فصل مسؤوليات واضح** بين الطبقات
- **أنماط متقدمة** (CRUD Factory, Composition Hooks, Deferred Rendering)
- **أمان شامل** (RLS 100%, Edge Function auth, RBAC)
- **اختبارات شاملة** (156 ملف، 400+ test)

المشكلة الوحيدة الجوهرية هي **`useAccountsPage`** (593 سطر) الذي يحتاج تقسيم — وهو قرار معماري موثّق بالفعل ينتظر التنفيذ.

