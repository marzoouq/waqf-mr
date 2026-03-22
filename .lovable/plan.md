

# خطة تشغيل اختبارات المشروع الكاملة

---

## الهدف
تشغيل `vitest run` للتحقق من أن تقسيم `useAccountsPage` ونقل `findAccountByFY` والتعديلات الأخيرة لم تكسر أي اختبار.

## خطوات التنفيذ

### 1. تشغيل جميع الاختبارات
- تشغيل `vitest run` على كامل المشروع (156+ ملف اختبار)
- رصد أي فشل وتصنيفه

### 2. إصلاح أي فشل مكتشف
المشاكل المحتملة بعد التعديلات الأخيرة:
- **Import path change**: `findAccountByFY` انتقل من `useAccountsPage.ts` إلى `src/utils/findAccountByFY.ts` — لكن يوجد re-export في `useAccountsPage.ts` للتوافق
- **paramsRef pattern**: قد تحتاج اختبارات `useAccountsPage` تحديث mocks
- **`get_support_stats` RPC**: اختبارات `useSupportTickets` قد تحتاج mock جديد للـ RPC

### 3. تشغيل نهائي للتحقق
- إعادة تشغيل vitest للتأكد من 0 فشل

