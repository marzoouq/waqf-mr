

## فحص جنائي هجين — نتائج التدقيق الشامل

### الحالة العامة
المشروع في حالة **جيدة جداً** أمنياً وبنيوياً. التحسينات السابقة (إزالة `any`، إصلاح `id/htmlFor`، `Button asChild`، `ErrorBoundary`، `useMemo` للتحية والعدادات، تثبيت Realtime) **تم تنفيذها بنجاح**. لا توجد ثغرات أمنية مفتوحة.

---

### النتائج المكتشفة

| # | الفئة | المشكلة | الخطورة | الملفات |
|---|-------|---------|---------|---------|
| 1 | كود ميت | ثوابت `queryStaleTime.ts` أُنشئت لكن **لم تُستورد في أي ملف** — 33 ملف ما زالت تستخدم أرقاماً حرفية | منخفضة | `src/lib/queryStaleTime.ts` + 33 hooks |
| 2 | تكرار كود | `formatArabicMonth` + `ARABIC_MONTHS` مكررة في 3 ملفات منفصلة بنسخ متطابقة | منخفضة | `DashboardChartsInner`, `FinancialChartsInner`, `WaqifChartsInner` |
| 3 | تكرار كود | `tooltipStyle` و `COLORS` مكررة في 3 ملفات رسوم بيانية | منخفضة | نفس الملفات أعلاه |
| 4 | تحذيرات Recharts | تحذيرات `width(-1) height(-1)` **ما زالت تظهر** في الكونسول رغم إضافة `minWidth/minHeight` | متوسطة | مكونات الرسوم البيانية |
| 5 | `eslint-disable` مبررة | 10 حالات — كلها مبررة بتعليقات واضحة (shadcn/ui، Deno، أنماط مقصودة) | ✅ سليم | — |
| 6 | `console.*` في Edge Functions | Deno Edge Functions تستخدم `console.error` مباشرة — **مقبول** لأن `logger` خاص بالواجهة | ✅ سليم | — |
| 7 | `dangerouslySetInnerHTML` | حالتان فقط: JSON-LD في `Index.tsx` + `chart.tsx` (shadcn) — **آمنة** | ✅ سليم | — |
| 8 | أمان المصادقة | كل Edge Functions تستخدم `getUser()` — لا `getSession()` — لا أدوار في localStorage | ✅ سليم | — |
| 9 | `catch {}` فارغ | 3 حالات فقط — كلها مقصودة (fire-and-forget لتسجيل الأخطاء أو مسح الكاش) | ✅ سليم | — |

---

### الإصلاحات المطلوبة

#### 1. تفعيل ثوابت `queryStaleTime` (استكمال عمل سابق)
الثوابت `STALE_STATIC`، `STALE_FINANCIAL`، `STALE_REALTIME` أُنشئت في الخطة السابقة لكن **لم تُستخدم فعلياً**. يجب استبدال الأرقام الحرفية في الـ hooks بالثوابت المركزية:

- `staleTime: 60_000` → `STALE_FINANCIAL` في: `useUnits`, `useContracts`, `useContractAllocations`, `useAnnualReport`
- `staleTime: 10_000` → `STALE_REALTIME` في: `useAdvanceRequests` (6 مواقع)
- `staleTime: 30_000` → `STALE_REALTIME` أو ثابت جديد `STALE_MESSAGING = 30_000` في: `useMessaging`
- `staleTime: 5_000` → `STALE_REALTIME` في: `useMessaging` (الرسائل الفردية)
- `staleTime: 1000 * 60 * 5` → `STALE_STATIC` في: `useAppSettings`

#### 2. استخراج دوال/ثوابت مشتركة للرسوم البيانية
إنشاء ملف `src/utils/chartHelpers.ts`:
- نقل `formatArabicMonth` + `ARABIC_MONTHS`
- نقل `tooltipStyle`
- نقل `COLORS` المشتركة

ثم استبدال النسخ المكررة في: `DashboardChartsInner`, `FinancialChartsInner`, `WaqifChartsInner`

#### 3. معالجة تحذيرات Recharts المتبقية
التحذيرات `width(-1) height(-1)` تظهر عند lazy loading لأن المكون يُعرض قبل أن يحصل الحاوي على أبعاد فعلية. الحل:
- إضافة `h-[300px]` أو ارتفاع صريح على الـ `div` الأب المباشر لـ `ResponsiveContainer` في `FinancialChartsInner` (السطور 43، 59، 80، 98، 118 تحتاج حاوي بارتفاع صريح)

---

### ملخص

| الحالة | العدد |
|--------|-------|
| ✅ سليم — لا يحتاج تدخل | 5 نتائج |
| ⚠️ تحسين مطلوب | 3 نتائج |
| 🔴 ثغرة أمنية | 0 |

### خطة التنفيذ
1. تفعيل ثوابت `staleTime` في ~10 ملفات hooks
2. استخراج `chartHelpers.ts` وإزالة التكرار من 3 ملفات
3. إصلاح حاويات الرسوم في `FinancialChartsInner`

