

# إكمال خطة الاختبار الشامل وفحص الأداء

---

## ما تم إنجازه حتى الآن

| الخطوة | الحالة |
|--------|--------|
| 1. تشغيل vitest run | ✅ تم |
| 2. إصلاح الاختبارات الفاشلة (الجولة 1: 14 ملف) | ✅ تم |
| 2. إصلاح الاختبارات الفاشلة (الجولة 2: 13 ملف accounts/pdf/contexts) | ✅ تم |
| 2. إصلاح الاختبارات المتبقية (~33 ملف صفحات) | ❌ متبقي |
| 3. اختبار المتصفح | ❌ متبقي (يتطلب تسجيل دخول) |
| 4. إنشاء اختبارات Edge Functions | ❌ متبقي |
| 5. قياس الأداء | ❌ متبقي |

---

## الخطوات المتبقية للتنفيذ

### الخطوة 2 (تكملة): إصلاح اختبارات الصفحات المتبقية (~33 ملف)

الصفحات التي لم تُصلح بعد وتحتاج مطابقة مع الواجهة الحالية:

**صفحات المستفيد:**
- `WaqifDashboard.test.tsx` — تحديث mocks لتطابق hooks الجديدة
- `MySharePage.test.tsx` — تحديث mock `useFinancialSummary` والتسميات
- `DisclosurePage.test.tsx` — مطابقة بنية البطاقات الحالية
- `AccountsViewPage.test.tsx` — مطابقة responsive duplicates
- `CarryforwardHistoryPage.test.tsx` — تحديث بنية الجدول

**صفحات لوحة التحكم:**
- `InvoicesPage.test.tsx` — تحديث أعمدة الجدول والأزرار
- `ContractsPage.test.tsx` — مطابقة التسميات
- `PropertiesPage.test.tsx` — مطابقة البطاقات
- `ZatcaManagementPage.test.tsx` — تحديث mocks
- `SettingsPage.test.tsx`, `UserManagementPage.test.tsx`, `BylawsPage.test.tsx`

**المنهجية:** نفس النمط المتبع سابقاً:
1. قراءة الملف المصدر الحالي
2. تحديث التسميات العربية في التوقعات
3. معالجة responsive duplicates بـ `getAllByText`
4. تشغيل vitest للتحقق

### الخطوة 4: إنشاء اختبارات Edge Functions

`guard-signup` لديها اختبار بالفعل (`index.test.ts`). المطلوب:

**إنشاء `lookup-national-id/index.test.ts`:**
- اختبار رفض GET (405)
- اختبار رفض طلب بدون body (400)
- اختبار رفض بدون Authorization header
- اختبار رقم هوية غير صالح
- تشغيلها عبر أداة `test_edge_functions`

### الخطوة 5: قياس الأداء

- تشغيل `browser--performance_profile` لقياس Web Vitals و DOM complexity
- تحليل النتائج وتقديم توصيات
- ملاحظة: يتطلب أن يكون المستخدم مسجل دخول في Preview

---

## ترتيب التنفيذ

```text
1. إصلاح ~33 اختبار صفحة متبقية (أكبر مهمة)
2. تشغيل vitest run للتحقق من النتائج الكاملة
3. إنشاء اختبار lookup-national-id
4. تشغيل اختبارات edge functions
5. قياس الأداء بالمتصفح (يتطلب تسجيل دخول)
```

---

## التفاصيل التقنية

معظم الاختبارات الفاشلة تقع في نفس الأنماط المتكررة:
- **Responsive duplicates:** `jsdom` يُظهر عناصر `md:hidden` و `hidden md:block` معاً → استخدام `getAllByText` أو تحديد الحاوية
- **Label drift:** تسميات عربية تغيّرت في الواجهة ولم تُحدّث في الاختبارات
- **Mock mismatch:** hooks جديدة (مثل `useBeneficiaryDashboardData`) تحتاج mocks محدّثة

