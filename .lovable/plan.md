

# إصلاح مشاكل لوحة تحكم الناظر

## البنود المؤكدة بعد مراجعة الكود

| # | البند | الحكم | السطر |
|---|-------|-------|-------|
| BUG-1 | collectionSummary يُهمل العقود المنتهية ذات الفواتير المتأخرة | **حقيقي** | 80 |
| BUG-2 | contractualRevenue يشمل كل العقود لا النشطة فقط | **حقيقي** | 76 |
| BUG-3 | avgRent مضخم (نتيجة BUG-2) | **حقيقي** | 168 |
| BUG-4 | ترتيب بـ created_at بدل start_date | **حقيقي** | 412 |
| BUG-5 | occupancyRate = 100% عند غياب وحدات | **حقيقي** | 167 |
| UX-1 | لا تنبيه للعقود المنتهية قريباً | **تحسين مفيد** | — |
| UX-2 | Quick Actions للمحاسب فقط | **ملاحظة** — خارج النطاق |
| UX-3 | بطاقتا دخل بنفس اللون والأيقونة | **حقيقي** | 111-112 |
| UX-4 | لا رابط "عرض الكل" في آخر العقود | **حقيقي** | 399 |
| UX-5 | collectionSummary تختفي عند total=0 | **ملاحظة** — سلوك مقبول |
| UX-6 | لا مؤشر تقدم السنة | **ملاحظة** — ميزة جديدة خارج النطاق |
| PERF-1 | stats بدون useMemo | **حقيقي** | 108 |
| PERF-2 | `__skip__` قيمة سحرية | **ملاحظة** — يعمل ولا يحتاج تغيير |

## الإصلاحات (9 تعديلات في ملف واحد)

### 1. BUG-2+3 — `contractualRevenue` يجب أن يشمل النشطة فقط
سطر 76: تغيير من `fyContracts.reduce(...)` إلى `fyContracts.filter(c => c.status === 'active').reduce(...)`. هذا يُصلح BUG-3 تلقائياً لأن avgRent يقسم على activeContractsCount.

### 2. BUG-1 — collectionSummary يشمل العقود ذات الفواتير المتأخرة
سطر 80: تغيير الفلتر من `status === 'active'` إلى `status === 'active' || status === 'expired'` لشمل العقود المنتهية التي لديها فواتير pending/overdue.

### 3. BUG-4 — ترتيب آخر العقود بـ start_date
سطر 412: تغيير `created_at` → `start_date`.

### 4. BUG-5 — occupancyRate fallback
سطر 167: تغيير fallback من `100` إلى `0` عند عدم وجود وحدات.

### 5. UX-1 — تنبيه العقود المنتهية خلال 30 يوم
إضافة `useMemo` لحساب `expiringContracts` وعرض `Alert` تحذيري مع عدد العقود وأرقامها.

### 6. UX-3 — تمييز بطاقتي الدخل
تغيير بطاقة "إجمالي الدخل الفعلي" من `TrendingUp` + `bg-success` إلى `Wallet` + `bg-info` (أو `bg-primary` مميز).

### 7. UX-4 — رابط "عرض الكل" في آخر العقود
إضافة `Link` في `CardHeader` لصفحة العقود.

### 8. PERF-1 — إحاطة stats بـ useMemo
تحويل `stats` array إلى `useMemo` مع dependencies مناسبة.

