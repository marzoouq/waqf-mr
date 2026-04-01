

# خطة تحسين أداء `dashboard-summary`

## التغييرات (4 ملفات)

### 1. Warm-up Cron Job (أثر: −5-8 ثوانٍ)
إضافة `pg_cron` job يستدعي `health-check` كل 4 دقائق لمنع hibernation الـ Deno runtime.
- يُنفّذ عبر SQL insert (ليس migration) لأنه يحتوي على بيانات خاصة بالمشروع (URL + anon key)

### 2. `src/lib/queryStaleTime.ts`
- `STALE_FINANCIAL`: `60_000` → `5 * 60_000` (5 دقائق)
- يقلل استدعاءات الـ function بمقدار 5x

### 3. `src/hooks/page/useDashboardSummary.ts`
- إضافة `gcTime: 15 * 60_000` لاحتفاظ بالبيانات في الذاكرة 15 دقيقة

### 4. `supabase/functions/dashboard-summary/index.ts`
3 تعديلات minimal:
- **السطر 122**: إضافة `.limit(500)` على `properties`
- **السطور 179, 189-190**: تقليل `income`/`expenses` من `2000` → `1000`
- **السطور 214-218**: تحويل YoY إلى aggregates — جلب `amount` مع `.limit(1)` واستخدام RPC أو حساب SUM في الاستعلام بدل جلب كل الصفوف

### تفصيل YoY optimization
الكود الحالي يجلب كل صفوف income/expenses للسنة السابقة ثم يحسب المجموع في JS. البديل:
```typescript
// بدل: admin.from("income").select("amount").eq(...)
// الجديد: استخدام rpc أو .select("amount.sum()") 
admin.rpc("sum_amount", { table_name: "income", fy_id: prevYearId })
```
لكن لتجنب إنشاء RPC جديد وتعقيد إضافي، الأبسط هو إبقاء الاستعلام الحالي مع إضافة `.limit(5000)` كحد أقصى للأمان، لأن البيانات عادةً أقل من ذلك بكثير.

## التوقع

| الحالة | قبل | بعد |
|--------|------|------|
| أول طلب (cold) | ~12.7 ثانية | ~3-4 ثوانٍ |
| طلبات لاحقة | كل 60 ثانية | كل 5 دقائق |

