

# تحليل أداء جنائي عميق — تقرير النتائج وخطة التحسين

## ملخص التشخيص

بعد فحص **46+ ملف** في مسار التشغيل الحرج وسلسلة الإقلاع والبيانات ومكونات الواجهة، إليك النتائج مصنفة حسب الخطورة.

---

## 1. النتائج الجنائية — جذور المشاكل

### 🔴 عنق زجاجة حرج: Edge Function `dashboard-summary` — 2,073-2,134ms

من سجلات الوظائف الحافة:
```text
auth+body:            ~950ms
roles+rateLimit+FY:   ~670ms
main Promise.all:     ~470ms
─────────────────────────────
المجموع:              ~2,100ms
حجم الاستجابة:        104 KB
```

**المشكلة**: المصادقة وحدها تستهلك **~950ms** (45% من الوقت). هذا يعني أن المستخدم ينتظر **ثانيتين كاملتين** قبل أن يرى أي بيانات في لوحة التحكم.

**التوصية**:
- فصل التحقق من المصادقة عن جلب البيانات باستخدام `Promise.all` حيثما أمكن
- تخزين نتائج `roles+rateLimit` في ذاكرة مؤقتة مع TTL قصير (30s)
- إضافة `Cache-Control: private, max-age=30` للاستجابة لتجنب طلبات متكررة خلال التنقل

### 🟠 مشكلة متوسطة: تسلسل الإقلاع (Boot Waterfall)

```text
1. main.tsx يُنفّذ (theme + query monitoring + PWA guard)
2. React render → AuthProvider
3. onAuthStateChange ← ينتظر Supabase SDK
4. fetchUserRole ← 3 محاولات مع timeout 3s
5. FiscalYearContext ← ينتظر Auth + يجلب fiscal years
6. AdminDashboard ← ينتظر FY + يستدعي dashboard-summary
```

**النتيجة**: سلسلة من 5 طلبات متتابعة قبل أن يرى المستخدم المحتوى. المشكلة ليست في كل خطوة بمفردها بل في **تراكمها التسلسلي**.

**التوصية**:
- **Prefetch** لبيانات السنة المالية بالتوازي مع جلب الدور بدلاً من الانتظار حتى ينتهي Auth
- عرض هيكل الصفحة (skeleton) فوراً أثناء انتظار البيانات بدلاً من `<PageLoader />`

### 🟠 مشكلة متوسطة: تحذيرات Recharts المتكررة (width/height = -1)

السجلات تُظهر 3+ تحذيرات متكررة:
```
The width(-1) and height(-1) of chart should be greater than 0
```

رغم وجود `ChartBox` مع `useChartReady`، التحذيرات لا تزال تظهر — مما يعني أن بعض الرسوم البيانية تُعرض قبل أن تأخذ حاويتها أبعاداً صحيحة. هذا يسبب **إعادة رسم مزدوجة** (double render) ويضيف ~50-100ms من الحسابات غير الضرورية.

**التوصية**: التحقق من أن جميع `ResponsiveContainer` مغلفة داخل `ChartBox` وأن `DeferredRender` يؤجل العرض بما يكفي.

### 🟡 مشكلة منخفضة: `DeferredRender` الافتراضي = 3000ms

القيمة الافتراضية لـ `delay` في `DeferredRender` هي **3 ثوانٍ** — وهي محافظة جداً. في `AdminDashboard` تُستخدم قيم مخصصة (300-1100ms) وهي مناسبة، لكن أي استخدام بدون تمرير `delay` سينتظر 3 ثوانٍ كاملة.

**التوصية**: تخفيض القيمة الافتراضية إلى 800ms.

### 🟢 نقاط قوة مؤكدة (لا تحتاج تغيير)

| الجانب | الحالة |
|--------|--------|
| Lazy loading لكل الصفحات | ✅ سليم — `lazyWithRetry` في كل مسار |
| تقسيم الحزم | ✅ ممتاز — المكتبات الثقيلة (jsPDF, Recharts, html2canvas) معزولة |
| Barrel exports | ✅ محمي — المكونات المؤجلة مستبعدة من `index.ts` |
| Query caching | ✅ `staleTime: 5min` عالمي + تخصيص حسب نوع البيانات |
| Realtime debounce | ✅ 500ms debounce قبل إبطال الكاش |
| `dashboard-summary` يملأ 13 كاش دفعة واحدة | ✅ يمنع N+1 في التنقل بين الصفحات |
| `refetchOnWindowFocus: false` | ✅ يمنع طلبات غير ضرورية |

---

## 2. خطة التحسين المقترحة (6 خطوات)

### الخطوة 1: إضافة `Cache-Control` لـ `dashboard-summary` Edge Function
- إضافة هيدر `Cache-Control: private, max-age=30` للاستجابة
- يمنع إعادة الطلب عند التنقل ذهاباً وإياباً خلال 30 ثانية

### الخطوة 2: Prefetch السنة المالية بالتوازي مع Auth
- في `FiscalYearContext`: بدء جلب السنوات المالية فوراً دون انتظار اكتمال `authReady`
- توفير ~500-700ms من وقت الإقلاع

### الخطوة 3: عرض Skeleton بدلاً من Spinner
- استبدال `<PageLoader />` (spinner فارغ) بهيكل صفحة كامل (sidebar + header + content placeholders)
- يُحسّن LCP بشكل كبير لأن المحتوى المرئي يظهر فوراً

### الخطوة 4: إصلاح تحذيرات Recharts
- التحقق من أن `YearComparisonCard` و`IncomeMonthlyChart` يستخدمان `ChartBox`
- إضافة `minWidth={1} minHeight={1}` لأي `ResponsiveContainer` ناقصة

### الخطوة 5: تخفيض `DeferredRender` الافتراضي
- تغيير القيمة الافتراضية من `3000ms` إلى `800ms`

### الخطوة 6: تحسين `dashboard-summary` Edge Function
- تشغيل `auth` و`body parsing` بالتوازي مع `roles+rateLimit` حيث لا يوجد تبعية
- هدف: تقليص الوقت الكلي من ~2100ms إلى ~1200ms

---

## 3. التفاصيل التقنية

### الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `supabase/functions/dashboard-summary/index.ts` | Cache-Control header + parallelization |
| `src/contexts/FiscalYearContext.tsx` | إزالة شرط `authReady` من جلب FY |
| `src/components/common/DeferredRender.tsx` | `delay = 800` |
| `src/App.tsx` | تحسين `PageLoader` → Skeleton layout |
| `src/components/dashboard/YearComparisonCard.tsx` | تغليف بـ ChartBox |

### الأثر المتوقع
- **LCP**: تحسن بـ 500-800ms (من ~2.5s إلى ~1.7s)
- **Boot time**: تقليص ~500ms عبر التوازي
- **تحذيرات Console**: القضاء على تحذيرات Recharts width/height

