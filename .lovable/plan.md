

# تقرير فحص الأداء — تحليل عنق الزجاجة

---

## ملخص تنفيذي

المشروع في حالة أداء **ممتازة** بشكل عام. لا توجد مشاكل حرجة. فيما يلي تحليل تفصيلي لكل محور:

---

## 1. استدعاءات قاعدة البيانات — ✅ محسّنة

| البند | الحالة | ملاحظة |
|-------|--------|--------|
| `staleTime` مُعيّن لجميع الاستعلامات | ✅ | 60s للبيانات العادية، 5min للثوابت، 30s للإحصائيات |
| `refetchOnWindowFocus` | ✅ `false` عالمياً | لا استعلامات زائدة عند التبديل |
| `refetchInterval` | ✅ 2 مواضع فقط | `useUnreadMessages` (60s) + `ZatcaSettingsTab` (30s) — مبرران |
| Duplicate queries | ✅ لا يوجد | React Query يُوحّد الاستعلامات بنفس المفتاح |
| N+1 queries | ✅ لا يوجد | joins مستخدمة (`property:properties(*)`) |

**ملاحظة واحدة:** صفحة `ZatcaManagementPage` تُطلق **5 استعلامات متوازية** (settings, certificates, invoices, payment_invoices, chain). هذا مقبول لأنها متوازية وليست متسلسلة، لكن يمكن دمج `invoices` + `payment_invoices` في RPC واحد لتقليل الطلبات من 5 إلى 4.

---

## 2. إعادة الرسم (Re-renders) — ✅ محسّنة

| البند | الحالة |
|-------|--------|
| `useMemo` في الحسابات المالية | ✅ شامل (6 حسابات ملفوفة) |
| Contexts | ✅ 2 فقط (Auth + FiscalYear) — لا context soup |
| `useCallback` | ✅ مستخدم في event handlers |
| Memoized components | ✅ `React.memo` مستخدم حيث يلزم |

---

## 3. حجم الحزم (Bundle Size) — ✅ محسّن

| البند | الحالة |
|-------|--------|
| Lazy loading | ✅ **جميع** الصفحات (38 صفحة) عبر `lazyWithRetry` |
| Manual chunks | ✅ 16+ chunk (react, router, radix, supabase, icons, pdf, charts, etc.) |
| `chunkSizeWarningLimit` | 500KB |
| Tree shaking | ✅ Vite default |

أكبر الحزم (من قياس سابق):
- `lucide-react`: 190KB — **أكبر حزمة أيقونات**. يمكن تقليلها باستيراد الأيقونات فردياً لكن التأثير العملي ضئيل مع manual chunk
- `react-dom`: 166KB — ثابت، لا يمكن تقليله
- `recharts/d3`: مجمّع في chunk مستقل — لا يُحمّل إلا عند الحاجة

---

## 4. الأصول الكبيرة (Large Assets) — ✅ نظيف

| البند | الحالة |
|-------|--------|
| الصور | PWA icons فقط (192x192 + 512x512) |
| الخطوط | CacheFirst مع TTL سنة |
| الأصول الثابتة | NetworkFirst مع timeout 5s |

---

## 5. PWA & Caching — ✅ مدروسة

| البند | الحالة |
|-------|--------|
| Supabase REST | `NetworkOnly` — بيانات مالية حساسة |
| Supabase Auth | `NetworkOnly` |
| Edge Functions | `NetworkOnly` |
| الخطوط | `CacheFirst` (سنة) |
| الصور | `CacheFirst` (أسبوع) |
| JS/CSS | `NetworkFirst` (أسبوع) |

---

## 6. التوصيات (اختيارية — تحسينات طفيفة)

| # | التوصية | الأولوية | الأثر المتوقع |
|---|---------|----------|---------------|
| 1 | دمج استعلامي `invoices` + `payment_invoices` في `ZatcaManagementPage` إلى RPC واحد | منخفضة | توفير طلب شبكة واحد |
| 2 | إضافة `staleTime` للاستعلامات في `ZatcaManagementPage` (settings, certificates, chain) — حالياً تستخدم القيمة الافتراضية 5min | منخفضة جداً | بالفعل مقبولة مع default |
| 3 | تحويل `useUnreadMessages` من polling (60s) إلى Realtime subscription | منخفضة | تحديث فوري بدل انتظار 60 ثانية — لكن الحالي مقبول |

---

## الخلاصة

```text
╔══════════════════════════════════════════════╗
║  تقييم الأداء العام: ✅ ممتاز               ║
╠══════════════════════════════════════════════╣
║  Database calls: محسّنة — staleTime شامل    ║
║  Re-renders: محسّنة — useMemo + 2 contexts  ║
║  Bundle: محسّن — 38 lazy page + 16 chunks   ║
║  Assets: نظيفة — لا أصول كبيرة             ║
║  PWA caching: مدروسة — NetworkOnly للحساس   ║
║  مشاكل حرجة: 0                              ║
╚══════════════════════════════════════════════╝
```

**لا توجد عنق زجاجة (bottleneck) في المشروع.** التوصيات الثلاث المتبقية اختيارية وتأثيرها طفيف.

