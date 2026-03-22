

# خطة الفحص الإضافي: اختبار عملي + أداء

---

## الحالة الحالية (مؤكدة)

| البند | الحالة |
|-------|--------|
| Frontend Tests (156 ملف) | ✅ جميعها تمر بنجاح |
| Edge Function: guard-signup (5 tests) | ✅ موجود |
| Edge Function: lookup-national-id (5 tests) | ✅ موجود |
| Edge Functions بدون اختبارات | 10 وظائف (ai-assistant, zatca-api, zatca-signer, zatca-xml-generator, generate-invoice-pdf, admin-manage-users, auth-email-hook, check-contract-expiry, webauthn) |
| Browser Testing | ❌ لم يُنفذ بعد |
| Performance Profile | ✅ تم (JS Heap 3.2MB, DOM 117, FCP 1036ms) |

---

## خطة التنفيذ

### المرحلة 1: تشغيل اختبارات الواجهة (Frontend Tests)
تشغيل `vitest run` للتحقق من أن الـ 156 ملف لا تزال جميعها تمر بنجاح بعد آخر التعديلات.

### المرحلة 2: تشغيل اختبارات Edge Functions
تشغيل اختبارات `guard-signup` و `lookup-national-id` عبر أداة `test_edge_functions` للتأكد من عملها في بيئة الإنتاج.

### المرحلة 3: اختبار المتصفح (Browser Testing)
**يتطلب تسجيل دخول في Preview أولاً.** التدفقات المطلوب اختبارها:

1. **صفحة العقود** (الصفحة الحالية) — التحقق من ظهور البيانات وعمل الفلاتر
2. **تبديل السنة المالية** — التحقق من تغير البيانات بين السنة النشطة والمغلقة
3. **لوحة تحكم المستفيد** — ظهور البطاقات المالية بأرقام صحيحة
4. **صفحة حصتي** — عرض المبالغ المستلمة
5. **صفحة الإفصاح** — بطاقات الملخص المالي

### المرحلة 4: فحص الأداء المتقدم
- تشغيل `browser--performance_profile` مجدداً على صفحة فعلية (بعد تسجيل الدخول)
- تشغيل CPU profiling (`start_profiling` → تنقل → `stop_profiling`) لتحديد الدوال الأبطأ
- مقارنة النتائج مع القياس السابق

### المرحلة 5: تحليل الأداء من الكود
تأكيد النقاط التالية (مُحللة سابقاً من الكود):

| البند | الحالة | التفاصيل |
|-------|--------|----------|
| Query Caching | ✅ ممتاز | staleTime 5min, gcTime 30min, refetchOnWindowFocus: false |
| Re-renders | ✅ جيد | useMemo في computed, useRef في auth |
| Bundle Splitting | ✅ ممتاز | 16 manual chunks + lazy loading لكل الصفحات |
| PWA Caching | ✅ ممتاز | NetworkOnly للبيانات الحساسة, CacheFirst للخطوط |
| Realtime Channels | ⚠️ ملاحظة | خطأ timeout في console — قناة notifications تفشل أحياناً (useBfcacheSafeChannel يعيد المحاولة تلقائياً) |
| useRawFinancialData | ⚠️ تحسين ممكن | 5 queries متوازية — مقبول مع caching |
| Fiscal Year Fallback | ⚠️ ملاحظة | "No active fiscal year found" في console — يعود للأولى المتاحة |

---

## ترتيب التنفيذ

```text
1. تشغيل vitest run → تأكيد 0 فشل
2. تشغيل edge function tests (guard-signup + lookup-national-id)
3. اختبار المتصفح — 5 تدفقات رئيسية
4. Performance profile + CPU profiling
5. تقرير نهائي شامل بالنتائج
```

---

## ملاحظة مهمة
اختبار المتصفح يتطلب أن تكون مسجل دخول في Preview. إذا ظهرت صفحة تسجيل الدخول سأطلب منك تسجيل الدخول أولاً.

