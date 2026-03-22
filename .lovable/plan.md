

# خطة الاختبار الشامل وفحص الأداء

---

## الحالة الحالية

### اختبارات الواجهة
- **156 ملف اختبار** موجودة في المشروع (hooks, components, pages, utils)
- بنية Vitest + jsdom + React Testing Library مكتملة
- تغطية مطلوبة: 60% (statements, branches, functions, lines)
- الجولة السابقة أصلحت 14 اختبار وبقي **46 فاشل**

### اختبارات Edge Functions
- **12 edge function** بدون أي اختبارات (لا يوجد `index.test.ts`)
- الوظائف الحرجة: `guard-signup`, `lookup-national-id`, `zatca-api`, `ai-assistant`

### الأداء
- `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false` — ممتاز
- 16 manual chunk + lazy loading — ممتاز
- `useRawFinancialData` يطلق 5 queries متوازية (مقبول مع التخزين المؤقت)
- `useComputedFinancials` يستخدم `useMemo` — جيد

---

## خطة التنفيذ

### المرحلة 1: تشغيل اختبارات الواجهة
- تشغيل `vitest run` لفحص جميع الـ 156 ملف
- تصنيف الفشل: drift في labels/structure vs أخطاء حقيقية
- إصلاح الاختبارات الفاشلة بأولوية: hooks المالية > components الحسابات > PDF utils

### المرحلة 2: اختبار المتصفح
يتطلب تسجيل دخول في Preview أولاً. التدفقات المطلوب اختبارها:

1. **لوحة المستفيد** — ظهور البطاقات المالية
2. **تبديل السنة المالية** — التحقق من تغير الأرقام بين النشطة والمغلقة
3. **صفحة العقارات** — بطاقات الدخل/المصروفات/صافي الدخل
4. **صفحة العقود** — إجمالي الإيجارات
5. **صفحة حصتي** — المبالغ المستلمة

### المرحلة 3: اختبار Edge Functions
إنشاء اختبارات للوظائف الحرجة:
- `guard-signup` — التحقق من validation + rate limiting
- `lookup-national-id` — التحقق من رفض الطلبات غير المصرح بها

### المرحلة 4: فحص الأداء
- تشغيل `browser--performance_profile` لقياس Web Vitals
- فحص DOM complexity و long tasks
- التحقق من حجم الحزم الفعلي

---

## ملخص التوصيات الحالية (من تحليل الكود)

| البند | الحالة | ملاحظة |
|-------|--------|--------|
| Query caching | ✅ ممتاز | staleTime 5min + gcTime 30min |
| Re-renders | ✅ جيد | useMemo في computed, useRef في auth |
| Bundle splitting | ✅ ممتاز | 16 chunk + lazy loading |
| PWA caching | ✅ ممتاز | NetworkOnly للبيانات الحساسة |
| Edge function tests | ❌ غير موجودة | 12 وظيفة بدون اختبارات |
| 46 اختبار فاشل | ⚠️ drift | تحتاج مطابقة مع UI الحالي |

---

## ترتيب التنفيذ

```text
1. تشغيل vitest run → تقرير الفشل
2. إصلاح الاختبارات الفاشلة (46)
3. اختبار المتصفح (يتطلب تسجيل دخول)
4. إنشاء اختبارات edge functions
5. قياس الأداء بالمتصفح
6. تطبيق أي تحسينات مكتشفة
```

