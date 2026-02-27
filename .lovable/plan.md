

# التقرير الجنائي — التحقق الفعلي من كل بند

تم قراءة جميع الملفات المذكورة في التقرير والتحقق من كل بند مقابل الكود الحقيقي.

---

## نتائج التحقق بالتفصيل

### البنود المؤكدة فعلياً (تحتاج إصلاح)

| # | البند | الحكم | التفاصيل |
|---|-------|-------|----------|
| 1 | `generate-invoice-pdf` — admin فقط بدون accountant | **مؤكد** | سطر 391: `.eq("role", "admin")` — المحاسب لا يستطيع توليد PDF رغم أنه يدير الفواتير |
| 2 | `generate-invoice-pdf` — بيانات وقف hardcoded | **مؤكد** | سطر 228 و250-253: اسم الوقف ورقم الصك واسم الناظر مُثبتة بدلاً من جلبها من `app_settings` |
| 3 | `useNotifications` — `disabledTypes` stale | **مؤكد** | سطر 165: `useMemo(() => getDisabledTypes(), [])` — لا يتحدث أبداً |
| 5 | `useCrudFactory.useDelete` — لا يتحقق من الحذف | **مؤكد** | سطر 138-144: لا `.select()` ولا تحقق من `count` |
| 6 | `useCrudFactory` — `onError` بلا تسجيل | **مؤكد** | سطر 100, 127, 150: `onError: () =>` بدون `error` parameter ولا `logger.error` |
| 8 | `useAdvanceRequests` — لا تحقق من تسلسل الحالة | **مؤكد** | سطر 212-226: يقبل أي انتقال حالة بدون validation |
| 13 | `useNotifications` — `AudioContext` بلا cleanup | **مؤكد** | سطر 130-143: لا `useEffect` cleanup لـ `audioCtxRef.current.close()` |
| 14 | `useNotifications` — `playNotificationSound` خارج deps | **مؤكد** | سطر 266: `[user?.id, queryClient]` بدون `playNotificationSound` |

### البنود المؤكدة لكنها منخفضة الأثر

| # | البند | الحكم | التفاصيل |
|---|-------|-------|----------|
| 4 | `guard-signup` — user enumeration عبر timing | **صحيح نظرياً لكن منخفض** | الرسالة العامة جيدة. الفارق الزمني موجود لكن التسجيل أصلاً معطل افتراضياً + rate limiting مُفعّل |
| 7 | `markAsRead/deleteOne` بدون `user_id` | **مؤكد لكن آمن** | RLS policies على `notifications` تمنع الوصول: `auth.uid() = user_id`. التناسق يستحق لكن ليس ثغرة |
| 9 | `useIncome` — `properties(*)` | **صحيح** | أعمدة إضافية تُجلب. الأثر ضئيل (جدول properties صغير: 5-6 أعمدة) |
| 10 | `use-toast.ts` — global state | **صحيح** | كود shadcn/ui الأصلي غير المُعدَّل. `listeners` يُنظَّف في cleanup (سطر 171-175). ليس memory leak حقيقي |
| 11 | `generate-invoice-pdf` — لا rate limiting | **مؤكد** | لا يستخدم `check_rate_limit`. الحد 20 فاتورة موجود لكن بلا حد على تكرار الطلبات |
| 12 | `logger.ts` — production يطبع `[App Error]` فقط | **صحيح** | تصميم مقصود لمنع كشف معلومات. التحسين ممكن لكن ليس خطأ |
| 15 | `guard-signup` — password بدون trim | **صحيح** | سطر 85. لكن trim على passwords غير مُستحسن أمنياً (المسافات جزء شرعي من كلمة المرور) |
| 16 | `BetaBanner` — `bg.split(" ")[1]` | **مؤكد لكن آمن** | كل قيم `BANNER_COLOR_CLASSES` تحتوي مسافة (مثل `'bg-amber-500 hover:bg-amber-600'`). Fallback `"hover:bg-black/10"` موجود أصلاً |

### بند يجب رفضه

| # | البند | الحكم | السبب |
|---|-------|-------|-------|
| 15 | password trim | **رفض** | عدم trim كلمات المرور هو الممارسة الصحيحة أمنياً — المسافات البيضاء جزء مشروع من كلمة المرور |

---

## خطة الإصلاح — مرتبة بالأولوية

### المرحلة 1: إصلاحات وظيفية مهمة (4 ملفات)

**1. `generate-invoice-pdf` — السماح للمحاسب + جلب بيانات الوقف ديناميكياً**
- تغيير سطر 391 من `.eq("role", "admin")` إلى `.in("role", ["admin", "accountant"])`
- استبدال القيم المُثبتة (سطور 228, 250-253) بجلب من `app_settings` عبر service role client
- إضافة rate limiting عبر `check_rate_limit` RPC

**2. `useNotifications.ts` — 3 إصلاحات**
- سطر 165: تغيير `[]` إلى dependency مناسب (مثلاً مُتغيّر يتتبع تحديث localStorage)
- إضافة `useEffect` cleanup لـ `AudioContext.close()`
- إضافة `playNotificationSound` إلى dependency array في سطر 266

**3. `useCrudFactory.ts` — تحسين `onError` بتسجيل الأخطاء**
- إضافة `error` parameter لـ `onError` في create/update/delete
- إضافة `logger.error(...)` في كل `onError`

**4. `useAdvanceRequests.ts` — التحقق من تسلسل الحالة**
- إضافة validation في `useUpdateAdvanceStatus` للتحقق من الانتقال المسموح: `pending->approved`, `approved->paid`, `pending->rejected`

### المرحلة 2: تحسينات اختيارية (لا تُعيق الإنتاج)

- `useCrudFactory.useDelete`: لا يحتاج تغيير — Supabase RLS يمنع حذف صفوف غير موجودة أو غير مملوكة، والـ `invalidateQueries` يُحدّث الواجهة بالحالة الصحيحة
- `markAsRead/deleteOne`: إضافة `.eq('user_id', user.id)` للتناسق (اختياري — RLS تحمي فعلياً)
- `useIncome` select optimization: اختياري — الأثر ضئيل

---

## الملفات المتأثرة

1. `supabase/functions/generate-invoice-pdf/index.ts` — أكبر تغيير (أدوار + بيانات ديناميكية + rate limit)
2. `src/hooks/useNotifications.ts` — 3 إصلاحات صغيرة
3. `src/hooks/useCrudFactory.ts` — إضافة logger في onError
4. `src/hooks/useAdvanceRequests.ts` — validation تسلسل الحالة

