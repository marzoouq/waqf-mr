# خطة: فحص جنائي لتدفق البيانات (DB → API → State → UI)

**المخرج الوحيد:** `audit/data-flow-forensic-2026-07-09.md` — لا تعديلات كود.

## المحاور

### 1. طبقة قاعدة البيانات (Source)
- تعداد الجداول (42) و RLS/GRANTs عبر `supabase--read_query`.
- الدوال المخزّنة الحرجة: `get_beneficiary_dashboard`, `execute_distribution`, `log_access_event`, `has_role`.
- تحقق من `security_invoker` على العروض الآمنة (`beneficiaries_safe`, `contracts_safe`).

### 2. طبقة النقل (API)
- عدّ استدعاءات Supabase الفعلية من `network-requests` (baseline: 10 طلبات على `/beneficiary`).
- Edge Functions (11) — رؤوس المصادقة، Zod validation، CORS.
- N+1 hunt: بحث عن `.in()` مقابل loops في `hooks/data/`.

### 3. طبقة الحالة (TanStack Query)
- خريطة queryKeys الكاملة (`src/lib/queryKeys/**`).
- تصنيف كل مفتاح حسب `staleTime` (STATIC/FINANCIAL/REALTIME/…).
- **تحقق من إبطال الاستعلامات (invalidation)** بعد mutations — رصد الحالات التي تفتقر لـ `invalidateQueries` أو تُبطل مفاتيح خاطئة.
- تحقق من `select` filters لمنع re-renders (النمط في `useSetting`).
- Realtime subscriptions مقابل staleTime — هل هناك تداخل؟

### 4. طبقة UI (Components)
- خريطة المكونات الحاوية (`hooks/page/`) مقابل العرضية.
- رصد passes `props drilling` عميقة (≥4 مستويات) بدون Context.
- Error Boundaries: تغطية `RouteErrorBoundary` لكل route tree.
- Loading states: هل كل `useQuery` معالج بـ skeleton أم يومض العناصر؟

### 5. حالات الحافة (Edge Cases)
- Race conditions: `AbortSignal` في `queryFn` — تغطيته الفعلية.
- Optimistic updates: أين تُستخدم وأين تفشل rollback.
- تحويل البيانات (data shape): تطابق `Database['public']['Tables']` مع `@/types`.
- Timing: `enabled: !!user && !!role` — هل يمنع الاستعلامات على مستخدم `signed_out`؟

## المنهجية

1. **قراءة إحصائية** — سكربتات `rg` + `wc` لعدّ الأنماط بدون تخمين.
2. **قراءة عينات** — 15 ملفاً موزعاً بين data/domain/page/components.
3. **قياس فعلي** — `supabase--slow_queries` + `network-requests` للمقارنة بتقرير الأداء السابق.
4. **تصنيف النتائج** بـ P0/P1/P2 مع ملف:سطر واقتباس.

## بنية التقرير

```
audit/data-flow-forensic-2026-07-09.md
├── ملخص تنفيذي (5 نقاط)
├── 1. DB Layer          — الجداول، RLS، الدوال
├── 2. API Layer         — الطلبات، Edge Functions، N+1
├── 3. State Layer       — queryKeys، staleTime، invalidation
├── 4. UI Layer          — المكونات، Error Boundaries، Loading
├── 5. Edge Cases        — Race, Optimistic, Timing
├── مصفوفة المشاكل (P0/P1/P2)
└── التوصيات القابلة للتنفيذ
```

## معايير القبول
- كل ادعاء مدعوم بـ `path:line` أو استعلام SQL.
- لا توصية بدون سبب جذري موثّق.
- ربط بتقرير الأداء السابق حيث ينطبق (بدون تكرار).
