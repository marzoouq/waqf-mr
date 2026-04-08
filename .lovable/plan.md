

# الخطة القادمة — المرحلة الثانية من إعادة الهيكلة

## ما تم إنجازه ✅
- تقسيم `hooks/page/admin/` إلى 5 مجلدات فرعية مع 32 proxy مؤقت
- نقل `distributionCalcPure.ts` إلى `utils/financial/`
- إضافة 8 اختبارات تغطية متقدمة

## ما تبقّى — مرتّب حسب الأولوية

### الخطوة 1: إصلاح مسار mock خاطئ في اختبار MySharePage
ملف `src/pages/beneficiary/MySharePage.test.tsx` سطر 102 يستخدم:
```typescript
vi.mock('@/hooks/page/useMySharePage', ...)
```
بينما المسار الصحيح هو `@/hooks/page/beneficiary/useMySharePage`. هذا خطأ فعلي قد يُفشل الاختبار عند إزالة الـ proxies.

**ملفات متأثرة**: 1

---

### الخطوة 2: إزالة ملفات proxy المؤقتة تدريجياً
يوجد حالياً **32 ملف proxy** في جذر `hooks/page/admin/` بالصيغة:
```typescript
/** @deprecated proxy */ export * from './contracts/useContractForm';
```

الإزالة تتطلب تحديث كل ملف مستهلك ليستورد من المسار الجديد مباشرة. يمكن تنفيذها على دفعات:
- **دفعة 1**: contracts (5 proxies → ~8 ملفات مستهلكة)
- **دفعة 2**: dashboard (4 proxies → ~5 ملفات)
- **دفعة 3**: settings (9 proxies → ~12 ملف)
- **دفعة 4**: financial (10 proxies → ~15 ملف)
- **دفعة 5**: reports (3 proxies → ~5 ملفات)

**ملفات متأثرة**: ~45 ملف إجمالي

---

### الخطوة 3: نقل `dataFetcher.ts` من utils إلى hooks/data
ملف `src/utils/export/dataFetcher.ts` يستدعي Supabase مباشرة — ينتهك مبدأ أن `utils/` للدوال البحتة. يُنقل إلى `src/hooks/data/export/` أو يبقى مع تعليق واضح أنه استثناء مقصود (لأنه async function وليس hook).

**ملفات متأثرة**: 2-3

---

### الخطوة 4: توثيق الفرق بين `lib/` و `utils/`
- `lib/` = بنية تحتية للتطبيق (logger, queryClient, errorReporter, lazyWithRetry, PWA)
- `utils/` = دوال أعمال بحتة (مالية, تصدير, PDF, تنسيق)

إضافة تعليق توثيقي في `README.md` لكل مجلد.

**ملفات متأثرة**: 2

---

## التوصية

أنصح بتنفيذ **الخطوة 1 فوراً** (إصلاح خطأ فعلي)، ثم **الخطوة 2 على دفعات** لإزالة الـ proxies. الخطوتان 3 و4 اختيارية ويمكن تأجيلها.

هل تريد البدء بخطوة محددة أو تنفيذ الكل؟

